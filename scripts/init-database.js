#!/usr/bin/env node

/**
 * DM8 数据库初始化脚本
 * 使用 dmdb 驱动执行 SQL 文件
 */

const dmdb = require('dmdb');
const fs = require('fs');

const DATABASE_URL = process.env.DATABASE_URL || 'dm://SYSDBA:Dm8DtUlR16LY8h0uC01zSYx@localhost:5236';
const SQL_FILE = process.argv[2] || '/tmp/dm8_init_final.sql';

async function main() {
  console.log('⏳ 连接 DM8 数据库...');
  console.log('📄 SQL 文件:', SQL_FILE);

  let pool;
  let conn;

  try {
    pool = await dmdb.createPool({
      connectionString: DATABASE_URL,
      poolMin: 1,
      poolMax: 1,
    });

    conn = await pool.getConnection();
    console.log('✅ 数据库连接成功');

    // 读取 SQL 文件
    const sqlContent = fs.readFileSync(SQL_FILE, 'utf8');

    // 分割 SQL 语句（按分号分割）
    const statements = sqlContent
      .split(/;\s*\n/m)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📊 共 ${statements.length} 条 SQL 语句`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const sql = statements[i];
      try {
        await conn.execute(sql);
        successCount++;
        console.log(`✅ ${i + 1}/${statements.length}: 执行成功`);
      } catch (err) {
        if (err.message.includes('already exists') ||
            err.message.includes('重复') ||
            err.message.includes('已存在') ||
            err.message.includes('[-2140]') ||
            err.message.includes('[-3236]')) {
          skipCount++;
          console.log(`⏭️  ${i + 1}/${statements.length}: 已存在，跳过`);
        } else {
          errorCount++;
          console.error(`❌ ${i + 1}/${statements.length}: ${err.message.substring(0, 100)}`);
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
