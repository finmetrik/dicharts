// ---------------------------------------------------------------------------
// DiCharts – Radar / Spider Chart
// ---------------------------------------------------------------------------
// Feature-complete Canvas2D radar chart supporting:
//   • Polygon or circular grid
//   • Single or multi-series with configurable fill & stroke
//   • Data-point dots (configurable size)
//   • Lines-only mode (no fill)
//   • Custom axis label formatting
//   • Filled grid bands (alternating)
//   • Radius-axis value labels on spokes
//   • Auto-generated legend for multi-series
//   • Interactive hover highlighting with DOM tooltip
//   • Configurable entry animations (grow, fade)
//   • Transparent / inherit background
// ---------------------------------------------------------------------------

// ── Types ─────────────────────────────────────────────────────────────────────

/** Defines one axis (spoke) of the radar chart. */
export interface RadarAxis {
  key: string;
  label: string;
  /** Override the max value for this axis. When omitted the global max is used. */
  max?: number;
}

/** A named data series plotted on the radar chart. */
export interface RadarSeries {
  name: string;
  /** Values keyed by `RadarAxis.key`. Missing keys default to 0. */
  data: Record<string, number>;
  color?: string;
  /** Per-series fill opacity override (0-1). */
  fillOpacity?: number;
}

export interface RadarAnimationConfig {
  /** Duration in ms. Default 800. */
  duration?: number;
  /** Easing function. Default `'easeOut'`. */
  easing?: 'linear' | 'easeOut' | 'easeInOut' | 'spring';
  /** Animation style. Default `'grow'`. */
  style?: 'grow' | 'fade' | 'none';
}

export interface RadarChartOptions {
  /** Axes (spokes) of the radar. */
  axes?: RadarAxis[];
  /** One or more data series. */
  series?: RadarSeries[];

  /** Grid type. Default `'polygon'`. */
  gridType?: 'polygon' | 'circle';
  /** Number of concentric grid levels. Default 5. */
  gridLevels?: number;
  /** Fill alternating grid bands. Default false. */
  gridFilled?: boolean;

  /** Show data-point dots. Default false. */
  showDots?: boolean;
  /** Dot radius in CSS px. Default 4. */
  dotRadius?: number;
  /** Default fill opacity for series areas (0-1). Default 0.25. */
  fillOpacity?: number;
  /** Show area fill. Default true. */
  showFill?: boolean;
  /** Show series stroke lines. Default true. */
  showLines?: boolean;
  /** Stroke width in CSS px. Default 2. */
  lineWidth?: number;

  /** Show axis labels around the perimeter. Default true. */
  showAxisLabels?: boolean;
  /** Custom axis-label formatter. */
  formatLabel?: (axis: RadarAxis, index: number) => string;
  /** Show value labels along the first spoke. Default false. */
  showValueLabels?: boolean;
  /** Custom value formatter. */
  formatValue?: (v: number) => string;

  /** Show legend for multi-series. Default true. */
  showLegend?: boolean;
  /** Show DOM tooltip on hover. Default false. */
  showTooltip?: boolean;
  /** Interactive hover highlighting. Default false. */
  interactive?: boolean;

  background?: string;
  textColor?: string;
  gridColor?: string;
  colors?: string[];

  /** Entry animation. */
  animation?: boolean | RadarAnimationConfig;

  onClick?: (series: RadarSeries, axisKey: string, value: number) => void;
  onHover?: (series: RadarSeries | null, axisKey: string | null) => void;
}

export interface RadarChartInstance {
  setSeries(series: RadarSeries[]): void;
  setAxes(axes: RadarAxis[]): void;
  setOptions(opts: Partial<RadarChartOptions>): void;
  redraw(): void;
  resize(): void;
  dispose(): void;
}

// ── Constants & helpers ───────────────────────────────────────────────────────

const PALETTE = [
  '#2962ff', '#26a69a', '#ef5350', '#FFD700', '#A78BFA',
  '#F472B6', '#4ECDC4', '#FF6B6B', '#38bdf8', '#fb923c',
  '#a3e635', '#e879f9',
];

const EASINGS: Record<string, (t: number) => number> = {
  linear: (t) => t,
  easeOut: (t) => 1 - Math.pow(1 - t, 3),
  easeInOut: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  spring: (t) => 1 - Math.exp(-6 * t) * Math.cos(6.5 * t),
};

