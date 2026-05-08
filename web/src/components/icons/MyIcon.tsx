import React, { useEffect, useMemo, useState } from "react";

type Props = {
  name: string; // 对应 public/icons/{name}.svg 文件
  size?: number | string;
  className?: string;
  title?: string;
  ariaLabel?: string;
  // 若为 true，则强制使用 <img> 标签而非内联 SVG
  fallbackToImg?: boolean;
  // 可选颜色，用于覆盖图标的 fill/stroke。若未提供，则使用 SVG 原始颜色
  color?: string;
  // 可选点击事件处理器（用于交互式图标）
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
};

// 已加载 SVG 内容的缓存
const svgCache = new Map<string, string | null>();
// 正在请求中的 SVG Promise 缓存，避免重复请求
const inFlight = new Map<string, Promise<string | null>>();

// 异步获取 SVG 文件内容
async function fetchSvg(name: string): Promise<string | null> {
  const url = `/icons/${name}.svg`;
  try {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return null;
    const text = await res.text();
    return text;
  } catch (e) {
    return null;
  }
}

// 预加载指定名称的图标（可用于路由切换前提前加载）
export function preloadIcon(name: string) {
  if (svgCache.has(name)) return;
  if (!inFlight.has(name)) {
    const p = fetchSvg(name).then((t) => {
      svgCache.set(name, t);
      inFlight.delete(name);
      return t;
    });
    inFlight.set(name, p);
  }
}

export const MyIcon: React.FC<Props> = ({
  name,
  size = 16,
  className,
  title,
  ariaLabel,
  fallbackToImg = false,
  color,
  onClick,
}) => {
  // 初始状态：若缓存中已有该图标，则直接使用；否则设为 undefined 表示“正在加载”
  const [svg, setSvg] = useState<string | null | undefined>(() =>
    svgCache.has(name) ? svgCache.get(name) ?? null : undefined,
  );

  // 加载 SVG 内容（支持缓存和去重）
  useEffect(() => {
    let mounted = true;

    // 如果缓存中已有，直接设置
    if (svgCache.has(name)) {
      setSvg(svgCache.get(name) ?? null);
      return () => {
        mounted = false;
      };
    }

    // 如果已有正在进行的请求，复用它
    const inflight = inFlight.get(name);
    if (inflight) {
      inflight.then((t) => {
        if (!mounted) return;
        setSvg(t);
      });
      return () => {
        mounted = false;
      };
    }

    // 否则发起新请求
    const p = fetchSvg(name).then((t) => {
      svgCache.set(name, t);
      if (!mounted) return t;
      setSvg(t);
      return t;
    });
    inFlight.set(name, p);

    return () => {
      mounted = false;
    };
  }, [name]);

  // 计算外层容器样式
  const style = useMemo<React.CSSProperties>(() => {
    const s: React.CSSProperties = {
      width: typeof size === "number" ? `${size}px` : size,
      height: typeof size === "number" ? `${size}px` : size,
      display: "inline-block",
      lineHeight: 0,
    };
    if (color) s.color = color; // 设置 color 以便 currentColor 生效
    if (onClick) s.cursor = "pointer";
    return s;
  }, [size, color, onClick]);

  // 加载中：渲染一个占位元素防止布局偏移
  if (svg === undefined) {
    return <span aria-hidden style={style} className={className} />;
  }

  // 如果 SVG 加载失败，或强制使用 <img>，则回退到 img 标签
  if (svg === null || fallbackToImg) {
    return (
      <img
        src={`/icons/${name}.svg`}
        alt={ariaLabel ?? title ?? name}
        style={style}
        className={className}
        onClick={onClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
      />
    );
  }

  // ========== 开始处理 SVG 内容 ==========
  let content = svg;

  // 移除原始 SVG 中硬编码的 width/height 属性，让外层容器控制尺寸
  content = content.replace(/\s*(width|height)=("|')?[^"'\s>]+("|')?/gi, "");

  // 如果用户指定了 color，则将 SVG 中所有非 "none" 的 fill/stroke 替换为 currentColor
  // 如果用户指定了 color，则确保所有可填充元素使用 currentColor
  if (color) {
    // 第一步：将已有的非 "none" 的 fill/stroke 替换为 currentColor
    content = content.replace(
      /(fill|stroke)=("|')(?!none)[^"']*("|')/gi,
      '$1="currentColor"'
    );

    // 第二步：为没有 fill 属性的 <path>、<circle>、<rect> 等图形元素添加 fill="currentColor"
    // 注意：只处理没有 fill 且不是 self-closing 标签的问题（这里简化处理）
    content = content.replace(
      /<(path|circle|rect|polygon|ellipse|line|polyline)(\s[^>]*?)?(?<!fill=)(\/?)>/gi,
      (match, tag, attrs = '', selfClose = '') => {
        // 如果已经包含 fill=，跳过（虽然前面已处理，双重保险）
        if (attrs && /fill=/i.test(attrs)) {
          return match;
        }
        // 否则添加 fill="currentColor"
        const newAttrs = attrs ? `${attrs} fill="currentColor"` : ' fill="currentColor"';
        return `<${tag}${newAttrs}${selfClose}>`;
      }
    );
  }

  // 确保 <svg> 标签具有 width="100%" height="100%" 和合适的缩放行为
  content = content.replace(/<svg(.*?)>/i, (match, attrs) => {
    const otherAttrs = attrs || "";
    const hasPreserve = /preserveAspectRatio=/i.test(otherAttrs);
    const preserve = hasPreserve ? "" : ' preserveAspectRatio="xMidYMid meet"';
    return `<svg${otherAttrs} width="100%" height="100%"${preserve}>`;
  });

  // ========== 交互支持 ==========
  const isInteractive = Boolean(onClick);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (!onClick) return;
    // 支持空格键和回车键触发点击
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick(e as unknown as React.MouseEvent<HTMLElement>);
    }
  };

  // 渲染内联 SVG
  return (
    <span
      role={isInteractive ? "button" : ariaLabel || title ? "img" : undefined}
      aria-label={ariaLabel ?? title ?? name}
      title={title}
      className={className}
      style={style}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={isInteractive ? 0 : undefined}
      // 注意：使用 dangerouslySetInnerHTML 是安全的，因为我们只渲染来自 public 目录的可信 SVG
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};

export default MyIcon;