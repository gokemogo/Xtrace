/**
 * 测试登录功能
 * 运行方式: npx ts-node scripts/test-login.ts
 */

import { config } from 'dotenv';
config();

async function testLogin() {
  console.log('=== 测试登录功能 ===\n');

  // 1. 测试数据库连接
  console.log('1. 测试数据库连接...');
  try {
    const dmdb = eval("require")("dmdb");
    const pool = dmdb.createPool({
      connectionString: process.env.DATABASE_URL,
      poolMin: 1,
      poolMax: 2,
    });

    const conn = await pool.getConnection();
    console.log('   ✅ DM8 连接成功');

    // 2. 检查用户表
    console.log('\n2. 检查用户表...');
    const usersResult = await conn.execute('SELECT COUNT(*) FROM "users"');
    const userCount = usersResult.rows[0][0];
    console.log(`   用户数量: ${userCount}`);

    if (userCount === 0) {
      console.log('   ⚠️  用户表为空，需要创建默认用户');
      console.log('   请执行 dm8_init.sql 初始化脚本');
      conn.close();
      return;
    }

    // 3. 检查默认用户
    console.log('\n3. 检查默认用户...');
    const adminResult = await conn.execute(
      'SELECT "id", "name", "email", "password" FROM "users" WHERE "email" = ?',
      ['administrator@orbitai.com']
    );

    if (adminResult.rows && adminResult.rows.length > 0) {
      const user = adminResult.rows[0];
      console.log('   ✅ 找到管理员用户:');
      console.log(`      ID: ${user[0]}`);
      console.log(`      姓名: ${user[1]}`);
      console.log(`      邮箱: ${user[2]}`);
      console.log(`      密码哈希: ${user[3] ? '已设置' : '未设置'}`);
    } else {
      console.log('   ⚠️  未找到 administrator@orbitai.com 用户');
    }

    // 4. 检查项目
    console.log('\n4. 检查项目表...');
    const projectsResult = await conn.execute('SELECT COUNT(*) FROM "projects"');
    const projectCount = projectsResult.rows[0][0];
    console.log(`   项目数量: ${projectCount}`);

    // 5. 检查项目成员
    console.log('\n5. 检查项目成员表...');
    const membershipsResult = await conn.execute('SELECT COUNT(*) FROM "project_memberships"');
    const membershipCount = membershipsResult.rows[0][0];
    console.log(`   成员关系数量: ${membershipCount}`);

    // 6. 检查 API 密钥
    console.log('\n6. 检查 API 密钥表...');
    const apiKeysResult = await conn.execute('SELECT COUNT(*) FROM "api_keys"');
    const apiKeyCount = apiKeysResult.rows[0][0];
    console.log(`   API 密钥数量: ${apiKeyCount}`);

    // 7. 检查任务队列表
    console.log('\n7. 检查任务队列表...');
    try {
      const queueResult = await conn.execute('SELECT COUNT(*) FROM "job_queue"');
      const queueCount = queueResult.rows[0][0];
      console.log(`   ✅ job_queue 表存在，任务数量: ${queueCount}`);
    } catch (e) {
      console.log('   ❌ job_queue 表不存在');
      console.log('   请执行 dm8_init.sql 初始化脚本');
    }

    conn.close();

    // 8. 测试 HTTP 接口
    console.log('\n8. 测试 HTTP 接口...');
    console.log('   请手动测试以下接口:');
    console.log('   - 健康检查: curl http://localhost:3000/api/public/health');
    console.log('   - 登录页面: http://localhost:3000/auth/sign-in');
    console.log('   - 默认账号: administrator@orbitai.com / administrator');

    console.log('\n=== 测试完成 ===');
    console.log('\n如果所有检查都通过，可以尝试登录:');
    console.log('1. 打开浏览器: http://localhost:3000');
    console.log('2. 输入账号: administrator@orbitai.com');
    console.log('3. 输入密码: administrator');
    console.log('4. 点击登录');

  } catch (e: any) {
    console.log('❌ 测试失败:', e.message);
    console.log('\n请检查:');
    console.log('1. DM8 数据库是否可访问');
    console.log('2. 连接字符串是否正确');
    console.log('3. 数据库是否已初始化');
  }
}

testLogin().catch(console.error);
