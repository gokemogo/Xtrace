import { Prisma } from "@prisma/client";
import { ColumnDefinition, type TableNames } from "./tableDefinitions";
import { FilterState } from "./types";
import { filterOperators } from "./interfaces/filters";
import { getDbType, type DbType } from "./db-adapter";

// PostgreSQL 操作符映射
const operatorReplacements = {
  "any of": "IN",
  "none of": "NOT IN",
  contains: "ILIKE",
  "does not contain": "NOT ILIKE",
  "starts with": "ILIKE",
  "ends with": "ILIKE",
};

// DM8 操作符映射（DM8 默认大小写不敏感，使用 LIKE）
const operatorReplacementsDm8 = {
  "any of": "IN",
  "none of": "NOT IN",
  contains: "LIKE",
  "does not contain": "NOT LIKE",
  "starts with": "LIKE",
  "ends with": "LIKE",
};

const arrayOperatorReplacements = {
  "any of": "&&",
  "all of": "@>",
  "none of": "&&",
};

// DM8 数组操作符映射
const arrayOperatorReplacementsDm8 = {
  "any of": "JSON_OVERLAPS",
  "all of": "JSON_CONTAINS",
  "none of": "JSON_OVERLAPS",
};

/**
 * SECURITY: This function must only be used, when all its inputs were verified with zod.
 */
export function tableColumnsToSqlFilterAndPrefix(
  filters: FilterState,
  tableColumns: ColumnDefinition[],
  table: TableNames
): Prisma.Sql {
  const sql = tableColumnsToSqlFilter(filters, tableColumns, table);
  if (sql === Prisma.empty) {
    return Prisma.empty;
  }
  return Prisma.join([Prisma.raw("AND "), sql], "");
}

/**
 * SECURITY: This function must only be used, when all its inputs were verified with zod.
 * Converts filter state and table columns to a Prisma SQL filter.
 */
