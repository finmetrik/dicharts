export interface HeatmapItem {
  id?: string;
  label: string;
  weight: number;
  change: number;
  sublabel?: string;
  group?: string;
}

export interface HeatmapAnimationConfig {
  duration?: number;
  easing?: 'linear' | 'easeOut' | 'easeInOut';
  style?: 'fade' | 'grow';
}

export interface HeatmapOptions {
  data?: HeatmapItem[];
  maxChange?: number;
  positiveColor?: string;
  negativeColor?: string;
  neutralColor?: string;
  background?: string;
  textColor?: string;
  borderColor?: string;
  gap?: number;
  borderRadius?: number;
  animation?: HeatmapAnimationConfig;
  onClick?: (item: HeatmapItem) => void;
}

export interface HeatmapInstance {
  setData(data: HeatmapItem[]): void;
  setOptions(opts: Partial<HeatmapOptions>): void;
  redraw(): void;
  resize(): void;
  dispose(): void;
}

interface LayoutRect {
  x: number;
  y: number;
  w: number;
  h: number;
  item: HeatmapItem;
}

function layoutTreemap(
  items: HeatmapItem[],
  x: number,
  y: number,
  w: number,
  h: number,
  gap: number
): LayoutRect[] {
  if (items.length === 0) return [];
  const sorted = items.slice().sort((a, b) => b.weight - a.weight);
  const totalWeight = sorted.reduce((s, i) => s + i.weight, 0);
  if (totalWeight <= 0) return [];
  const rects: LayoutRect[] = [];
  squarify(sorted, [], x, y, w, h, totalWeight, rects, gap);
  return rects;
}

function squarify(
  children: HeatmapItem[],
  row: HeatmapItem[],
  x: number,
  y: number,
  w: number,
  h: number,
  totalArea: number,
  out: LayoutRect[],
  gap: number
): void {
  if (children.length === 0) {
    layoutRow(row, x, y, w, h, totalArea, out, gap);
    return;
  }
  const area = w * h;
  const c = children[0];
  const newRow = [...row, c];
  if (
    row.length === 0 ||
    worst(newRow, w, h, area, totalArea) <= worst(row, w, h, area, totalArea)
  ) {
    squarify(children.slice(1), newRow, x, y, w, h, totalArea, out, gap);
  } else {
    const rowWeight = row.reduce((s, i) => s + i.weight, 0);
    const fraction = rowWeight / totalArea;
    const isWide = w >= h;
    if (isWide) {
      const rowW = fraction * w;
      layoutRow(row, x, y, rowW, h, totalArea, out, gap);
      squarify(
        children,
        [],
        x + rowW,
        y,
        w - rowW,
        h,
        totalArea - rowWeight,
        out,
        gap
      );
    } else {
      const rowH = fraction * h;
      layoutRow(row, x, y, w, rowH, totalArea, out, gap);
      squarify(
        children,
        [],
        x,
        y + rowH,
        w,
        h - rowH,
        totalArea - rowWeight,
        out,
        gap
      );
    }
  }
}

function worst(
  row: HeatmapItem[],
  w: number,
  h: number,
  area: number,
  totalArea: number
): number {
  const rowWeight = row.reduce((s, i) => s + i.weight, 0);
  const fraction = rowWeight / totalArea;
  const isWide = w >= h;
  const side = isWide ? fraction * w : fraction * h;
  if (side <= 0) return Infinity;
  let maxR = 0;
  for (const item of row) {
    const itemFrac = item.weight / rowWeight;
    const other = isWide ? itemFrac * h : itemFrac * w;
    const r = Math.max(side / other, other / side);
    if (r > maxR) maxR = r;
  }
  return maxR;
}

function layoutRow(
  row: HeatmapItem[],
  x: number,
  y: number,
  w: number,
  h: number,
  totalArea: number,
  out: LayoutRect[],
  gap: number
): void {
  if (row.length === 0) return;
  const rowWeight = row.reduce((s, i) => s + i.weight, 0);
  const isWide = w >= h;
  let offset = 0;
  for (const item of row) {
    const frac = item.weight / rowWeight;
    let rx: number, ry: number, rw: number, rh: number;
    if (isWide) {
      rh = frac * h;
      rw = w;
      rx = x;
      ry = y + offset;
      offset += rh;
    } else {
      rw = frac * w;
      rh = h;
      rx = x + offset;
      ry = y;
      offset += rw;
    }
    const g = gap / 2;
    out.push({
      x: rx + g,
      y: ry + g,
      w: Math.max(0, rw - gap),
      h: Math.max(0, rh - gap),
      item,
    });
  }
}

