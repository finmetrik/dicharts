// ---------------------------------------------------------------------------
// DiCharts – Area Chart
// ---------------------------------------------------------------------------
// Feature-complete Canvas2D area chart supporting:
//   • Single or multi-series with filled areas
//   • Curve types: smooth (bezier), linear, step
//   • Stacked mode (absolute & expanded / percentage)
//   • Gradient fills (vertical fade to transparent)
//   • Data-point dots with hover enlargement
//   • Grid lines and axis labels (X & Y)
//   • Auto-generated legend
//   • Interactive hover highlighting with DOM tooltip
//   • Configurable entry animations (draw, fade, grow)
//   • Transparent / inherit background for themed containers
// ---------------------------------------------------------------------------

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AreaDataPoint {
  label: string;
  value: number;
}

export interface AreaSeriesConfig {
  name: string;
  data: number[];
  color?: string;
  fillOpacity?: number;
}

export interface AreaAnimationConfig {
  duration?: number;
  easing?: 'linear' | 'easeOut' | 'easeInOut' | 'spring';
  style?: 'draw' | 'fade' | 'grow' | 'none';
}

export interface AreaChartOptions {
  /** Simple single-series data. */
  data?: AreaDataPoint[];
  /** Multi-series data. Each series has a name and array of values aligned to labels. */
  series?: AreaSeriesConfig[];
  /** X-axis labels (required when using series mode). */
  labels?: string[];

  /** Curve interpolation. Default `'smooth'`. */
  curveType?: 'smooth' | 'linear' | 'step';
  /** Stack series on top of each other. Default false. */
  stacked?: boolean;
  /** Normalize stacked values to 100%. Default false. */
  stackedExpanded?: boolean;

  /** Fill opacity for the area. Default 0.3. */
  fillOpacity?: number;
  /** Use vertical gradient fill (color → transparent). Default false. */
  gradient?: boolean;
  /** Line width in CSS px. Default 2. */
  lineWidth?: number;

  /** Show data-point dots. Default false. */
  showDots?: boolean;
  /** Dot radius in CSS px. Default 4. */
  dotRadius?: number;

  /** Show X-axis labels. Default true. */
  showXAxis?: boolean;
  /** Show Y-axis labels. Default true. */
  showYAxis?: boolean;
  /** Show horizontal grid lines. Default true. */
  showGrid?: boolean;

  /** Show auto-generated legend (multi-series). Default true. */
  showLegend?: boolean;
  /** Show tooltip on hover. Default true. */
  showTooltip?: boolean;
  /** Enable hover highlighting. Default true. */
  interactive?: boolean;

  /** Custom value formatter for axis labels & tooltips. */
  formatValue?: (v: number) => string;

  /** Colour palette (cycled for multi-series). */
  colors?: string[];
  background?: string;
  textColor?: string;
  gridColor?: string;

  /** Entry animation. */
  animation?: boolean | AreaAnimationConfig;

  onClick?: (label: string, index: number) => void;
  onHover?: (label: string | null, index: number) => void;
}

