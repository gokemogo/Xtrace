/**
 * 测试外部数据库连接
 * 运行方式: npx ts-node scripts/test-external-db-connection.ts
 */

import { config } from 'dotenv';
config();

async function testDm8Connection() {
  console.log('=== 测试 DM8 数据库连接 ===');
  console.log(`连接字符串: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@')}`);

  try {
    const dmdb = eval("require")("dmdb");
    const pool = dmdb.createPool({
      connectionString: process.env.DATABASE_URL,
      poolMin: 1,
      poolMax: 2,
    });

    const conn = await pool.getConnection();
    console.log('✅ DM8 连接成功');

    // 测试查询
    const result = await conn.execute('SELECT 1 FROM dual');
    console.log('✅ DM8 查询测试成功');

    // 检查 job_queue 表是否存在
    try {
      await conn.execute('SELECT COUNT(*) FROM "job_queue"');
      console.log('✅ job_queue 表存在');
    } catch (e) {
      console.log('⚠️  job_queue 表不存在，请执行 dm8_init.sql 初始化脚本');
    }

    conn.close();
    return true;
  } catch (e: any) {
    console.log('❌ DM8 连接失败:', e.message);
    return false;
  }
}

async function testRedisConnection() {
  console.log('\n=== 测试 TongRDS (Redis) 连接 ===');
  console.log(`主机: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);

  try {
    const Redis = eval("require")("ioredis");
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_AUTH || undefined,
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
    });

    // 测试 PING
    const pong = await redis.ping();
    console.log('✅ TongRDS 连接成功, PING:', pong);

    // 测试基本操作
    await redis.set('test:key', 'test:value');
    const value = await redis.get('test:key');
    await redis.del('test:key');
    console.log('✅ TongRDS 读写测试成功');

    redis.disconnect();
    return true;
  } catch (e: any) {
    console.log('❌ TongRDS 连接失败:', e.message);
    return false;
  }
}

async function main() {
  console.log('🔍 开始测试外部数据库连接...\n');

  const dm8Ok = await testDm8Connection();
  const redisOk = await testRedisConnection();

  console.log('\n=== 测试结果汇总 ===');
  console.log(`DM8 数据库: ${dm8Ok ? '✅ 成功' : '❌ 失败'}`);
  console.log(`TongRDS: ${redisOk ? '✅ 成功' : '❌ 失败'}`);

  if (dm8Ok && redisOk) {
    console.log('\n🎉 所有数据库连接正常，可以启动服务');
    console.log('\n启动命令:');
    console.log('  pnpm run dev');
  } else {
    console.log('\n⚠️  请检查数据库连接配置');
  }
}

main().catch(console.error);
