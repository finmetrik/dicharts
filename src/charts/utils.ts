// ---------------------------------------------------------------------------
// DiCharts – Shared Chart Utilities
// ---------------------------------------------------------------------------
// Common constants, theme detection, animation helpers, tooltip factory,
// and formatting functions used across all standalone chart components.
// ---------------------------------------------------------------------------

// ── Colour palette ──────────────────────────────────────────────────────────

export const PALETTE = [
  '#2962ff', '#26a69a', '#ef5350', '#FFD700', '#A78BFA',
  '#F472B6', '#4ECDC4', '#FF6B6B', '#38bdf8', '#fb923c',
  '#a3e635', '#e879f9',
];

// ── Easing functions ────────────────────────────────────────────────────────

export const EASINGS: Record<string, (t: number) => number> = {
  linear: (t) => t,
  easeOut: (t) => 1 - Math.pow(1 - t, 3),
  easeInOut: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  spring: (t) => 1 - Math.exp(-6 * t) * Math.cos(6.5 * t),
};

/** Simple easing helper for charts that don't use the full EASINGS map. */
export function ease(t: number, type: string): number {
  if (type === 'easeOut') return 1 - Math.pow(1 - t, 3);
  if (type === 'easeInOut') return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  return t;
}

// ── Theme / luminance detection ─────────────────────────────────────────────

export function hexLuminance(bg: string): boolean {
  if (bg.startsWith('#')) {
    const hex = bg.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    return (r * 299 + g * 587 + b * 114) / 1000 > 150;
  }
  return false;
}

export function parseLuminance(color: string): boolean {
  if (color.startsWith('#')) return hexLuminance(color);
  const m = color.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/);
  if (m) {
    const r = +m[1], g = +m[2], b = +m[3];
    return (r * 299 + g * 587 + b * 114) / 1000 > 150;
  }
  return false;
}

export function isLightBg(bg: string, el?: HTMLElement): boolean {
  if (bg === 'transparent' && el) {
    let node: HTMLElement | null = el;
    while (node) {
      const cs = getComputedStyle(node);
      const c = cs.backgroundColor;
      if (c && c !== 'transparent' && c !== 'rgba(0, 0, 0, 0)') {
        return parseLuminance(c);
      }
      node = node.parentElement;
    }
    return false;
  }
  return hexLuminance(bg);
}

// ── Resolved animation ─────────────────────────────────────────────────────

export interface ResolvedAnim {
  enabled: boolean;
  duration: number;
  easing: (t: number) => number;
  delay: number;
  style: string;
}

export function resolveAnim(
  raw?: boolean | { duration?: number; easing?: string; delay?: number; style?: string },
  defaultStyle = 'grow',
): ResolvedAnim {
  if (!raw) return { enabled: false, duration: 0, easing: EASINGS.linear, delay: 0, style: 'none' };
  const cfg = raw === true ? {} : raw;
  const style = cfg.style ?? defaultStyle;
  return {
    enabled: style !== 'none',
    duration: cfg.duration ?? 800,
    easing: EASINGS[cfg.easing ?? 'easeOut'] ?? EASINGS.easeOut,
    delay: cfg.delay ?? 0,
    style,
  };
}

// ── Tooltip helpers ─────────────────────────────────────────────────────────

export function createTooltip(container: HTMLElement, light: boolean): HTMLDivElement {
  const tip = document.createElement('div');
  applyTipTheme(tip, light);
  container.appendChild(tip);
  return tip;
}

export function applyTipTheme(tip: HTMLElement, light: boolean): void {
  tip.style.cssText = [
    'position:absolute;pointer-events:none;z-index:10',
    'padding:6px 10px;border-radius:8px',
    'font:500 12px/1.5 system-ui,-apple-system,sans-serif',
    light
      ? 'background:rgba(255,255,255,.96);color:#1e293b;box-shadow:0 4px 12px rgba(0,0,0,.12);border:1px solid rgba(0,0,0,0.08)'
      : 'background:rgba(15,23,42,.92);color:#e2e8f0;box-shadow:0 4px 12px rgba(0,0,0,.25)',
    'opacity:0;transition:opacity 150ms ease;white-space:nowrap',
  ].join(';');
}

export function showTooltip(
  tip: HTMLElement,
  html: string,
  cx: number,
  cy: number,
  containerWidth: number,
): void {
  tip.innerHTML = html;
  tip.style.opacity = '1';
  const tw = tip.offsetWidth;
  const th = tip.offsetHeight;
  let left = cx - tw / 2;
  let top = cy - th - 12;
  if (left < 4) left = 4;
  if (left + tw > containerWidth - 4) left = containerWidth - tw - 4;
  if (top < 4) top = cy + 16;
  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}

export function hideTooltip(tip: HTMLElement): void {
  tip.style.opacity = '0';
}

// ── Formatting ──────────────────────────────────────────────────────────────

export function formatValue(v: number): string {
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v % 1 === 0 ? `${v}` : v.toFixed(1);
}

export function formatNum(v: number): string {
  if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toFixed(v % 1 === 0 ? 0 : 2);
}

// ── Colour utilities ────────────────────────────────────────────────────────

export function colorWithAlpha(hex: string, alpha: number): string {
  if (hex.startsWith('#')) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return hex;
}

// ── Theme-aware defaults ────────────────────────────────────────────────────

export function themeTextColor(light: boolean): string {
  return light ? '#1e293b' : '#e6edf3';
}

export function themeGridColor(light: boolean): string {
  return light ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.06)';
}
