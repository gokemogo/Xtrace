const dmdb = require('dmdb');
const fs = require('fs');

async function main() {
  const pool = await dmdb.createPool({
    connectionString: process.env.DATABASE_URL,
    poolMin: 1,
    poolMax: 1,
  });
  const conn = await pool.getConnection();
  console.log('✅ 连接成功');

  const sql = fs.readFileSync('/app/deploy/dm8_init_final.sql', 'utf8');
  const stmts = sql
    .split(/;\s*\n/)
    .map(function(s) { return s.trim(); })
    .filter(function(s) { return s.length > 0 && s.indexOf('--') !== 0; });

  console.log('共 ' + stmts.length + ' 条语句');

  var ok = 0;
  var skip = 0;
  var fail = 0;

  for (var i = 0; i < stmts.length; i++) {
    var s = stmts[i];
    try {
      await conn.execute(s);
      ok++;
      console.log('✅ ' + (i + 1) + '/' + stmts.length);
    } catch(e) {
      if (e.message.indexOf('已存在') >= 0 || e.message.indexOf('[-2140]') >= 0 || e.message.indexOf('[-3236]') >= 0) {
        skip++;
        console.log('⏭️  ' + (i + 1) + '/' + stmts.length + ' 已存在');
      } else {
        fail++;
        console.warn('❌ ' + (i + 1) + '/' + stmts.length + ': ' + e.message.substring(0, 100));
      }
    }
  }

  console.log('');
  console.log('==================================================');
  console.log('✅ 成功: ' + ok + ', ⏭️ 跳过: ' + skip + ', ❌ 失败: ' + fail);

  conn.close();
  pool.close();
}

main().catch(console.error);