interface ResolvedAnim {
  enabled: boolean;
  duration: number;
  easing: (t: number) => number;
  style: string;
}

function resolveAnim(raw?: boolean | RadarAnimationConfig): ResolvedAnim {
  if (!raw) return { enabled: false, duration: 0, easing: EASINGS.linear, style: 'none' };
  const cfg = raw === true ? {} : raw;
  return {
    enabled: (cfg.style ?? 'grow') !== 'none',
    duration: cfg.duration ?? 800,
    easing: EASINGS[cfg.easing ?? 'easeOut'] ?? EASINGS.easeOut,
    style: cfg.style ?? 'grow',
  };
}

// ── Main factory ──────────────────────────────────────────────────────────────

export function createRadarChart(
  container: HTMLElement,
  options: RadarChartOptions = {},
): RadarChartInstance {
  // ---- Canvas ----
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width:100%;height:100%;display:block;cursor:pointer;';
  container.appendChild(canvas);

  const cs = getComputedStyle(container);
  if (cs.position === 'static') container.style.position = 'relative';

  // ---- Resolved state ----
  let background = options.background ?? 'transparent';
  let isLightBg = isLightBackground(background, container);

  // ---- Tooltip ----
  const tip = document.createElement('div');
  function applyTipTheme(light: boolean) {
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
  applyTipTheme(isLightBg);
  container.appendChild(tip);
  let axes: RadarAxis[] = options.axes ?? [];
  let series: RadarSeries[] = options.series ?? [];
  let gridType: string = options.gridType ?? 'polygon';
  let gridLevels = options.gridLevels ?? 5;
  let gridFilled = options.gridFilled ?? false;
  let showDots = options.showDots ?? false;
  let dotRadius = options.dotRadius ?? 4;
  let fillOpacity = options.fillOpacity ?? 0.25;
  let showFill = options.showFill ?? true;
  let showLines = options.showLines ?? true;
  let lineWidth = options.lineWidth ?? 2;
  let showAxisLabels = options.showAxisLabels ?? true;
  let formatLabel = options.formatLabel ?? null;
  let showValueLabels = options.showValueLabels ?? false;
  let fmtVal = options.formatValue ?? defaultFormatValue;
  let showLegend = options.showLegend ?? true;
  let showTooltip = options.showTooltip ?? false;
  let interactive = options.interactive ?? false;
  let textColor = options.textColor ?? (isLightBg ? '#1e293b' : '#e6edf3');
  let gridColor = options.gridColor ?? (isLightBg ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.12)');
  let colors = options.colors ?? PALETTE;
  let anim: ResolvedAnim = resolveAnim(options.animation);
  let onClick: RadarChartOptions['onClick'] = options.onClick ?? (() => {});
  let onHover: RadarChartOptions['onHover'] = options.onHover ?? (() => {});

  function applyOptions(o: RadarChartOptions) {
    if (o.axes !== undefined) axes = o.axes;
    if (o.series !== undefined) series = o.series;
    if (o.gridType !== undefined) gridType = o.gridType;
    if (o.gridLevels !== undefined) gridLevels = o.gridLevels;
    if (o.gridFilled !== undefined) gridFilled = o.gridFilled;
    if (o.showDots !== undefined) showDots = o.showDots;
    if (o.dotRadius !== undefined) dotRadius = o.dotRadius;
    if (o.fillOpacity !== undefined) fillOpacity = o.fillOpacity;
    if (o.showFill !== undefined) showFill = o.showFill;
    if (o.showLines !== undefined) showLines = o.showLines;
    if (o.lineWidth !== undefined) lineWidth = o.lineWidth;
    if (o.showAxisLabels !== undefined) showAxisLabels = o.showAxisLabels;
    if (o.formatLabel !== undefined) formatLabel = o.formatLabel;
    if (o.showValueLabels !== undefined) showValueLabels = o.showValueLabels;
    if (o.formatValue !== undefined) fmtVal = o.formatValue;
    if (o.showLegend !== undefined) showLegend = o.showLegend;
    if (o.showTooltip !== undefined) showTooltip = o.showTooltip;
    if (o.interactive !== undefined) interactive = o.interactive;
    if (o.background !== undefined) {
      background = o.background;
      isLightBg = isLightBackground(background, container);
      applyTipTheme(isLightBg);
      if (o.textColor === undefined) textColor = isLightBg ? '#1e293b' : '#e6edf3';
      if (o.gridColor === undefined) gridColor = isLightBg ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.12)';
    }
    if (o.textColor !== undefined) textColor = o.textColor;
    if (o.gridColor !== undefined) gridColor = o.gridColor;
    if (o.colors !== undefined) colors = o.colors;
    if (o.animation !== undefined) anim = resolveAnim(o.animation);
    if (o.onClick !== undefined) onClick = o.onClick;
    if (o.onHover !== undefined) onHover = o.onHover;
  }

  // ---- Canvas sizing ----
  let dpr = window.devicePixelRatio || 1;

  function sizeCanvas() {
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(container.clientWidth * dpr);
    canvas.height = Math.round(container.clientHeight * dpr);
  }

  sizeCanvas();

  const ro = new ResizeObserver(() => {
    sizeCanvas();
    if (animating) { /* let the animation loop handle it */ } else { drawStatic(); }
  });
  ro.observe(container);

  // ---- Internal state ----
  let animFrame = 0;
  let animStartTime = 0;
  let animating = false;
  let hoveredSeriesIdx = -1;
  let hoveredAxisIdx = -1;

  // Cached geometry
  let cx = 0, cy = 0, radius = 0;

  // ---- Animation ----
  function startAnimation() {
    if (!anim.enabled) { animating = false; drawStatic(); return; }
    if (animFrame) cancelAnimationFrame(animFrame);
    animStartTime = performance.now();
    animating = true;
    tick();
  }

  function drawStatic() {
    animating = false;
    draw(Infinity);
  }

  function tick() {
    animFrame = requestAnimationFrame(() => {
      animFrame = 0;
      const elapsed = performance.now() - animStartTime;
      const done = elapsed >= anim.duration;
      draw(elapsed);
      if (done) { animating = false; draw(Infinity); } else { tick(); }
    });
  }

  function progress(elapsed: number): number {
    if (!anim.enabled || elapsed === Infinity) return 1;
    const raw = Math.min(1, elapsed / anim.duration);
    return anim.easing(raw);
  }

  // ---- Hit testing ----
  function hitTestSeries(mx: number, my: number): { si: number; ai: number } {
    if (axes.length === 0 || series.length === 0) return { si: -1, ai: -1 };
    const n = axes.length;
    const globalMax = getGlobalMax();
    let bestDist = Infinity;
    let bestSi = -1, bestAi = -1;
    const hitR = 12 * dpr;

    for (let si = 0; si < series.length; si++) {
      const s = series[si];
      for (let ai = 0; ai < n; ai++) {
        const axisMax = axes[ai].max ?? globalMax;
        const val = s.data[axes[ai].key] ?? 0;
        const r = axisMax > 0 ? (val / axisMax) * radius : 0;
        const angle = angleFor(ai, n);
        const px = cx + Math.cos(angle) * r;
        const py = cy + Math.sin(angle) * r;
        const dx = mx - px, dy = my - py;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < hitR && dist < bestDist) {
          bestDist = dist;
          bestSi = si;
          bestAi = ai;
        }
      }
    }
    return { si: bestSi, ai: bestAi };
  }

  // ---- Mouse events ----
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * dpr;
    const my = (e.clientY - rect.top) * dpr;
    const { si, ai } = hitTestSeries(mx, my);

    if (si !== hoveredSeriesIdx || ai !== hoveredAxisIdx) {
      hoveredSeriesIdx = si;
      hoveredAxisIdx = ai;
      if (!animating) draw(Infinity);

      if (si >= 0 && ai >= 0) {
        onHover!(series[si], axes[ai].key);
        if (showTooltip) positionTooltip(si, ai, e.clientX - container.getBoundingClientRect().left, e.clientY - container.getBoundingClientRect().top);
      } else {
        onHover!(null, null);
        hideTip();
      }
    }
  });

  canvas.addEventListener('mouseleave', () => {
    if (hoveredSeriesIdx !== -1 || hoveredAxisIdx !== -1) {
      hoveredSeriesIdx = -1;
      hoveredAxisIdx = -1;
      onHover!(null, null);
      hideTip();
      if (!animating) draw(Infinity);
    }
  });

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * dpr;
    const my = (e.clientY - rect.top) * dpr;
    const { si, ai } = hitTestSeries(mx, my);
    if (si >= 0 && ai >= 0) {
      const s = series[si];
      onClick!(s, axes[ai].key, s.data[axes[ai].key] ?? 0);
    }
  });

  // ---- Tooltip ----
  function positionTooltip(si: number, ai: number, clientX: number, clientY: number) {
    const s = series[si];
    const axis = axes[ai];
    const val = s.data[axis.key] ?? 0;
    const color = s.color || colors[si % colors.length];

    let html = `<div style="font-weight:600;margin-bottom:2px;color:#f8fafc">${axis.label}</div>`;
    html += `<div style="display:flex;align-items:center;gap:6px">`;
    html += `<span style="width:8px;height:8px;border-radius:2px;background:${color};flex-shrink:0"></span>`;
    html += `<span>${s.name}</span>`;
    html += `<span style="margin-left:auto;padding-left:12px;font-variant-numeric:tabular-nums">${fmtVal(val)}</span></div>`;

    tip.innerHTML = html;
    tip.style.opacity = '1';

    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    const cw = container.clientWidth;
    let left = clientX - tw / 2;
    let top = clientY - th - 12;
    if (left < 4) left = 4;
    if (left + tw > cw - 4) left = cw - tw - 4;
    if (top < 4) top = clientY + 16;
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }

  function hideTip() { tip.style.opacity = '0'; }

  // ── Geometry helpers ───────────────────────────────────────────────────────

  function angleFor(axisIdx: number, total: number): number {
    return -Math.PI / 2 + (2 * Math.PI / total) * axisIdx;
  }

  function getGlobalMax(): number {
    let m = 0;
    for (const s of series) {
      for (const a of axes) {
        const v = s.data[a.key] ?? 0;
        if (v > m) m = v;
      }
    }
    return m || 1;
  }

  // ── Drawing ─────────────────────────────────────────────────────────────────

  function draw(elapsed: number) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    if (background !== 'transparent') { ctx.fillStyle = background; ctx.fillRect(0, 0, w, h); }

    if (axes.length < 3 || series.length === 0) return;

    const n = axes.length;
    const prog = progress(elapsed);

    // ---- Layout ----
    const legendRowH = 20 * dpr;
    const numSeries = series.length;
    const legendRows = (showLegend && numSeries > 1) ? Math.ceil(Math.min(numSeries, 12) / 6) : 0;
    const legendGap = legendRows > 0 ? 8 * dpr : 0;
    const legendBlockH = legendRows * legendRowH;
    const labelPad = showAxisLabels ? 50 * dpr : 12 * dpr;

    const availW = w - labelPad * 2;
    const availH = h - labelPad * 2 - legendGap - legendBlockH;
    radius = Math.max(Math.min(availW, availH) / 2, 20);

    const compositionH = radius * 2 + legendGap + legendBlockH;
    const topOffset = (h - compositionH) / 2;

    cx = w / 2;
    cy = topOffset + radius;

    const globalMax = getGlobalMax();

    // ---- Grid ----
    drawGrid(ctx, n, globalMax, prog);

    // ---- Series areas ----
    for (let si = 0; si < numSeries; si++) {
      drawSeries(ctx, si, n, globalMax, prog);
    }

    // ---- Axis labels ----
    if (showAxisLabels && elapsed === Infinity) {
      drawAxisLabels(ctx, n);
    }

    // ---- Value labels ----
    if (showValueLabels && elapsed === Infinity) {
      drawValueLabels(ctx, globalMax);
    }

    // ---- Legend ----
    if (showLegend && numSeries > 1 && elapsed === Infinity) {
      const legendTop = topOffset + radius * 2 + legendGap;
      drawLegendBlock(ctx, legendTop, w);
    }
  }

  // ── Grid ───────────────────────────────────────────────────────────────────

  function drawGrid(ctx: CanvasRenderingContext2D, n: number, _globalMax: number, prog: number) {
    for (let level = gridLevels; level >= 1; level--) {
      const r = (radius * level / gridLevels) * prog;

      // Filled grid bands (alternating)
      if (gridFilled && level % 2 === 0) {
        const rOuter = r;
        const rInner = (radius * (level - 1) / gridLevels) * prog;
        ctx.fillStyle = gridColor;
        ctx.globalAlpha = isLightBg ? 0.7 : 0.5;

        if (gridType === 'circle') {
          ctx.beginPath();
          ctx.arc(cx, cy, rOuter, 0, Math.PI * 2);
          ctx.arc(cx, cy, rInner, Math.PI * 2, 0, true);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.beginPath();
          for (let i = 0; i < n; i++) {
            const a = angleFor(i, n);
            const px = cx + Math.cos(a) * rOuter;
            const py = cy + Math.sin(a) * rOuter;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          ctx.closePath();
          for (let i = n - 1; i >= 0; i--) {
            const a = angleFor(i, n);
            const px = cx + Math.cos(a) * rInner;
            const py = cy + Math.sin(a) * rInner;
            ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // Grid ring outline
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = dpr * (isLightBg ? 0.8 : 0.5);
      ctx.globalAlpha = isLightBg ? 1 : 0.6;

      if (gridType === 'circle') {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const a = angleFor(i, n);
          const px = cx + Math.cos(a) * r;
          const py = cy + Math.sin(a) * r;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Spokes
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = dpr * (isLightBg ? 0.8 : 0.5);
    ctx.globalAlpha = isLightBg ? 0.8 : 0.4;
    const spokeR = radius * prog;
    for (let i = 0; i < n; i++) {
      const a = angleFor(i, n);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * spokeR, cy + Math.sin(a) * spokeR);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // ── Series ─────────────────────────────────────────────────────────────────

  function drawSeries(ctx: CanvasRenderingContext2D, si: number, n: number, globalMax: number, prog: number) {
    const s = series[si];
    const color = s.color || colors[si % colors.length];
    const seriesFillOpacity = s.fillOpacity ?? fillOpacity;
    const isHovered = hoveredSeriesIdx === si;
    const anyHovered = hoveredSeriesIdx >= 0;

    // Compute points
    const points: { x: number; y: number }[] = [];
    for (let ai = 0; ai < n; ai++) {
      const axisMax = axes[ai].max ?? globalMax;
      const val = s.data[axes[ai].key] ?? 0;
      const ratio = axisMax > 0 ? val / axisMax : 0;
      const r = ratio * radius * prog;
      const angle = angleFor(ai, n);
      points.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
    }

    // Alpha for interactive mode
    let alpha = 1;
    if (interactive && anyHovered && !isHovered) alpha = 0.15;

    // Fill
    if (showFill) {
      ctx.beginPath();
      for (let i = 0; i < points.length; i++) {
        i === 0 ? ctx.moveTo(points[i].x, points[i].y) : ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.globalAlpha = seriesFillOpacity * alpha * (anim.style === 'fade' ? prog : 1);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Stroke
    if (showLines) {
      ctx.beginPath();
      for (let i = 0; i < points.length; i++) {
        i === 0 ? ctx.moveTo(points[i].x, points[i].y) : ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.closePath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth * dpr;
      ctx.globalAlpha = alpha * (anim.style === 'fade' ? prog : 1);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Dots
    if (showDots) {
      const r = dotRadius * dpr;
      for (let i = 0; i < points.length; i++) {
        const isDotHovered = isHovered && hoveredAxisIdx === i;
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha * (anim.style === 'fade' ? prog : 1);
        ctx.beginPath();
        ctx.arc(points[i].x, points[i].y, isDotHovered ? r * 1.5 : r, 0, Math.PI * 2);
        ctx.fill();

        // Ring on hover (adapts to background)
        if (isDotHovered) {
          ctx.strokeStyle = isLightBg ? '#fff' : '#fff';
          ctx.lineWidth = 2 * dpr;
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    }
  }

  // ── Axis labels ────────────────────────────────────────────────────────────

  function drawAxisLabels(ctx: CanvasRenderingContext2D, n: number) {
    const labelR = radius + 14 * dpr;
    ctx.fillStyle = textColor;
    ctx.globalAlpha = isLightBg ? 0.9 : 0.75;
    const fontSize = Math.max(9 * dpr, Math.min(11 * dpr, radius * 0.1));
    ctx.font = `${fontSize}px sans-serif`;

    for (let i = 0; i < n; i++) {
      const angle = angleFor(i, n);
      const lx = cx + Math.cos(angle) * labelR;
      const ly = cy + Math.sin(angle) * labelR;

      const text = formatLabel ? formatLabel(axes[i], i) : axes[i].label;

      // Adaptive alignment based on angle
      const cos = Math.cos(angle);
      if (Math.abs(cos) < 0.15) {
        ctx.textAlign = 'center';
      } else if (cos > 0) {
        ctx.textAlign = 'left';
      } else {
        ctx.textAlign = 'right';
      }

      const sin = Math.sin(angle);
      if (sin < -0.7) {
        ctx.textBaseline = 'bottom';
      } else if (sin > 0.7) {
        ctx.textBaseline = 'top';
      } else {
        ctx.textBaseline = 'middle';
      }

      ctx.fillText(text, lx, ly);
    }
    ctx.globalAlpha = 1;
  }

  // ── Value labels (radius axis) ─────────────────────────────────────────────

  function drawValueLabels(ctx: CanvasRenderingContext2D, globalMax: number) {
    const fontSize = Math.max(8 * dpr, radius * 0.07);
    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillStyle = textColor;
    ctx.globalAlpha = isLightBg ? 0.65 : 0.45;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';

    // Place value labels along the first spoke (straight up)
    const angle = angleFor(0, axes.length);

    for (let level = 1; level <= gridLevels; level++) {
      const r = radius * level / gridLevels;
      const val = (globalMax * level / gridLevels);
      const lx = cx + Math.cos(angle) * r + 4 * dpr;
      const ly = cy + Math.sin(angle) * r - 2 * dpr;
      ctx.fillText(fmtVal(val), lx, ly);
    }

    ctx.globalAlpha = 1;
  }

  // ── Legend ──────────────────────────────────────────────────────────────────

  function drawLegendBlock(ctx: CanvasRenderingContext2D, legendTop: number, w: number) {
    const rowH = 20 * dpr;
    const colsPerRow = Math.min(series.length, 6);
    const itemW = Math.min(100 * dpr, (w - 24 * dpr) / colsPerRow);
    const totalLW = itemW * colsPerRow;
    const startX = (w - totalLW) / 2;

    ctx.font = `${9 * dpr}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < series.length && i < 12; i++) {
      const col = i % colsPerRow;
      const row = Math.floor(i / colsPerRow);
      const x = startX + col * itemW;
      const y = legendTop + row * rowH + rowH / 2;
      const color = series[i].color || colors[i % colors.length];

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, y - 4 * dpr, 10 * dpr, 8 * dpr, 2 * dpr);
      ctx.fill();

      ctx.fillStyle = textColor;
      ctx.globalAlpha = 0.85;
      ctx.fillText(series[i].name, x + 14 * dpr, y, itemW - 18 * dpr);
      ctx.globalAlpha = 1;
    }
  }

  // ---- Initial draw ----
  if (anim.enabled) {
    startAnimation();
  } else {
    drawStatic();
  }

  // ---- Public API ----
  return {
    setSeries(s) {
      series = s;
      if (anim.enabled) startAnimation(); else drawStatic();
    },
    setAxes(a) {
      axes = a;
      if (anim.enabled) startAnimation(); else drawStatic();
    },
    setOptions(o) {
      const dataChanged = o.series !== undefined || o.axes !== undefined;
      applyOptions(o);
      if (dataChanged && anim.enabled) startAnimation(); else drawStatic();
    },
    redraw: () => drawStatic(),
    resize() { sizeCanvas(); drawStatic(); },
    dispose() {
      ro.disconnect();
      if (animFrame) cancelAnimationFrame(animFrame);
      canvas.remove();
      tip.remove();
    },
  };
}

// ── Utility ───────────────────────────────────────────────────────────────────

function defaultFormatValue(v: number): string {
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v % 1 === 0 ? `${v}` : v.toFixed(1);
}

function isLightBackground(bg: string, el?: HTMLElement): boolean {
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
