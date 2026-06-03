/**
 * 解析 DM8 连接串，支持密码中包含 @ 等特殊字符
 * 格式: dm://user:password@host:port/schema
 * 将密码中的 @ 编码为 %40，dmdb 驱动的 url.parse 会自动解码
 */
export function parseDm8Url(url: string): string {
  // 如果不包含 dm:// 前缀，直接返回
  if (!url.startsWith('dm://')) return url;

  const withoutScheme = url.slice(5); // 去掉 "dm://"

  // 找到最后一个 @，它后面是 host:port
  const lastAtIndex = withoutScheme.lastIndexOf('@');
  if (lastAtIndex === -1) return url;

  const afterAt = withoutScheme.slice(lastAtIndex + 1);
  // 验证后面是 host:port 模式
  if (!/^[\w][\w.-]*:\d+/.test(afterAt)) return url;

  const beforeAt = withoutScheme.slice(0, lastAtIndex);
  const colonIndex = beforeAt.indexOf(':');
  if (colonIndex === -1) return url;

  const user = beforeAt.slice(0, colonIndex);
  const password = beforeAt.slice(colonIndex + 1);

  // 将密码中的 @ 编码为 %40（url.parse 会自动解码回 @）
  const encodedPassword = password.replace(/@/g, '%40');

  return `dm://${user}:${encodedPassword}@${afterAt}`;
}
