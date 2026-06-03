/**
 * 解析 DM8 连接串，支持密码中包含 @ 等特殊字符
 * 格式: dm://user:password@host:port/schema
 * 返回标准的连接串（密码中的 @ 不会被误解析）
 */
export function parseDm8Url(url: string): string {
  // 如果不包含 dm:// 前缀，直接返回
  if (!url.startsWith('dm://')) return url;

  const withoutScheme = url.slice(5); // 去掉 "dm://"

  // 找到最后一个 @，它后面的模式是 host:port 或 host:port/db
  // host 部分是 IP 或域名，后面一定跟 :port
  const lastAtIndex = withoutScheme.lastIndexOf('@');
  if (lastAtIndex === -1) return url;

  const afterAt = withoutScheme.slice(lastAtIndex + 1);
  // host:port 模式：数字开头的 IP 或字母开头的域名，后跟 :数字
  if (/^[\w.]+:\d+/.test(afterAt)) {
    const beforeAt = withoutScheme.slice(0, lastAtIndex);
    const colonIndex = beforeAt.indexOf(':');
    if (colonIndex === -1) return url;

    const user = beforeAt.slice(0, colonIndex);
    const password = beforeAt.slice(colonIndex + 1);

    return `dm://${user}:${password}@${afterAt}`;
  }

  return url;
}