function changeToColor(
  change: number,
  maxChange: number,
  posColor: string,
  negColor: string,
  neutralColor: string
): string {
  const t = Math.min(1, Math.abs(change) / maxChange);
  const target = change >= 0 ? posColor : negColor;
  return lerpColor(neutralColor, target, t);
}

function lerpColor(a: string, b: string, t: number): string {
  const ca = parseHex(a);
  const cb = parseHex(b);
  const r = Math.round(ca[0] + (cb[0] - ca[0]) * t);
  const g = Math.round(ca[1] + (cb[1] - ca[1]) * t);
  const bl = Math.round(ca[2] + (cb[2] - ca[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

function parseHex(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3)
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function isLightBg(bg: string, el?: HTMLElement): boolean {
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

function hexLuminance(bg: string): boolean {
  if (bg.startsWith('#')) {
    const hex = bg.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    return (r * 299 + g * 587 + b * 114) / 1000 > 150;
  }
  return false;
}

function parseLuminance(color: string): boolean {
  if (color.startsWith('#')) return hexLuminance(color);
  const m = color.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/);
  if (m) {
    const r = +m[1], g = +m[2], b = +m[3];
    return (r * 299 + g * 587 + b * 114) / 1000 > 150;
  }
  return false;
}

function ease(t: number, type: string): number {
  if (type === 'easeOut') return 1 - Math.pow(1 - t, 3);
  if (type === 'easeInOut')
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  return t;
}

export function createHeatmap(
  container: HTMLElement,
  options: HeatmapOptions = {}
): HeatmapInstance {
  const canvas = document.createElement('canvas');
  canvas.style.cssText =
    'width:100%;height:100%;display:block;cursor:pointer;';
  container.appendChild(canvas);

  const cs = getComputedStyle(container);
  if (cs.position === 'static') container.style.position = 'relative';

  const defaultBg = 'transparent';
  const _isLight = isLightBg(options.background ?? defaultBg, container);
  const defaultTextColor = _isLight ? '#334155' : '#e6edf3';
  const defaultNeutralColor = _isLight ? '#e2e8f0' : '#2a2e39';

  let opts: Required<Omit<HeatmapOptions, 'animation'>> & {
    animation?: HeatmapAnimationConfig;
  } = {
    data: options.data ?? [],
    maxChange: options.maxChange ?? 10,
    positiveColor: options.positiveColor ?? '#26a69a',
    negativeColor: options.negativeColor ?? '#ef5350',
    neutralColor: options.neutralColor ?? defaultNeutralColor,
    background: options.background ?? defaultBg,
    textColor: options.textColor ?? defaultTextColor,
    borderColor: options.borderColor ?? '#131722',
    gap: options.gap ?? 2,
    borderRadius: options.borderRadius ?? 3,
    animation: options.animation,
    onClick: options.onClick ?? (() => {}),
  };

  let dpr = window.devicePixelRatio || 1;
  let rects: LayoutRect[] = [];
  let animFrame = 0;
  let animStartTime = 0;
  let animating = false;

  function sizeCanvas(): void {
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(container.clientWidth * dpr);
    canvas.height = Math.round(container.clientHeight * dpr);
  }

  sizeCanvas();

  const ro = new ResizeObserver(() => {
    sizeCanvas();
    if (!animating) draw(Infinity);
  });
  ro.observe(container);

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * dpr;
    const cy = (e.clientY - rect.top) * dpr;
    for (const r of rects) {
      if (cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h) {
        opts.onClick(r.item);
        break;
      }
    }
  });

  function startAnimation(): void {
    const cfg = opts.animation;
    if (!cfg || (cfg.style !== 'fade' && cfg.style !== 'grow')) {
      animating = false;
      draw(Infinity);
      return;
    }
    if (animFrame) cancelAnimationFrame(animFrame);
    animStartTime = performance.now();
    animating = true;
    tick();
  }

  function tick(): void {
    animFrame = requestAnimationFrame(() => {
      animFrame = 0;
      const cfg = opts.animation!;
      const duration = cfg.duration ?? 500;
      const elapsed = performance.now() - animStartTime;
      const raw = Math.min(1, elapsed / duration);
      const prog = ease(raw, cfg.easing ?? 'easeOut');

      draw(prog < 1 ? prog : Infinity);

      if (prog >= 1) {
        animating = false;
        draw(Infinity);
      } else {
        tick();
      }
    });
  }

  function draw(animProgress: number): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    if (opts.background !== 'transparent') {
      ctx.fillStyle = opts.background;
      ctx.fillRect(0, 0, w, h);
    }

    const gap = opts.gap * dpr;
    const br = opts.borderRadius * dpr;
    rects = layoutTreemap(opts.data, 0, 0, w, h, gap);

    const cfg = opts.animation;
    const isAnimating = animProgress < 1 && cfg && (cfg.style === 'fade' || cfg.style === 'grow');

    for (const r of rects) {
      if (r.w < 1 || r.h < 1) continue;

      let drawX = r.x;
      let drawY = r.y;
      let drawW = r.w;
      let drawH = r.h;
      let alpha = 1;

      if (isAnimating) {
        const prog = animProgress;
        if (cfg!.style === 'grow') {
          const cx = r.x + r.w / 2;
          const cy = r.y + r.h / 2;
          drawW = r.w * prog;
          drawH = r.h * prog;
          drawX = cx - drawW / 2;
          drawY = cy - drawH / 2;
        } else {
          alpha = prog;
        }
      }

      const color = changeToColor(
        r.item.change,
        opts.maxChange,
        opts.positiveColor,
        opts.negativeColor,
        opts.neutralColor
      );

      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(drawX, drawY, drawW, drawH, br);
      ctx.fill();
      ctx.globalAlpha = 1;

      const showLabels = !isAnimating || animProgress >= 1;
      if (!showLabels) continue;

      ctx.fillStyle = opts.textColor;
      const minW = 40 * dpr;
      const minH = 28 * dpr;
      if (r.w >= minW && r.h >= minH) {
        const fontSize = Math.min(14 * dpr, r.w / 4, r.h / 3);
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const centerX = r.x + r.w / 2;
        let centerY = r.y + r.h / 2;
        const hasSub = r.h >= minH * 1.5;
        if (hasSub) centerY -= fontSize * 0.4;
        ctx.fillText(r.item.label, centerX, centerY, r.w - 8 * dpr);
        if (hasSub) {
          const subSize = fontSize * 0.7;
          ctx.font = `${subSize}px sans-serif`;
          const sign = r.item.change >= 0 ? '+' : '';
          ctx.fillText(
            `${sign}${r.item.change.toFixed(2)}%`,
            centerX,
            centerY + fontSize * 0.9,
            r.w - 8 * dpr
          );
        }
        if (r.item.sublabel && r.h >= minH * 2) {
          const subSize = fontSize * 0.55;
          ctx.font = `${subSize}px sans-serif`;
          ctx.globalAlpha = 0.7;
          ctx.fillText(
            r.item.sublabel,
            centerX,
            centerY + fontSize * 1.6,
            r.w - 8 * dpr
          );
          ctx.globalAlpha = 1;
        }
      } else if (r.w >= 20 * dpr && r.h >= 14 * dpr) {
        const fontSize = Math.min(9 * dpr, r.w / 3, r.h * 0.7);
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          r.item.label,
          r.x + r.w / 2,
          r.y + r.h / 2,
          r.w - 4 * dpr
        );
      }
    }
  }

  function applyOptions(newOpts: Partial<HeatmapOptions>): void {
    opts = { ...opts, ...newOpts };
    if (newOpts.background !== undefined) {
      const light = isLightBg(opts.background, container);
      if (newOpts.textColor === undefined) {
        opts.textColor = light ? '#334155' : '#e6edf3';
      }
      if (newOpts.neutralColor === undefined) {
        opts.neutralColor = light ? '#e2e8f0' : '#2a2e39';
      }
    }
  }

  if (opts.animation && (opts.animation.style === 'fade' || opts.animation.style === 'grow')) {
    startAnimation();
  } else {
    draw(Infinity);
  }

  return {
    setData(data: HeatmapItem[]) {
      opts.data = data;
      if (opts.animation && (opts.animation.style === 'fade' || opts.animation.style === 'grow')) {
        startAnimation();
      } else {
        draw(Infinity);
      }
    },
    setOptions(newOpts: Partial<HeatmapOptions>) {
      applyOptions(newOpts);
      if (opts.animation && (opts.animation.style === 'fade' || opts.animation.style === 'grow')) {
        startAnimation();
      } else {
        draw(Infinity);
      }
    },
    redraw: () => draw(Infinity),
    resize() {
      sizeCanvas();
      draw(Infinity);
    },
    dispose() {
      ro.disconnect();
      if (animFrame) cancelAnimationFrame(animFrame);
      canvas.remove();
    },
  };
}
