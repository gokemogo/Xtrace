/**
 * 任务队列接口定义
 * 用于替代 BullMQ 的 Redis 队列，支持 DM8 数据库队列
 */

export interface JobData {
  id: string;
  name: string;
  timestamp: Date;
  payload: any;
}

export interface JobOptions {
  removeOnComplete?: boolean;
  removeOnFail?: number;
  attempts?: number;
  backoff?: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
  delay?: number;
  priority?: number;
}

export interface JobResult {
  id: string;
  name: string;
  data: JobData;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'delayed';
  attempts: number;
  maxAttempts: number;
  error?: string;
  result?: any;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
}

export interface IJobQueue {
  /**
   * 添加单个任务
   */
  add(name: string, data: JobData, options?: JobOptions): Promise<JobResult>;

  /**
   * 批量添加任务
   */
  addBulk(jobs: Array<{ name: string; data: JobData; opts?: JobOptions }>): Promise<JobResult[]>;

  /**
   * 获取待处理的任务
   * @param workerId 工作节点标识
   */
  process(workerId: string): Promise<JobResult | null>;

  /**
   * 标记任务完成
   */
  complete(jobId: string, result?: any): Promise<void>;

  /**
   * 标记任务失败
   */
  fail(jobId: string, error: string): Promise<void>;

  /**
   * 重试失败的任务
   */
  retry(jobId: string): Promise<void>;

  /**
   * 获取任务状态
   */
  getJob(jobId: string): Promise<JobResult | null>;

  /**
   * 获取队列统计信息
   */
  getStats(): Promise<{
    pending: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }>;

  /**
   * 清理已完成的任务
   */
  clean(gracePeriodMs: number): Promise<number>;

  /**
   * 获取队列名称
   */
  getName(): string;
}

export interface IQueueWorker {
  /**
   * 开始处理任务
   */
  start(): Promise<void>;

  /**
   * 停止处理任务
   */
  stop(): Promise<void>;

  /**
   * 是否正在运行
   */
  isRunning(): boolean;
}
