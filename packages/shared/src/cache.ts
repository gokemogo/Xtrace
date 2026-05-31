/**
 * 简单的内存缓存实现
 * 用于缓存常用查询结果，减少数据库查询
 */

interface CacheEntry<T> {
  value: T;
  expiry: number;
}

export class MemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL: number;
  private maxSize: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(options: { defaultTTL?: number; maxSize?: number } = {}) {
    this.defaultTTL = options.defaultTTL || 60000; // 默认 60 秒
    this.maxSize = options.maxSize || 1000; // 最大 1000 条

    // 定期清理过期缓存
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // 每分钟清理一次
  }

  /**
   * 获取缓存
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // 检查是否过期
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  /**
   * 设置缓存
   */
  set<T>(key: string, value: T, ttl?: number): void {
    // 如果缓存已满，删除最旧的条目
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const expiry = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { value, expiry });
  }

  /**
   * 删除缓存
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 清理过期缓存
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 销毁缓存
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

// 全局缓存实例
let globalCache: MemoryCache | null = null;

/**
 * 获取全局缓存实例
 */
export function getCache(): MemoryCache {
  if (!globalCache) {
    globalCache = new MemoryCache({
      defaultTTL: 60000, // 60 秒
      maxSize: 1000,
    });
  }
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

/**
 * 缓存装饰器
 */
export function cached<T>(
  prefix: string,
  ttl?: number
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cache = getCache();
      const cacheKey = generateCacheKey(prefix, args);

      // 尝试从缓存获取
      const cachedResult = cache.get<T>(cacheKey);
      if (cachedResult !== undefined) {
        return cachedResult;
      }

      // 执行原方法
      const result = await originalMethod.apply(this, args);

      // 缓存结果
      cache.set(cacheKey, result, ttl);

      return result;
    };

    return descriptor;
  };
}