export function tableColumnsToSqlFilter(
  filters: FilterState,
  tableColumns: ColumnDefinition[],
  table: TableNames
): Prisma.Sql {
  const dbType = getDbType();

  const internalFilters = filters.map(filter => {
    // Get column definition to map column to internal name, e.g. "t.id"
    const col = tableColumns.find(
      c =>
        // TODO: Only use id instead of name
        c.name === filter.column || c.id === filter.column
    );
    if (!col) {
      console.error("Invalid filter column", filter.column);
      throw new Error("Invalid filter column: " + filter.column);
    }
    const colPrisma = Prisma.raw(col.internal);
    return {
      condition: filter,
      internalColumn: colPrisma,
      column: col,
      table: table,
    };
  });

  const statements = internalFilters.map(filterAndColumn => {
    const filter = filterAndColumn.condition;

    // 根据数据库类型选择操作符映射
    const opReplacements = dbType === "dm8" ? operatorReplacementsDm8 : operatorReplacements;
    const arrOpReplacements = dbType === "dm8" ? arrayOperatorReplacementsDm8 : arrayOperatorReplacements;

    const operatorPrisma =
      filter.type === "arrayOptions"
        ? Prisma.raw(
            arrOpReplacements[
              filter.operator as keyof typeof arrOpReplacements
            ]
          )
        : filter.operator in opReplacements
          ? Prisma.raw(
              opReplacements[
                filter.operator as keyof typeof opReplacements
              ]
            )
          : Prisma.raw(filter.operator); //checked by zod

    // Get prisma value
    let valuePrisma: Prisma.Sql;
    switch (filter.type) {
      case "datetime":
        if (dbType === "dm8") {
          valuePrisma = Prisma.sql`CAST(${filter.value} AS TIMESTAMP WITH TIME ZONE)`;
        } else {
          valuePrisma = Prisma.sql`${filter.value}::timestamp with time zone at time zone 'UTC'`;
        }
        break;
      case "number":
      case "numberObject":
        if (dbType === "dm8") {
          valuePrisma = Prisma.sql`CAST(${filter.value.toString()} AS DOUBLE)`;
        } else {
          valuePrisma = Prisma.sql`${filter.value.toString()}::DOUBLE PRECISION`;
        }
        break;
      case "string":
      case "stringObject":
        valuePrisma = Prisma.sql`${filter.value}`;
        break;
      case "stringOptions":
        valuePrisma = Prisma.sql`(${Prisma.join(
          filter.value.map(v => Prisma.sql`${v}`)
        )})`;
        break;
      case "arrayOptions":
        if (dbType === "dm8") {
          // DM8 使用 JSON_ARRAY
          valuePrisma = Prisma.sql`JSON_ARRAY(${Prisma.join(
            filter.value.map(v => Prisma.sql`${v}`),
            ", "
          )}) `;
        } else {
          valuePrisma = Prisma.sql`ARRAY[${Prisma.join(
            filter.value.map(v => Prisma.sql`${v}`),
            ", "
          )}] `;
        }
        break;

      case "boolean":
        valuePrisma = Prisma.sql`${filter.value}`;
        break;
    }

    // JSON 键访问
    let jsonKeyPrisma: Prisma.Sql;
    if (filter.type === "stringObject" || filter.type === "numberObject") {
      if (dbType === "dm8") {
        // DM8 使用 JSON_VALUE
        jsonKeyPrisma = Prisma.sql`, JSON_VALUE(${filterAndColumn.internalColumn}, '$.${filter.key}')`;
      } else {
        jsonKeyPrisma = Prisma.sql`->>${filter.key}`;
      }
    } else {
      jsonKeyPrisma = Prisma.empty;
    }

    const [cast1, cast2] =
      filter.type === "numberObject"
        ? dbType === "dm8"
          ? [Prisma.raw("CAST("), Prisma.raw(" AS DOUBLE)")]
          : [Prisma.raw("cast("), Prisma.raw(" as double precision)")]
        : [Prisma.empty, Prisma.empty];

    const [valuePrefix, valueSuffix] =
      filter.type === "string" || filter.type === "stringObject"
        ? [
            ["contains", "does not contain", "ends with"].includes(
              filter.operator
            )
              ? Prisma.raw("'%' || ")
              : Prisma.empty,
            ["contains", "does not contain", "starts with"].includes(
              filter.operator
            )
              ? Prisma.raw(" || '%'")
              : Prisma.empty,
          ]
        : [Prisma.empty, Prisma.empty];

    const [funcPrisma1, funcPrisma2] =
      filter.type === "arrayOptions" && filter.operator === "none of"
        ? [Prisma.raw("NOT ("), Prisma.raw(")")]
        : [Prisma.empty, Prisma.empty];

    // 对于 DM8 的 JSON 键访问，需要特殊处理
    if (dbType === "dm8" && (filter.type === "stringObject" || filter.type === "numberObject")) {
      // DM8: JSON_VALUE(column, '$.key') operator value
      return Prisma.sql`${funcPrisma1}${cast1}JSON_VALUE(${filterAndColumn.internalColumn}, '$.${filter.key}')${cast2} ${operatorPrisma} ${valuePrefix}${valuePrisma}${valueSuffix}${funcPrisma2}`;
    }

    return Prisma.sql`${funcPrisma1}${cast1}${filterAndColumn.internalColumn}${jsonKeyPrisma}${cast2} ${operatorPrisma} ${valuePrefix}${valuePrisma}${castValueToPostgresTypes(filterAndColumn.column, filterAndColumn.table, dbType)}${valueSuffix}${funcPrisma2}`;
  });
  if (statements.length === 0) {
    return Prisma.empty;
  }
  // FOR SECURITY: We join the statements with " AND " to prevent SQL injection.
  // IF WE EVER CHANGE THIS, WE MUST ENSURE THAT USERS ONLY ACCESS THE DATA THEY ARE ALLOWED TO.
  // Example: Or condition on charts API on projectId would break this.
  return Prisma.join(statements, " AND ");
}

const castValueToPostgresTypes = (
  column: ColumnDefinition,
  table: TableNames,
  dbType: DbType = "postgresql"
) => {
  if (column.name === "type" &&
    (table === "observations" ||
      table === "traces_observations" ||
      table === "traces_observationsview" ||
      table === "traces_parent_observation_scores")) {
    if (dbType === "dm8") {
      // DM8 不需要类型转换，使用 VARCHAR2 即可
      return Prisma.empty;
    }
    return Prisma.sql`::"ObservationType"`;
  }
  return Prisma.empty;
};

const dateOperators = filterOperators["datetime"];

export const datetimeFilterToPrismaSql = (
  safeColumn: string,
  operator: (typeof dateOperators)[number],
  value: Date
) => {
  const dbType = getDbType();

  if (!dateOperators.includes(operator)) {
    throw new Error("Invalid operator: " + operator);
  }
  if (isNaN(value.getTime())) {
    throw new Error("Invalid date: " + value.toString());
  }

  if (dbType === "dm8") {
    return Prisma.sql`AND ${Prisma.raw(safeColumn)} ${Prisma.raw(
      operator
    )} CAST(${value} AS TIMESTAMP WITH TIME ZONE)`;
  }

  return Prisma.sql`AND ${Prisma.raw(safeColumn)} ${Prisma.raw(
    operator
  )} ${value}::timestamp with time zone at time zone 'UTC'`;
};
