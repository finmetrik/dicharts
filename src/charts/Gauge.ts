export interface GaugeSegment {
  color: string;
  from: number;
  to: number;
}

export interface GaugeAnimationConfig {
  duration?: number;
  easing?: 'linear' | 'easeOut' | 'easeInOut';
}

export interface GaugeOptions {
  value?: number;
  min?: number;
  max?: number;
  label?: string;
  formatValue?: (v: number) => string;
  segments?: GaugeSegment[];
  trackColor?: string;
  needleColor?: string;
  background?: string;
  textColor?: string;
  thickness?: number;
  animation?: GaugeAnimationConfig;
}

export interface GaugeInstance {
  setValue(value: number): void;
  setOptions(opts: Partial<GaugeOptions>): void;
  redraw(): void;
  resize(): void;
  dispose(): void;
}

const DEFAULT_SEGMENTS: GaugeSegment[] = [
  { color: '#ef5350', from: 0, to: 25 },
  { color: '#ff9800', from: 25, to: 45 },
  { color: '#FFD700', from: 45, to: 55 },
  { color: '#8bc34a', from: 55, to: 75 },
  { color: '#26a69a', from: 75, to: 100 },
];

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
  if (type === 'easeInOut') return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  return t;
}

export function createGauge(container: HTMLElement, options: GaugeOptions = {}): GaugeInstance {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width:100%;height:100%;display:block;';
  container.appendChild(canvas);

  const cs = getComputedStyle(container);
  if (cs.position === 'static') container.style.position = 'relative';

  const bg = options.background ?? 'transparent';
  const light = isLightBg(bg, container);

  let opts = {
    value: options.value ?? 50,
    min: options.min ?? 0,
    max: options.max ?? 100,
    label: options.label ?? '',
    formatValue: options.formatValue ?? ((v: number) => v.toFixed(0)),
    segments: options.segments ?? DEFAULT_SEGMENTS,
    trackColor: options.trackColor ?? (light ? '#e2e8f0' : '#2a2e39'),
    needleColor: options.needleColor ?? (light ? '#334155' : '#e6edf3'),
    background: bg,
    textColor: options.textColor ?? (light ? '#334155' : '#e6edf3'),
    thickness: options.thickness ?? 0.18,
    animation: options.animation,
  };

  let dpr = window.devicePixelRatio || 1;
  let animFrame = 0;
  let animStartTime = 0;
  let animFromValue = opts.min;
  let animTargetValue = opts.value;

  function sizeCanvas() {
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(container.clientWidth * dpr);
    canvas.height = Math.round(container.clientHeight * dpr);
  }

  sizeCanvas();

  const ro = new ResizeObserver(() => {
    sizeCanvas();
    draw(1);
  });
  ro.observe(container);

  function draw(needleProgress: number = 1) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    if (opts.background !== 'transparent') {
      ctx.fillStyle = opts.background;
      ctx.fillRect(0, 0, w, h);
    }

    const range = opts.max - opts.min || 1;
    const minMaxFontSize = Math.max(8 * dpr, Math.min(10 * dpr, h * 0.04));
    ctx.font = `${minMaxFontSize}px sans-serif`;
    const minLabelW = ctx.measureText(String(opts.min)).width;
    const maxLabelW = ctx.measureText(String(opts.max)).width;
    const labelMargin = Math.max(minLabelW, maxLabelW) + 8 * dpr;
    const valueFontBase = Math.min(20 * dpr, h * 0.14);
    const labelFontSize = opts.label ? Math.max(9 * dpr, Math.min(11 * dpr, h * 0.06)) : 0;
    const textGap = 14 * dpr;
    const textBlockH = textGap + valueFontBase + (labelFontSize > 0 ? 4 * dpr + labelFontSize : 0);
    const maxRadiusW = (w - labelMargin * 2) / 2;
    const maxRadiusH = h - textBlockH;
    const radius = Math.min(maxRadiusW, maxRadiusH) * 0.82;
    const thick = radius * opts.thickness;
    const compositionH = radius + textBlockH;
    const topOffset = (h - compositionH) / 2;
    const cx = w / 2;
    const cy = topOffset + radius;
    const startAngle = Math.PI;
    const endAngle = 0;
    const toAngle = (v: number) => {
      const t = Math.max(0, Math.min(1, (v - opts.min) / range));
      return startAngle + t * Math.PI;
    };

    ctx.strokeStyle = opts.trackColor;
    ctx.lineWidth = thick;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.stroke();

    for (const seg of opts.segments) {
      const a0 = toAngle(Math.max(seg.from, opts.min));
      const a1 = toAngle(Math.min(seg.to, opts.max));
      if (a1 <= a0) continue;
      ctx.strokeStyle = seg.color;
      ctx.lineWidth = thick;
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.arc(cx, cy, radius, a0, a1);
      ctx.stroke();
    }

    ctx.lineCap = 'round';
    ctx.strokeStyle = opts.segments[0]?.color ?? opts.trackColor;
    ctx.lineWidth = thick;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, startAngle + 0.01);
    ctx.stroke();
    const lastSeg = opts.segments[opts.segments.length - 1];
    ctx.strokeStyle = lastSeg?.color ?? opts.trackColor;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, endAngle - 0.01, endAngle);
    ctx.stroke();

    ctx.font = `${minMaxFontSize}px sans-serif`;
    ctx.fillStyle = opts.textColor;
    ctx.globalAlpha = 0.5;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    ctx.fillText(String(opts.min), cx - radius, cy + 6 * dpr);
    ctx.fillText(String(opts.max), cx + radius, cy + 6 * dpr);
    ctx.globalAlpha = 1;

    const displayValue = animFromValue + (animTargetValue - animFromValue) * needleProgress;
    const needleAngle = toAngle(displayValue);
    const needleLen = radius - thick / 2 - 4 * dpr;
    const nx = cx + Math.cos(needleAngle) * needleLen;
    const ny = cy + Math.sin(needleAngle) * needleLen;
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 4 * dpr;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(nx + 2 * dpr, ny + 2 * dpr);
    ctx.stroke();
    ctx.strokeStyle = opts.needleColor;
    ctx.lineWidth = 2.5 * dpr;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(nx, ny);
    ctx.stroke();
    ctx.fillStyle = opts.needleColor;
    ctx.beginPath();
    ctx.arc(cx, cy, 4 * dpr, 0, Math.PI * 2);
    ctx.fill();

    const valueStr = opts.formatValue(animTargetValue);
    let finalValueFont = valueFontBase;
    ctx.font = `bold ${finalValueFont}px sans-serif`;
    const measured = ctx.measureText(valueStr).width;
    const maxTextW = w * 0.85;
    if (measured > maxTextW) {
      finalValueFont = finalValueFont * (maxTextW / measured);
    }
    ctx.fillStyle = opts.textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = `bold ${finalValueFont}px sans-serif`;
    const valueY = cy + textGap;
    ctx.fillText(valueStr, cx, valueY);

    if (opts.label) {
      ctx.font = `${labelFontSize}px sans-serif`;
      ctx.globalAlpha = 0.55;
      ctx.fillText(opts.label, cx, valueY + finalValueFont + 4 * dpr);
      ctx.globalAlpha = 1;
    }
  }

  function runAnimation() {
    const anim = opts.animation;
    if (!anim || (anim.duration ?? 800) <= 0) {
      animFromValue = animTargetValue;
      draw(1);
      return;
    }
    const duration = anim.duration ?? 800;
    const easingType = anim.easing ?? 'easeOut';
    if (animFrame) cancelAnimationFrame(animFrame);
    animStartTime = performance.now();

    function tick() {
      animFrame = requestAnimationFrame(() => {
        animFrame = 0;
        const elapsed = performance.now() - animStartTime;
        const t = Math.min(1, elapsed / duration);
        const prog = ease(t, easingType);
        draw(prog);
        if (t >= 1) animFromValue = animTargetValue;
        if (t < 1) tick();
      });
    }
    tick();
  }

  runAnimation();

  return {
    setValue(value: number) {
      animFromValue = opts.value;
      animTargetValue = value;
      opts.value = value;
      runAnimation();
    },
    setOptions(newOpts: Partial<GaugeOptions>) {
      opts = { ...opts, ...newOpts };
      if (newOpts.background !== undefined && newOpts.trackColor === undefined && newOpts.needleColor === undefined && newOpts.textColor === undefined) {
        const lightNew = isLightBg(opts.background, container);
        opts.trackColor = lightNew ? '#e2e8f0' : '#2a2e39';
        opts.needleColor = lightNew ? '#334155' : '#e6edf3';
        opts.textColor = lightNew ? '#334155' : '#e6edf3';
      }
      if (newOpts.value !== undefined) {
        animFromValue = opts.value;
        animTargetValue = newOpts.value;
      }
      runAnimation();
    },
    redraw: () => runAnimation(),
    resize() {
      sizeCanvas();
      runAnimation();
    },
    dispose() {
      ro.disconnect();
      if (animFrame) cancelAnimationFrame(animFrame);
      canvas.remove();
    },
  };
}