export interface AreaChartInstance {
  setData(data: AreaDataPoint[]): void;
  setSeries(series: AreaSeriesConfig[]): void;
  setOptions(opts: Partial<AreaChartOptions>): void;
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

function resolveAnim(a?: boolean | AreaAnimationConfig): ResolvedAnim {
  if (a === false || a === undefined) return { enabled: false, duration: 0, easing: EASINGS.linear, style: 'none' };
  if (a === true) return { enabled: true, duration: 800, easing: EASINGS.easeOut, style: 'draw' };
  const style = a.style ?? 'draw';
  return {
    enabled: style !== 'none',
    duration: a.duration ?? 800,
    easing: EASINGS[a.easing ?? 'easeOut'] ?? EASINGS.easeOut,
    style,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function createAreaChart(
  container: HTMLElement,
  options: AreaChartOptions = {},
): AreaChartInstance {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width:100%;height:100%;display:block';
  container.appendChild(canvas);
  const ctx2d = canvas.getContext('2d')!;

  const cs = getComputedStyle(container);
  if (cs.position === 'static') container.style.position = 'relative';

  // ---- Resolved state ----
  let background = options.background ?? 'transparent';
  let _isLight = isLightBg(background, container);

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
  applyTipTheme(_isLight);
  container.appendChild(tip);

  let data: AreaDataPoint[] = options.data ?? [];
  let series: AreaSeriesConfig[] = options.series ?? [];
  let labels: string[] = options.labels ?? [];
  let curveType: string = options.curveType ?? 'smooth';
  let stacked = options.stacked ?? false;
  let stackedExpanded = options.stackedExpanded ?? false;
  let fillOpacity = options.fillOpacity ?? 0.3;
  let useGradient = options.gradient ?? false;
  let lineWidth = options.lineWidth ?? 2;
  let showDots = options.showDots ?? false;
  let dotRadius = options.dotRadius ?? 4;
  let showXAxis = options.showXAxis ?? true;
  let showYAxis = options.showYAxis ?? true;
  let showGrid = options.showGrid ?? true;
  let showLegend = options.showLegend ?? true;
  let showTooltip = options.showTooltip ?? true;
  let interactive = options.interactive ?? true;
  let fmtVal = options.formatValue ?? defaultFormatValue;
  let colors = options.colors ?? PALETTE;
  let textColor = options.textColor ?? (_isLight ? '#1e293b' : '#e6edf3');
  let gridColor = options.gridColor ?? (_isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.06)');
  let anim: ResolvedAnim = resolveAnim(options.animation);
  let onClick: AreaChartOptions['onClick'] = options.onClick ?? (() => {});
  let onHover: AreaChartOptions['onHover'] = options.onHover ?? (() => {});

  function applyOptions(o: AreaChartOptions) {
    if (o.data !== undefined) data = o.data;
    if (o.series !== undefined) series = o.series;
    if (o.labels !== undefined) labels = o.labels;
    if (o.curveType !== undefined) curveType = o.curveType;
    if (o.stacked !== undefined) stacked = o.stacked;
    if (o.stackedExpanded !== undefined) stackedExpanded = o.stackedExpanded;
    if (o.fillOpacity !== undefined) fillOpacity = o.fillOpacity;
    if (o.gradient !== undefined) useGradient = o.gradient;
    if (o.lineWidth !== undefined) lineWidth = o.lineWidth;
    if (o.showDots !== undefined) showDots = o.showDots;
    if (o.dotRadius !== undefined) dotRadius = o.dotRadius;
    if (o.showXAxis !== undefined) showXAxis = o.showXAxis;
    if (o.showYAxis !== undefined) showYAxis = o.showYAxis;
    if (o.showGrid !== undefined) showGrid = o.showGrid;
    if (o.showLegend !== undefined) showLegend = o.showLegend;
    if (o.showTooltip !== undefined) showTooltip = o.showTooltip;
    if (o.interactive !== undefined) interactive = o.interactive;
    if (o.formatValue !== undefined) fmtVal = o.formatValue;
    if (o.colors !== undefined) colors = o.colors;
    if (o.background !== undefined) {
      background = o.background;
      _isLight = isLightBg(background, container);
      applyTipTheme(_isLight);
      if (o.textColor === undefined) textColor = _isLight ? '#1e293b' : '#e6edf3';
      if (o.gridColor === undefined) gridColor = _isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.06)';
    }
    if (o.textColor !== undefined) textColor = o.textColor;
    if (o.gridColor !== undefined) gridColor = o.gridColor;
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
    if (animating) { /* animation loop will handle it */ } else { drawStatic(); }
  });
  ro.observe(container);

  // ---- Hover state ----
  let hoveredIdx = -1;

  // ---- Animation ----
  let animating = false;
  let animStart = 0;
  let animId = 0;

  function startAnimation() {
    animating = true;
    animStart = performance.now();
    const loop = (now: number) => {
      const elapsed = now - animStart;
      const prog = Math.min(elapsed / anim.duration, 1);
      const easedProg = anim.easing(prog);
      draw(easedProg);
      if (prog < 1) {
        animId = requestAnimationFrame(loop);
      } else {
        animating = false;
      }
    };
    animId = requestAnimationFrame(loop);
  }

  function drawStatic() {
    draw(Infinity);
  }

  // ---- Prepare data ----

  function getResolvedData(): { xlabels: string[]; seriesValues: number[][]; seriesNames: string[]; seriesColors: string[]; seriesFillOpacity: number[] } {
    if (series.length > 0) {
      const xlabels = labels.length > 0 ? labels : series[0].data.map((_, i) => `${i}`);
      return {
        xlabels,
        seriesValues: series.map((s) => s.data),
        seriesNames: series.map((s) => s.name),
        seriesColors: series.map((s, i) => s.color || colors[i % colors.length]),
        seriesFillOpacity: series.map((s) => s.fillOpacity ?? fillOpacity),
      };
    }
    return {
      xlabels: data.map((d) => d.label),
      seriesValues: [data.map((d) => d.value)],
      seriesNames: ['Value'],
      seriesColors: [colors[0]],
      seriesFillOpacity: [fillOpacity],
    };
  }

  function computeStacked(vals: number[][]): number[][] {
    const n = vals[0]?.length ?? 0;
    const result: number[][] = [];
    for (let si = 0; si < vals.length; si++) {
      result[si] = [];
      for (let i = 0; i < n; i++) {
        result[si][i] = (si > 0 ? result[si - 1][i] : 0) + (vals[si][i] ?? 0);
      }
    }
    return result;
  }

  function computeStackedExpanded(vals: number[][]): number[][] {
    const cumulative = computeStacked(vals);
    const n = vals[0]?.length ?? 0;
    const result: number[][] = [];
    for (let si = 0; si < cumulative.length; si++) {
      result[si] = [];
      for (let i = 0; i < n; i++) {
        const total = cumulative[cumulative.length - 1][i];
        result[si][i] = total > 0 ? (cumulative[si][i] / total) * 100 : 0;
      }
    }
    return result;
  }

  // ---- Drawing ----

  function draw(prog: number) {
    const ctx = ctx2d;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    if (background !== 'transparent') { ctx.fillStyle = background; ctx.fillRect(0, 0, w, h); }

    const { xlabels, seriesValues, seriesNames, seriesColors, seriesFillOpacity } = getResolvedData();
    const n = xlabels.length;
    if (n === 0) return;

    const numSeries = seriesValues.length;
    const showLeg = showLegend && numSeries > 1;

    // Margins
    const mLeft = showYAxis ? 50 * dpr : 16 * dpr;
    const mRight = 16 * dpr;
    const mTop = 16 * dpr;
    const legendH = showLeg ? 30 * dpr : 0;
    const mBottom = (showXAxis ? 28 * dpr : 8 * dpr) + legendH;
    const plotW = w - mLeft - mRight;
    const plotH = h - mTop - mBottom;
    if (plotW <= 0 || plotH <= 0) return;

    // Compute values to draw (handle stacking)
    let drawValues: number[][];
    if ((stacked || stackedExpanded) && numSeries > 1) {
      drawValues = stackedExpanded ? computeStackedExpanded(seriesValues) : computeStacked(seriesValues);
    } else {
      drawValues = seriesValues;
    }

    // Y range
    let yMin = 0;
    let yMax = 0;
    for (const sv of drawValues) {
      for (const v of sv) {
        if (v > yMax) yMax = v;
        if (v < yMin) yMin = v;
      }
    }
    if (stackedExpanded) { yMin = 0; yMax = 100; }
    if (yMax === yMin) { yMax = yMin + 1; }
    const yRange = yMax - yMin;
    const yPad = stackedExpanded ? 0 : yRange * 0.08;

    const toX = (i: number) => mLeft + (i / Math.max(n - 1, 1)) * plotW;
    const toY = (v: number) => mTop + plotH - ((v - yMin + yPad) / (yRange + yPad * 2)) * plotH;

    // ── Grid ──
    if (showGrid) {
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = dpr * (_isLight ? 0.8 : 0.5);
      const gridLines = 5;
      for (let i = 0; i <= gridLines; i++) {
        const v = yMin + (yRange / gridLines) * i;
        const y = toY(v);
        ctx.beginPath();
        ctx.moveTo(mLeft, y);
        ctx.lineTo(mLeft + plotW, y);
        ctx.stroke();
      }
    }

    // ── Y-axis labels ──
    if (showYAxis) {
      ctx.fillStyle = textColor;
      ctx.globalAlpha = _isLight ? 0.75 : 0.6;
      ctx.font = `${9 * dpr}px sans-serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const gridLines = 5;
      for (let i = 0; i <= gridLines; i++) {
        const v = yMin + (yRange / gridLines) * i;
        const display = stackedExpanded ? `${Math.round(v)}%` : fmtVal(v);
        ctx.fillText(display, mLeft - 6 * dpr, toY(v));
      }
      ctx.globalAlpha = 1;
    }

    // ── X-axis labels ──
    if (showXAxis) {
      ctx.fillStyle = textColor;
      ctx.globalAlpha = _isLight ? 0.85 : 0.7;
      ctx.font = `${9 * dpr}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const maxLabels = Math.floor(plotW / (40 * dpr));
      const step = Math.max(1, Math.ceil(n / maxLabels));
      for (let i = 0; i < n; i += step) {
        ctx.fillText(xlabels[i], toX(i), mTop + plotH + 8 * dpr);
      }
      ctx.globalAlpha = 1;
    }

    // ── Hover vertical line ──
    if (interactive && hoveredIdx >= 0 && hoveredIdx < n) {
      const hx = toX(hoveredIdx);
      ctx.strokeStyle = textColor;
      ctx.globalAlpha = _isLight ? 0.15 : 0.1;
      ctx.lineWidth = dpr;
      ctx.beginPath();
      ctx.moveTo(hx, mTop);
      ctx.lineTo(hx, mTop + plotH);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // ── Series (draw back to front for stacked) ──
    const drawOrder = (stacked || stackedExpanded) && numSeries > 1
      ? Array.from({ length: numSeries }, (_, i) => numSeries - 1 - i)
      : Array.from({ length: numSeries }, (_, i) => i);

    const animProg = prog === Infinity ? 1 : Math.max(0, Math.min(prog, 1));

    for (const si of drawOrder) {
      const vals = drawValues[si];
      const color = seriesColors[si];
      const sFillOpacity = seriesFillOpacity[si];

      // Build path points
      const points: { x: number; y: number }[] = [];
      for (let i = 0; i < n; i++) {
        points.push({ x: toX(i), y: toY(vals[i]) });
      }

      // Bottom of area (for stacked, previous series top; for non-stacked, y=0 line)
      const bottomPoints: { x: number; y: number }[] = [];
      if ((stacked || stackedExpanded) && si > 0) {
        const prevVals = drawValues[si - 1];
        for (let i = 0; i < n; i++) {
          bottomPoints.push({ x: toX(i), y: toY(prevVals[i]) });
        }
      } else {
        const baseY = toY(yMin);
        for (let i = 0; i < n; i++) {
          bottomPoints.push({ x: toX(i), y: baseY });
        }
      }

      // Apply animation
      let animPoints = points;
      let animBottom = bottomPoints;
      if (anim.style === 'draw' && animProg < 1) {
        const visibleCount = Math.max(1, Math.ceil(n * animProg));
        animPoints = points.slice(0, visibleCount);
        animBottom = bottomPoints.slice(0, visibleCount);
      } else if (anim.style === 'grow' && animProg < 1) {
        const baseY = toY(yMin);
        animPoints = points.map((p) => ({ x: p.x, y: baseY + (p.y - baseY) * animProg }));
        if ((stacked || stackedExpanded) && si > 0) {
          animBottom = bottomPoints.map((p) => ({ x: p.x, y: baseY + (p.y - baseY) * animProg }));
        }
      }

      const fadeAlpha = anim.style === 'fade' && animProg < 1 ? animProg : 1;

      // ── Fill area ──
      ctx.globalAlpha = fadeAlpha;
      ctx.beginPath();
      traceCurve(ctx, animPoints);

      // Close area: go back along bottom
      for (let i = animBottom.length - 1; i >= 0; i--) {
        ctx.lineTo(animBottom[i].x, animBottom[i].y);
      }
      ctx.closePath();

      if (useGradient) {
        const grad = ctx.createLinearGradient(0, mTop, 0, mTop + plotH);
        grad.addColorStop(0, colorWithAlpha(color, sFillOpacity * fadeAlpha));
        grad.addColorStop(1, colorWithAlpha(color, 0.01));
        ctx.fillStyle = grad;
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = color;
        ctx.globalAlpha = sFillOpacity * fadeAlpha;
      }
      ctx.fill();
      ctx.globalAlpha = 1;

      // ── Stroke line ──
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth * dpr;
      ctx.globalAlpha = fadeAlpha;
      ctx.beginPath();
      traceCurve(ctx, animPoints);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // ── Dots ──
      if (showDots && animProg > 0.5) {
        const dotAlpha = Math.min(1, (animProg - 0.5) * 2);
        for (let i = 0; i < animPoints.length; i++) {
          const isHovered = interactive && hoveredIdx === i;
          const r = (isHovered ? dotRadius * 1.6 : dotRadius) * dpr;
          ctx.fillStyle = color;
          ctx.globalAlpha = dotAlpha * fadeAlpha;
          ctx.beginPath();
          ctx.arc(animPoints[i].x, animPoints[i].y, r, 0, Math.PI * 2);
          ctx.fill();

          if (isHovered) {
            ctx.strokeStyle = _isLight ? '#fff' : '#fff';
            ctx.lineWidth = 2 * dpr;
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
      }
    }

    // ── Legend ──
    if (showLeg) {
      const legendTop = h - legendH + 4 * dpr;
      drawLegendBlock(ctx, seriesNames, seriesColors, w, legendTop);
    }
  }

  // ── Curve tracing ──

  function traceCurve(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[]) {
    if (pts.length === 0) return;

    if (curveType === 'step') {
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i - 1].y);
        ctx.lineTo(pts[i].x, pts[i].y);
      }
    } else if (curveType === 'linear') {
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
    } else {
      // Smooth (monotone cubic)
      ctx.moveTo(pts[0].x, pts[0].y);
      if (pts.length === 2) {
        ctx.lineTo(pts[1].x, pts[1].y);
      } else {
        for (let i = 0; i < pts.length - 1; i++) {
          const p0 = pts[Math.max(0, i - 1)];
          const p1 = pts[i];
          const p2 = pts[i + 1];
          const p3 = pts[Math.min(pts.length - 1, i + 2)];
          const cp1x = p1.x + (p2.x - p0.x) / 6;
          const cp1y = p1.y + (p2.y - p0.y) / 6;
          const cp2x = p2.x - (p3.x - p1.x) / 6;
          const cp2y = p2.y - (p3.y - p1.y) / 6;
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
        }
      }
    }
  }

  // ── Legend ──

  function drawLegendBlock(ctx: CanvasRenderingContext2D, names: string[], clrs: string[], w: number, legendTop: number) {
    const rowH = 20 * dpr;
    const colsPerRow = Math.min(names.length, 6);
    const itemW = Math.min(100 * dpr, (w - 24 * dpr) / colsPerRow);
    const totalLW = itemW * colsPerRow;
    const startX = (w - totalLW) / 2;

    ctx.font = `${9 * dpr}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < names.length && i < 12; i++) {
      const col = i % colsPerRow;
      const row = Math.floor(i / colsPerRow);
      const x = startX + col * itemW;
      const y = legendTop + row * rowH + rowH / 2;

      ctx.fillStyle = clrs[i];
      ctx.beginPath();
      ctx.roundRect(x, y - 4 * dpr, 10 * dpr, 8 * dpr, 2 * dpr);
      ctx.fill();

      ctx.fillStyle = textColor;
      ctx.globalAlpha = _isLight ? 0.95 : 0.85;
      ctx.fillText(names[i], x + 14 * dpr, y, itemW - 18 * dpr);
      ctx.globalAlpha = 1;
    }
  }

  // ── Hit testing ──

  function findHoveredIndex(mx: number): number {
    const { xlabels } = getResolvedData();
    const n = xlabels.length;
    if (n === 0) return -1;
    const mLeft_ = showYAxis ? 50 * dpr : 16 * dpr;
    const mRight_ = 16 * dpr;
    const plotW_ = canvas.width - mLeft_ - mRight_;
    const toX_ = (i: number) => mLeft_ + (i / Math.max(n - 1, 1)) * plotW_;
    const slotW = n > 1 ? plotW_ / (n - 1) : plotW_;

    let closestIdx = -1;
    let closestDist = Infinity;
    for (let i = 0; i < n; i++) {
      const dist = Math.abs(mx * dpr - toX_(i));
      if (dist < closestDist && dist < slotW * 0.6) {
        closestDist = dist;
        closestIdx = i;
      }
    }
    return closestIdx;
  }

  // ── Event handlers ──

  function onMouseMove(e: MouseEvent) {
    if (!interactive) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const idx = findHoveredIndex(mx);

    if (idx !== hoveredIdx) {
      hoveredIdx = idx;
      if (!animating) drawStatic();
      if (idx >= 0) {
        const { xlabels } = getResolvedData();
        onHover?.(xlabels[idx], idx);
      } else {
        onHover?.(null, -1);
      }
    }

    // Tooltip
    if (showTooltip && idx >= 0) {
      const { xlabels, seriesValues, seriesNames, seriesColors } = getResolvedData();
      let html = `<div style="font-weight:600;margin-bottom:3px">${xlabels[idx]}</div>`;
      for (let si = 0; si < seriesValues.length; si++) {
        const val = seriesValues[si][idx] ?? 0;
        const color = seriesColors[si];
        const name = seriesNames[si];
        html += `<div style="display:flex;align-items:center;gap:6px;margin-top:2px">`;
        html += `<span style="width:8px;height:8px;border-radius:50%;background:${color};display:inline-block"></span>`;
        html += `<span>${name}: <b>${fmtVal(val)}</b></span></div>`;
      }
      tip.innerHTML = html;
      tip.style.opacity = '1';
      const tipW = tip.offsetWidth;
      const tipH = tip.offsetHeight;
      let tx = mx + 12;
      let ty = my - tipH - 8;
      if (tx + tipW > rect.width) tx = mx - tipW - 12;
      if (ty < 0) ty = my + 12;
      tip.style.left = `${tx}px`;
      tip.style.top = `${ty}px`;
    } else {
      tip.style.opacity = '0';
    }
  }

  function onMouseLeave() {
    hoveredIdx = -1;
    tip.style.opacity = '0';
    if (!animating) drawStatic();
    onHover?.(null, -1);
  }

  function onCanvasClick(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const idx = findHoveredIndex(mx);
    if (idx >= 0) {
      const { xlabels } = getResolvedData();
      onClick?.(xlabels[idx], idx);
    }
  }

  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseleave', onMouseLeave);
  canvas.addEventListener('click', onCanvasClick);

  // ---- Initial draw ----
  if (anim.enabled) {
    startAnimation();
  } else {
    drawStatic();
  }

  // ---- Public API ----
  return {
    setData(d) {
      data = d;
      series = [];
      if (!animating) drawStatic();
    },
    setSeries(s) {
      series = s;
      data = [];
      if (!animating) drawStatic();
    },
    setOptions(o) {
      applyOptions(o);
      if (!animating) drawStatic();
    },
    redraw() { if (!animating) drawStatic(); },
    resize() { sizeCanvas(); if (!animating) drawStatic(); },
    dispose() {
      cancelAnimationFrame(animId);
      ro.disconnect();
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      canvas.removeEventListener('click', onCanvasClick);
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

function colorWithAlpha(hex: string, alpha: number): string {
  if (hex.startsWith('#')) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return hex;
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
