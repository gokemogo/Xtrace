/**
 * 基于数据库的任务队列实现
 * 替代 BullMQ 的 Redis 队列，支持 DM8 数据库
 */

import { randomUUID } from 'crypto';
import {
  IJobQueue,
  JobData,
  JobOptions,
  JobResult,
} from './queue-interface';

export class DbQueue implements IJobQueue {
  private queueName: string;
  private pool: any;

  constructor(queueName: string, pool: any) {
    this.queueName = queueName;
    this.pool = pool;
  }

  /**
   * 添加单个任务
   */
  async add(name: string, data: JobData, options?: JobOptions): Promise<JobResult> {
    const conn = await this.pool.getConnection();
    try {
      const id = data.id || randomUUID();
      const now = new Date();
      const maxAttempts = options?.attempts || 5;
      const delayUntil = options?.delay
        ? new Date(now.getTime() + options.delay)
        : null;
      const status = delayUntil ? 'delayed' : 'pending';
      const priority = options?.priority || 0;

      const sql = `
        INSERT INTO "job_queue" (
          "id", "queue_name", "job_name", "payload", "status",
          "priority", "attempts", "max_attempts", "delay_until", "created_at"
        ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
      `;

      await conn.execute(sql, [
        id,
        this.queueName,
        name,
        JSON.stringify(data),
        status,
        priority,
        maxAttempts,
        delayUntil,
        now,
      ]);

      return {
        id,
        name,
        data,
        status,
        attempts: 0,
        maxAttempts,
        createdAt: now,
      };
    } finally {
      conn.close();
    }
  }

  /**
   * 批量添加任务
   */
  async addBulk(jobs: Array<{ name: string; data: JobData; opts?: JobOptions }>): Promise<JobResult[]> {
    const results: JobResult[] = [];
    const conn = await this.pool.getConnection();
    try {
      for (const job of jobs) {
        const id = job.data.id || randomUUID();
        const now = new Date();
        const maxAttempts = job.opts?.attempts || 5;
        const delayUntil = job.opts?.delay
          ? new Date(now.getTime() + job.opts.delay)
          : null;
        const status = delayUntil ? 'delayed' : 'pending';
        const priority = job.opts?.priority || 0;

        const sql = `
          INSERT INTO "job_queue" (
            "id", "queue_name", "job_name", "payload", "status",
            "priority", "attempts", "max_attempts", "delay_until", "created_at"
          ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
        `;

        await conn.execute(sql, [
          id,
          this.queueName,
          job.name,
          JSON.stringify(job.data),
          status,
          priority,
          maxAttempts,
          delayUntil,
          now,
        ]);

        results.push({
          id,
          name: job.name,
          data: job.data,
          status,
          attempts: 0,
          maxAttempts,
          createdAt: now,
        });
      }
      return results;
    } finally {
      conn.close();
    }
  }

  /**
   * 获取待处理的任务（原子操作）
   * 使用 SELECT FOR UPDATE 确保任务不被重复处理
   */
  async process(workerId: string): Promise<JobResult | null> {
    const conn = await this.pool.getConnection();
    try {
      // 开始事务
      await conn.execute('BEGIN');

      // 查找并锁定一个待处理的任务
      const selectSql = `
        SELECT * FROM "job_queue"
        WHERE "queue_name" = ?
          AND "status" IN ('pending', 'delayed')
          AND ("delay_until" IS NULL OR "delay_until" <= CURRENT_TIMESTAMP)
          AND "attempts" < "max_attempts"
        ORDER BY "priority" DESC, "created_at" ASC
        FETCH NEXT 1 ROWS ONLY
        FOR UPDATE
      `;

      const result = await conn.execute(selectSql, [this.queueName]);

      if (!result.rows || result.rows.length === 0) {
        await conn.execute('COMMIT');
        return null;
      }

      const row = result.rows[0];
      const jobId = row[0]; // id
      const jobName = row[2]; // job_name
      const payload = row[3]; // payload
      const attempts = row[6]; // attempts

      // 更新任务状态为 active
      const updateSql = `
        UPDATE "job_queue"
        SET "status" = 'active',
            "started_at" = CURRENT_TIMESTAMP,
            "attempts" = "attempts" + 1
        WHERE "id" = ?
      `;

      await conn.execute(updateSql, [jobId]);
      await conn.execute('COMMIT');

      // 解析 payload
      let data: JobData;
      try {
        data = typeof payload === 'string' ? JSON.parse(payload) : payload;
      } catch (e) {
        data = { id: jobId, name: jobName, timestamp: new Date(), payload: {} };
      }

      return {
        id: jobId,
        name: jobName,
        data,
        status: 'active',
        attempts: attempts + 1,
        maxAttempts: row[7], // max_attempts
        createdAt: row[9], // created_at
        startedAt: new Date(),
      };
    } catch (error) {
      await conn.execute('ROLLBACK');
      throw error;
    } finally {
      conn.close();
    }
  }

