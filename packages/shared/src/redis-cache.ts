/**
 * TongRDS (Redis-compatible) 缓存实现
 * 用于替代内存缓存，提供分布式缓存支持
 */

// 只在 Node.js 环境中加载 ioredis
let Redis: any = null;
if (typeof window === 'undefined' && typeof process !== 'undefined' && process.versions?.node) {
  try {
    // 使用 eval 防止 webpack 静态分析打包 ioredis
    Redis = eval("require")('ioredis');
  } catch (e) {
    console.warn('ioredis 未安装，Redis 缓存功能不可用');
  }
}

interface CacheOptions {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  defaultTTL?: number;
}

export class RedisCache {
  private client: any;
  private keyPrefix: string;
  private defaultTTL: number;
  private isAvailable: boolean = false;

  constructor(options: CacheOptions) {
    this.keyPrefix = options.keyPrefix || 'deeptrace:';
    this.defaultTTL = options.defaultTTL || 60; // 默认 60 秒

    // 检查 Redis 是否可用
    if (!Redis) {
      console.warn('Redis/TongRDS 不可用，缓存功能已禁用');
      this.isAvailable = false;
      return;
    }

    try {
      this.client = new Redis({
        host: options.host,
        port: options.port,
        password: options.password,
        db: options.db || 0,
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => {
          if (times > 3) {
            return null; // 停止重试
          }
          return Math.min(times * 200, 2000); // 重试间隔
        },
      });

      // 错误处理
      this.client.on('error', (err: any) => {
        console.error('Redis/TongRDS 连接错误:', err);
        this.isAvailable = false;
      });

      this.client.on('connect', () => {
        console.log('✅ Redis/TongRDS 连接成功');
        this.isAvailable = true;
      });

      this.isAvailable = true;
    } catch (error) {
      console.error('Redis/TongRDS 初始化失败:', error);
      this.isAvailable = false;
    }
  }

  /**
   * 获取缓存
   */
  async get<T>(key: string): Promise<T | undefined> {
    if (!this.isAvailable || !this.client) {
      return undefined;
    }

    try {
      const fullKey = this.keyPrefix + key;
      const value = await this.client.get(fullKey);

      if (value === null) {
        return undefined;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Redis/TongRDS GET 错误:', error);
      return undefined;
    }
  }

  /**
   * 设置缓存
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.isAvailable || !this.client) {
      return;
    }

    try {
      const fullKey = this.keyPrefix + key;
      const serialized = JSON.stringify(value);
      const expiry = ttl || this.defaultTTL;

      await this.client.setex(fullKey, expiry, serialized);
    } catch (error) {
      console.error('Redis/TongRDS SET 错误:', error);
    }
  }

  /**
   * 删除缓存
   */
  async delete(key: string): Promise<void> {
    if (!this.isAvailable || !this.client) {
      return;
    }

    try {
      const fullKey = this.keyPrefix + key;
      await this.client.del(fullKey);
    } catch (error) {
      console.error('Redis/TongRDS DEL 错误:', error);
    }
  }

  /**
   * 批量删除缓存（按模式匹配）
   */
  async deletePattern(pattern: string): Promise<void> {
    if (!this.isAvailable || !this.client) {
      return;
    }

    try {
      const fullPattern = this.keyPrefix + pattern;
      const keys = await this.client.keys(fullPattern);

      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (error) {
      console.error('Redis/TongRDS DEL PATTERN 错误:', error);
    }
  }

  /**
   * 检查缓存是否存在
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isAvailable || !this.client) {
      return false;
    }

    try {
      const fullKey = this.keyPrefix + key;
      const result = await this.client.exists(fullKey);
      return result === 1;
    } catch (error) {
      console.error('Redis/TongRDS EXISTS 错误:', error);
      return false;
    }
  }

  /**
   * 设置过期时间
   */
  async expire(key: string, ttl: number): Promise<void> {
    if (!this.isAvailable || !this.client) {
      return;
    }

    try {
      const fullKey = this.keyPrefix + key;
      await this.client.expire(fullKey, ttl);
    } catch (error) {
      console.error('Redis/TongRDS EXPIRE 错误:', error);
    }
  }

  /**
   * 获取剩余过期时间
   */
  async ttl(key: string): Promise<number> {
    if (!this.isAvailable || !this.client) {
      return -1;
    }

    try {
      const fullKey = this.keyPrefix + key;
      return await this.client.ttl(fullKey);
    } catch (error) {
      console.error('Redis/TongRDS TTL 错误:', error);
      return -1;
    }
  }

  /**
   * 清除所有缓存
   */
  async clear(): Promise<void> {
    if (!this.isAvailable || !this.client) {
      return;
    }

    try {
      const keys = await this.client.keys(this.keyPrefix + '*');

      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (error) {
      console.error('Redis/TongRDS CLEAR 错误:', error);
    }
  }

  /**
   * 获取缓存大小
   */
  async size(): Promise<number> {
    if (!this.isAvailable || !this.client) {
      return 0;
    }

    try {
      const keys = await this.client.keys(this.keyPrefix + '*');
      return keys.length;
    } catch (error) {
      console.error('Redis/TongRDS SIZE 错误:', error);
      return 0;
    }
  }

  /**
   * 关闭连接
   */
  async close(): Promise<void> {
    if (!this.isAvailable || !this.client) {
      return;
    }

    await this.client.quit();
  }

  /**
   * 获取 Redis 客户端（用于高级操作）
   */
  getClient(): any {
    return this.client;
  }
}

// 全局缓存实例
let globalCache: RedisCache | null = null;

/**
 * 获取全局缓存实例
 */
export function getRedisCache(): RedisCache | null {
  return globalCache;
}

/**
 * 初始化 Redis 缓存
 */
export function initRedisCache(options: CacheOptions): RedisCache {
  if (globalCache) {
    globalCache.close();
  }

  globalCache = new RedisCache(options);
  return globalCache;
}

/**
 * 生成缓存键
 */
export function generateCacheKey(prefix: string, params: any): string {
  const paramStr = JSON.stringify(params, (key, value) => {
    // 忽略函数和循环引用
    if (typeof value === 'function') return '[Function]';
    return value;
  });
  return `${prefix}:${paramStr}`;
}
