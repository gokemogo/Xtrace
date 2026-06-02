#!/usr/bin/env node

/**
 * DM8 数据库初始化脚本
 * 自动执行 dm8_full_init.sql 文件
 */

const dmdb = require('dmdb');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;
const SQL_FILE = process.env.SQL_FILE || '/app/deploy/dm8_full_init.sql';

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL 环境变量未设置');
  process.exit(1);
}

async function main() {
  let pool;
  let conn;

  try {
    console.log('⏳ 连接 DM8 数据库...');
    pool = await dmdb.createPool({
      connectionString: DATABASE_URL,
      poolMin: 1,
      poolMax: 1,
    });

    conn = await pool.getConnection();
    console.log('✅ 数据库连接成功');

    // 读取 SQL 文件
    console.log(`📄 读取 SQL 文件: ${SQL_FILE}`);
    const sqlContent = fs.readFileSync(SQL_FILE, 'utf8');

    // 分割 SQL 语句（按分号分割，但忽略注释中的分号）
    const statements = sqlContent
      .split(/;\s*$/m)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📊 共 ${statements.length} 条 SQL 语句`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const sql = statements[i];
      // 跳过纯注释
      if (sql.match(/^--[\s\S]*$/) && !sql.match(/CREATE|ALTER|INSERT|UPDATE|DELETE/i)) {
        continue;
      }

      try {
        await conn.execute(sql);
        successCount++;
      } catch (err) {
        if (err.message.includes('already exists') ||
            err.message.includes('重复') ||
            err.message.includes('已存在') ||
            err.message.includes('[-2140]') ||
            err.message.includes('[-3236]')) {
          skipCount++;
        } else {
          errorCount++;
          // 只打印非重复错误
          if (!err.message.includes('已存在')) {
            console.warn(`⚠️ SQL ${i + 1} 执行警告: ${err.message.substring(0, 100)}`);
          }
        }
      }
    }

    console.log('');
    console.log('==================================================');
    console.log('数据库初始化完成！');
    console.log('==================================================');
    console.log(`✅ 成功执行: ${successCount} 条`);
    console.log(`⏭️  已存在跳过: ${skipCount} 条`);
    console.log(`❌ 失败: ${errorCount} 条`);

  } catch (err) {
    console.error('❌ 数据库初始化失败:', err.message);
    process.exit(1);
  } finally {
    if (conn) conn.close();
    if (pool) pool.close();
  }
}

main();