  /**
   * 标记任务完成
   */
  async complete(jobId: string, result?: any): Promise<void> {
    const conn = await this.pool.getConnection();
    try {
      const sql = `
        UPDATE "job_queue"
        SET "status" = 'completed',
            "completed_at" = CURRENT_TIMESTAMP,
            "result" = ?
        WHERE "id" = ?
      `;

      await conn.execute(sql, [
        result ? JSON.stringify(result) : null,
        jobId,
      ]);
    } finally {
      conn.close();
    }
  }

  /**
   * 标记任务失败
   */
  async fail(jobId: string, error: string): Promise<void> {
    const conn = await this.pool.getConnection();
    try {
      // 检查是否还有重试次数
      const checkSql = `
        SELECT "attempts", "max_attempts" FROM "job_queue" WHERE "id" = ?
      `;
      const checkResult = await conn.execute(checkSql, [jobId]);

      if (checkResult.rows && checkResult.rows.length > 0) {
        const attempts = checkResult.rows[0][0];
        const maxAttempts = checkResult.rows[0][1];

        if (attempts < maxAttempts) {
          // 还有重试次数，设置为延迟状态（等待重试）
          const retryDelay = this.calculateRetryDelay(attempts);
          const delayUntil = new Date(Date.now() + retryDelay);

          const updateSql = `
            UPDATE "job_queue"
            SET "status" = 'delayed',
                "delay_until" = ?,
                "error" = ?
            WHERE "id" = ?
          `;
          await conn.execute(updateSql, [delayUntil, error, jobId]);
        } else {
          // 没有重试次数，标记为失败
          const updateSql = `
            UPDATE "job_queue"
            SET "status" = 'failed',
                "failed_at" = CURRENT_TIMESTAMP,
                "error" = ?
            WHERE "id" = ?
          `;
          await conn.execute(updateSql, [error, jobId]);
        }
      }
    } finally {
      conn.close();
    }
  }

  /**
   * 重试失败的任务
   */
  async retry(jobId: string): Promise<void> {
    const conn = await this.pool.getConnection();
    try {
      const sql = `
        UPDATE "job_queue"
        SET "status" = 'pending',
            "attempts" = 0,
            "error" = NULL,
            "delay_until" = NULL,
            "started_at" = NULL,
            "completed_at" = NULL,
            "failed_at" = NULL
        WHERE "id" = ? AND "status" IN ('failed', 'delayed')
      `;

      await conn.execute(sql, [jobId]);
    } finally {
      conn.close();
    }
  }

  /**
   * 获取任务状态
   */
  async getJob(jobId: string): Promise<JobResult | null> {
    const conn = await this.pool.getConnection();
    try {
      const sql = `SELECT * FROM "job_queue" WHERE "id" = ?`;
      const result = await conn.execute(sql, [jobId]);

      if (!result.rows || result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      let data: JobData;
      try {
        data = typeof row[3] === 'string' ? JSON.parse(row[3]) : row[3];
      } catch (e) {
        data = { id: row[0], name: row[2], timestamp: new Date(), payload: {} };
      }

      return {
        id: row[0],
        name: row[2],
        data,
        status: row[4],
        attempts: row[6],
        maxAttempts: row[7],
        error: row[13],
        result: row[14] ? JSON.parse(row[14]) : undefined,
        createdAt: row[9],
        startedAt: row[10],
        completedAt: row[11],
        failedAt: row[12],
      };
    } finally {
      conn.close();
    }
  }

  /**
   * 获取队列统计信息
   */
  async getStats(): Promise<{
    pending: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const conn = await this.pool.getConnection();
    try {
      const sql = `
        SELECT "status", COUNT(*) as cnt
        FROM "job_queue"
        WHERE "queue_name" = ?
        GROUP BY "status"
      `;

      const result = await conn.execute(sql, [this.queueName]);

      const stats = {
        pending: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      };

      if (result.rows) {
        for (const row of result.rows) {
          const status = row[0] as keyof typeof stats;
          const count = row[1];
          if (status in stats) {
            stats[status] = count;
          }
        }
      }

      return stats;
    } finally {
      conn.close();
    }
  }

  /**
   * 清理已完成的任务
   */
  async clean(gracePeriodMs: number): Promise<number> {
    const conn = await this.pool.getConnection();
    try {
      const cutoffTime = new Date(Date.now() - gracePeriodMs);

      const sql = `
        DELETE FROM "job_queue"
        WHERE "queue_name" = ?
          AND "status" = 'completed'
          AND "completed_at" < ?
      `;

      const result = await conn.execute(sql, [this.queueName, cutoffTime]);
      return result.rowsAffected || 0;
    } finally {
      conn.close();
    }
  }

  /**
   * 获取队列名称
   */
  getName(): string {
    return this.queueName;
  }

  /**
   * 计算重试延迟（指数退避）
   */
  private calculateRetryDelay(attempt: number): number {
    // 指数退避：1s, 2s, 4s, 8s, 16s, ...
    const baseDelay = 1000;
    const maxDelay = 60000; // 最大 60 秒
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    return delay;
  }
}
