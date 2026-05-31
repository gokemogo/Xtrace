#!/bin/bash

# 快速检查数据库状态

echo "=================================="
echo "  检查数据库状态"
echo "=================================="
echo ""

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "❌ .env 文件不存在"
    echo "请运行: ./scripts/configure-external-db.sh"
    exit 1
fi

# 读取配置
source .env

echo "数据库类型: $DB_TYPE"
echo "DM8 连接: ${DATABASE_URL//:*@/:***@}"
echo "TongRDS: $REDIS_HOST:$REDIS_PORT"
echo ""

# 测试 DM8 连接
echo "1. 测试 DM8 连接..."
if npx ts-node -e "
const dmdb = eval('require')('dmdb');
const pool = dmdb.createPool({ connectionString: '$DATABASE_URL', poolMin: 1, poolMax: 2 });
pool.getConnection().then(conn => {
    console.log('✅ DM8 连接成功');
    conn.close();
}).catch(e => {
    console.log('❌ DM8 连接失败:', e.message);
});
" 2>/dev/null; then
    :
else
    echo "❌ DM8 连接测试失败"
fi

echo ""

# 测试 TongRDS 连接
echo "2. 测试 TongRDS 连接..."
if npx ts-node -e "
const Redis = eval('require')('ioredis');
const redis = new Redis({
    host: '$REDIS_HOST',
    port: parseInt('$REDIS_PORT'),
    password: '$REDIS_AUTH' || undefined,
    maxRetriesPerRequest: 3,
    connectTimeout: 5000,
});
redis.ping().then(pong => {
    console.log('✅ TongRDS 连接成功, PING:', pong);
    redis.disconnect();
}).catch(e => {
    console.log('❌ TongRDS 连接失败:', e.message);
});
" 2>/dev/null; then
    :
else
    echo "❌ TongRDS 连接测试失败"
fi

echo ""

# 检查数据库表
echo "3. 检查数据库表..."
if npx ts-node -e "
const dmdb = eval('require')('dmdb');
const pool = dmdb.createPool({ connectionString: '$DATABASE_URL', poolMin: 1, poolMax: 2 });
pool.getConnection().then(async conn => {
    const tables = ['users', 'projects', 'project_memberships', 'traces', 'observations', 'scores', 'job_queue'];
    for (const table of tables) {
        try {
            await conn.execute('SELECT COUNT(*) FROM \"' + table + '\"');
            console.log('   ✅ ' + table + ' 表存在');
        } catch (e) {
            console.log('   ❌ ' + table + ' 表不存在');
        }
    }
    conn.close();
}).catch(e => {
    console.log('❌ 无法检查表:', e.message);
});
" 2>/dev/null; then
    :
else
    echo "❌ 表检查失败"
fi

echo ""

# 检查用户数据
echo "4. 检查用户数据..."
if npx ts-node -e "
const dmdb = eval('require')('dmdb');
const pool = dmdb.createPool({ connectionString: '$DATABASE_URL', poolMin: 1, poolMax: 2 });
pool.getConnection().then(async conn => {
    try {
        const result = await conn.execute('SELECT COUNT(*) FROM \"users\"');
        console.log('   用户数量:', result.rows[0][0]);

        const adminResult = await conn.execute(
            'SELECT \"id\", \"name\", \"email\" FROM \"users\" WHERE \"email\" = ?',
            ['administrator@orbitai.com']
        );
        if (adminResult.rows && adminResult.rows.length > 0) {
            console.log('   ✅ 管理员用户存在');
        } else {
            console.log('   ⚠️  管理员用户不存在');
        }
    } catch (e) {
        console.log('   ❌ 无法查询用户:', e.message);
    }
    conn.close();
}).catch(e => {
    console.log('❌ 无法连接数据库:', e.message);
});
" 2>/dev/null; then
    :
else
    echo "❌ 用户检查失败"
fi

echo ""
echo "=================================="
echo "  检查完成"
echo "=================================="
