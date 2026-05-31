import { Prisma, type prisma as _prisma } from "@langfuse/shared/src/db";
import { getDbType } from "@langfuse/shared";

export const isValidPostgresRegex = async (
  regex: string,
  prisma: typeof _prisma,
): Promise<boolean> => {
  try {
    const dbType = getDbType();
    if (dbType === "dm8") {
      await prisma.$queryRaw(Prisma.sql`SELECT REGEXP_LIKE('test_string', ${regex}) FROM DUAL`);
    } else {
      await prisma.$queryRaw(Prisma.sql`SELECT 'test_string' ~ ${regex}`);
    }
    return true;
  } catch {
    return false;
  }
};
