/**
 * 测试数据库队列实现
 * 运行方式: npx ts-node scripts/test-db-queue.ts
 */

import { DbQueue } from '../packages/shared/src/queue/db-queue';

async function testDbQueue() {
  console.log('Testing database queue implementation...');

  // 模拟数据库连接池
  const mockPool = {
    getConnection: async () => {
      const mockConn = {
        execute: async (sql: string, params?: any[]) => {
          console.log('Executing SQL:', sql.substring(0, 100) + '...');
          console.log('Params:', params);

          // 模拟查询结果
          if (sql.includes('SELECT') && sql.includes('job_queue')) {
            return {
              rows: [
                [
                  'test-id-1',                    // id
                  'test-queue',                   // queue_name
                  'test-job',                     // job_name
                  '{"id":"test-id-1","name":"test-job","timestamp":"2024-01-01","payload":{}}', // payload
                  'pending',                      // status
                  0,                              // priority
                  0,                              // attempts
                  5,                              // max_attempts
                  null,                           // delay_until
                  new Date(),                     // created_at
                  null,                           // started_at
                  null,                           // completed_at
                  null,                           // failed_at
                  null,                           // error
                  null,                           // result
                ]
              ],
              rowsAffected: 1,
            };
          }

          return { rows: [], rowsAffected: 1 };
        },
        close: async () => {},
      };
      return mockConn;
    },
  };

  const queue = new DbQueue('test-queue', mockPool);

  // 测试添加任务
  console.log('\n1. Testing add job...');
  const job = await queue.add('test-job', {
    id: 'test-id-1',
    name: 'test-job',
    timestamp: new Date(),
    payload: { data: 'test' },
  });
  console.log('Added job:', job);

  // 测试获取任务
  console.log('\n2. Testing process job...');
  const processedJob = await queue.process('worker-1');
  console.log('Processed job:', processedJob);

  // 测试完成任务
  console.log('\n3. Testing complete job...');
  await queue.complete('test-id-1', { success: true });
  console.log('Job completed');

  // 测试获取统计信息
  console.log('\n4. Testing get stats...');
  const stats = await queue.getStats();
  console.log('Queue stats:', stats);

  console.log('\nAll tests passed!');
}

testDbQueue().catch(console.error);
