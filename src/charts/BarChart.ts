// ---------------------------------------------------------------------------
// DiCharts – Bar Chart (Enhanced)
// ---------------------------------------------------------------------------
// Feature-complete Canvas2D bar chart supporting multiple display modes:
//   • Vertical / Horizontal orientation
//   • Simple or multi-series (grouped / stacked)
//   • Per-bar colours & custom colour scales
//   • Interactive hover highlighting with DOM tooltip
//   • Configurable entry animations (grow, fadeGrow, slide)
//   • Transparent / inherit background for themed containers
//   • Custom label positioning and value formatting
//   • Auto-generated legend for series mode
//   • Negative value support with zero-line
// ---------------------------------------------------------------------------

// ── Types ─────────────────────────────────────────────────────────────────────

/** Single-value data point (simple mode). */
export interface BarDataPoint {
  label: string;
  value: number;
  color?: string;
}

/** Multi-value data point for grouped / stacked series mode. */
export interface BarSeriesDataPoint {
  label: string;
  values: { [seriesKey: string]: number };
  colors?: { [seriesKey: string]: string };
}

export interface BarAnimationConfig {
  /** Duration per bar in ms. Default 600. */
  duration?: number;
  /** Easing function. Default `'easeOut'`. */
  easing?: 'linear' | 'easeOut' | 'easeInOut' | 'spring';
  /** Stagger delay between bars in ms. Default 30. */
  delay?: number;
  /** Animation style. Default `'grow'`. */
  style?: 'grow' | 'fadeGrow' | 'slide' | 'none';
}

export interface BarChartOptions {
  /** Simple data (one value per bar). */
  data?: BarDataPoint[];
  /** Series data (multiple named values per label). Takes precedence over `data`. */
  seriesData?: BarSeriesDataPoint[];

  /** Bar orientation. Default `'vertical'`. */
  orientation?: 'vertical' | 'horizontal';
  /** Render series as stacked instead of grouped. Default false. */
  stacked?: boolean;

  /** Auto-colour positive green, negative red (simple mode). Default true. */
  autoColor?: boolean;
  positiveColor?: string;
  negativeColor?: string;
  /** Default bar colour when autoColor is false and no per-bar colour. */
  barColor?: string;
  /**
   * Background colour. Set to `'transparent'` to skip fillRect and use
   * clearRect only — inherits the parent container's background.
   */
  background?: string;
  textColor?: string;
  gridColor?: string;

  /** Gap between bars as fraction of slot width (0–1). Default 0.3. */
  gap?: number;
  /** Border radius on bars in CSS px. Default 3. */
  borderRadius?: number;

  /** Show value labels on bars. Default true. */
  showValues?: boolean;
  /** Show category-axis labels. Default true. */
  showLabels?: boolean;
  /** Show auto-generated legend (series mode). Default true. */
  showLegend?: boolean;
  /** Show grid lines. Default true. */
  showGrid?: boolean;
  /** Show tooltip on hover. Default true. */
  showTooltip?: boolean;

  /** Label position relative to bar. Default `'outside'`. */
  labelPosition?: 'outside' | 'inside' | 'none';
  /** Custom value formatter for labels and tooltips. */
  formatValue?: (value: number) => string;

  /** Enable hover highlighting (dim non-hovered bars). Default true. */
  interactive?: boolean;
  /** Programmatic active bar index (-1 for none). */
  activeIndex?: number;

  /** Entry animation config. Pass `true` for defaults, `false`/omit to disable. */
  animation?: boolean | BarAnimationConfig;

  /** Click callback. */
  onClick?: (item: BarDataPoint, index: number) => void;
  /** Hover callback — null when mouse leaves. */
  onHover?: (item: BarDataPoint | null, index: number) => void;
}

export interface BarChartInstance {
  setData(data: BarDataPoint[]): void;
  setSeriesData(data: BarSeriesDataPoint[]): void;
  setOptions(opts: Partial<BarChartOptions>): void;
  setActiveIndex(index: number | null): void;
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

interface HitRect {
  x: number; y: number; w: number; h: number;
  catIdx: number;
  seriesIdx: number;
  label: string;
  value: number;
  color: string;
  seriesKey: string;
}

interface ResolvedAnim {
  enabled: boolean;
  duration: number;
  easing: (t: number) => number;
  delay: number;
  style: string;
}

function resolveAnim(raw?: boolean | BarAnimationConfig): ResolvedAnim {
  if (!raw) return { enabled: false, duration: 0, easing: EASINGS.linear, delay: 0, style: 'none' };
  const cfg = raw === true ? {} : raw;
  return {
    enabled: (cfg.style ?? 'grow') !== 'none',
    duration: cfg.duration ?? 600,
    easing: EASINGS[cfg.easing ?? 'easeOut'] ?? EASINGS.easeOut,
    delay: cfg.delay ?? 30,
    style: cfg.style ?? 'grow',
  };
}

// ── Main factory ──────────────────────────────────────────────────────────────

export function createBarChart(
  container: HTMLElement,
  options: BarChartOptions = {},
): BarChartInstance {
  // ---- Canvas ----
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width:100%;height:100%;display:block;cursor:pointer;';
  container.appendChild(canvas);

  const cs = getComputedStyle(container);
  if (cs.position === 'static') container.style.position = 'relative';

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
  container.appendChild(tip);

  // ---- Resolved state ----
  const fmtDefault = formatNum;

  let data: BarDataPoint[] = options.data ?? [];
  let seriesData: BarSeriesDataPoint[] = options.seriesData ?? [];
  let orientation: 'vertical' | 'horizontal' = options.orientation ?? 'vertical';
  let stacked = options.stacked ?? false;
  let autoColor = options.autoColor ?? true;
  let positiveColor = options.positiveColor ?? '#26a69a';
  let negativeColor = options.negativeColor ?? '#ef5350';
  let barColor = options.barColor ?? '#2962ff';
  let background = options.background ?? 'transparent';
  let _isLight = isLightBg(background, container);
  let textColor = options.textColor ?? (_isLight ? '#1e293b' : '#e6edf3');
  let gridColor = options.gridColor ?? (_isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.06)');
  applyTipTheme(_isLight);
  let gap = options.gap ?? 0.3;
  let borderRadius = options.borderRadius ?? 3;
  let showValues = options.showValues ?? true;
  let showLabels = options.showLabels ?? true;
  let showLegend = options.showLegend ?? true;
  let showGrid = options.showGrid ?? true;
  let showTooltip = options.showTooltip ?? true;
  let labelPosition: string = options.labelPosition ?? 'outside';
  let fmtVal = options.formatValue ?? fmtDefault;
  let interactive = options.interactive ?? true;
  let activeIdx = options.activeIndex ?? -1;
  let anim: ResolvedAnim = resolveAnim(options.animation);
  let onClick = options.onClick ?? (() => {});
  let onHover: (item: BarDataPoint | null, index: number) => void = options.onHover ?? (() => {});

  function applyOptions(o: BarChartOptions) {
    if (o.data !== undefined) data = o.data;
    if (o.seriesData !== undefined) seriesData = o.seriesData;
    if (o.orientation !== undefined) orientation = o.orientation;
    if (o.stacked !== undefined) stacked = o.stacked;
    if (o.autoColor !== undefined) autoColor = o.autoColor;
    if (o.positiveColor !== undefined) positiveColor = o.positiveColor;
    if (o.negativeColor !== undefined) negativeColor = o.negativeColor;
    if (o.barColor !== undefined) barColor = o.barColor;
    if (o.background !== undefined) {
      background = o.background;
      _isLight = isLightBg(background, container);
      applyTipTheme(_isLight);
      if (o.textColor === undefined) textColor = _isLight ? '#1e293b' : '#e6edf3';
      if (o.gridColor === undefined) gridColor = _isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.06)';
    }
    if (o.textColor !== undefined) textColor = o.textColor;
    if (o.gridColor !== undefined) gridColor = o.gridColor;
    if (o.gap !== undefined) gap = o.gap;
    if (o.borderRadius !== undefined) borderRadius = o.borderRadius;
    if (o.showValues !== undefined) showValues = o.showValues;
    if (o.showLabels !== undefined) showLabels = o.showLabels;
    if (o.showLegend !== undefined) showLegend = o.showLegend;
    if (o.showGrid !== undefined) showGrid = o.showGrid;
    if (o.showTooltip !== undefined) showTooltip = o.showTooltip;
    if (o.labelPosition !== undefined) labelPosition = o.labelPosition;
    if (o.formatValue !== undefined) fmtVal = o.formatValue;
    if (o.interactive !== undefined) interactive = o.interactive;
    if (o.activeIndex !== undefined) activeIdx = o.activeIndex;
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
    if (animating) {
      // Don't interrupt a running animation; just redraw the current frame
      // The animation loop will continue with the new canvas size
    } else {
      drawStatic();
    }
  });
  ro.observe(container);

  // ---- Internal state ----
  let hits: HitRect[] = [];
  let hoveredHitIdx = -1;
  let animFrame = 0;
  let animStartTime = 0;
  let animating = false;

  function isSeries(): boolean { return seriesData.length > 0; }

  function seriesKeys(): string[] {
    const s = new Set<string>();
    for (const d of seriesData) for (const k of Object.keys(d.values)) s.add(k);
    return Array.from(s);
  }

  function isHorizontal(): boolean { return orientation === 'horizontal'; }

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
      const numBars = isSeries() ? seriesData.length : data.length;
      const totalTime = anim.duration + anim.delay * Math.max(0, numBars - 1);
      const elapsed = performance.now() - animStartTime;
      const globalDone = elapsed >= totalTime;

      draw(elapsed);

      if (globalDone) {
        animating = false;
        draw(Infinity);
      } else {
        tick();
      }
    });
  }

  function barProgress(catIdx: number, elapsed: number): number {
    if (!anim.enabled || elapsed === Infinity) return 1;
    const barElapsed = Math.max(0, elapsed - anim.delay * catIdx);
    const raw = Math.min(1, barElapsed / anim.duration);
    return anim.easing(raw);
  }

  // ---- Mouse events ----
  function onMouseMove(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * dpr;
    const my = (e.clientY - rect.top) * dpr;

    let hit = -1;
    for (let i = 0; i < hits.length; i++) {
      const r = hits[i];
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) { hit = i; break; }
    }

    if (hit !== hoveredHitIdx) {
      hoveredHitIdx = hit;
      if (!animating) draw(Infinity);

      if (hit >= 0) {
        const h = hits[hit];
        onHover({ label: h.label, value: h.value, color: h.color }, h.catIdx);
        if (showTooltip) positionTooltip(h, e.clientX - container.getBoundingClientRect().left, e.clientY - container.getBoundingClientRect().top);
      } else {
        onHover(null, -1);
        hideTip();
      }
    }
  }

  function onMouseLeave() {
    if (hoveredHitIdx !== -1) {
      hoveredHitIdx = -1;
      onHover(null, -1);
      hideTip();
      if (!animating) draw(Infinity);
    }
  }

  function onMouseClick(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * dpr;
    const my = (e.clientY - rect.top) * dpr;
    for (let i = 0; i < hits.length; i++) {
      const r = hits[i];
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        onClick({ label: r.label, value: r.value, color: r.color }, r.catIdx);
        break;
      }
    }
  }

  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseleave', onMouseLeave);
  canvas.addEventListener('click', onMouseClick);

  // ---- Tooltip ----
  function positionTooltip(h: HitRect, cx: number, cy: number) {
    let html = `<div style="font-weight:600;margin-bottom:2px;color:#f8fafc">${h.label}</div>`;

    if (isSeries()) {
      const d = seriesData[h.catIdx];
      const keys = seriesKeys();
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        const v = d.values[k] ?? 0;
        const c = d.colors?.[k] ?? PALETTE[i % PALETTE.length];
        const active = k === h.seriesKey;
        html += `<div style="display:flex;align-items:center;gap:6px;${active ? 'color:#f8fafc' : 'opacity:.55'}">`;
        html += `<span style="width:8px;height:8px;border-radius:2px;background:${c};flex-shrink:0"></span>`;
        html += `<span>${k}</span><span style="margin-left:auto;padding-left:12px;font-variant-numeric:tabular-nums">${fmtVal(v)}</span></div>`;
      }
    } else {
      html += `<div style="display:flex;align-items:center;gap:6px">`;
      html += `<span style="width:8px;height:8px;border-radius:2px;background:${h.color};flex-shrink:0"></span>`;
      html += `<span style="font-variant-numeric:tabular-nums">${fmtVal(h.value)}</span></div>`;
    }

    tip.innerHTML = html;
    tip.style.opacity = '1';

    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    const cw = container.clientWidth;

    let left = cx - tw / 2;
    let top = cy - th - 12;
    if (left < 4) left = 4;
    if (left + tw > cw - 4) left = cw - tw - 4;
    if (top < 4) top = cy + 16;
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }

  function hideTip() { tip.style.opacity = '0'; }

  // ── Drawing ─────────────────────────────────────────────────────────────────

  function draw(elapsed: number) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Clear
    ctx.clearRect(0, 0, w, h);
    if (background !== 'transparent') { ctx.fillStyle = background; ctx.fillRect(0, 0, w, h); }

    if (isSeries()) {
      drawSeriesChart(ctx, w, h, elapsed);
    } else {
      drawSimpleChart(ctx, w, h, elapsed);
    }
  }

  // ── Simple (single-value) chart ─────────────────────────────────────────────

  function drawSimpleChart(ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) {
    if (data.length === 0) return;
    hits = [];

    const horiz = isHorizontal();
    const n = data.length;
    const keys: string[] = [];

    // Margins
    const legendH = 0;
    let mLeft: number, mRight: number, mTop: number, mBottom: number;

    if (horiz) {
      ctx.font = `${9 * dpr}px sans-serif`;
      const maxLabelW = showLabels
        ? Math.max(...data.map((d) => ctx.measureText(d.label).width)) + 8 * dpr
        : 0;
      mLeft = Math.max(maxLabelW, 30 * dpr);
      mRight = 16 * dpr;
      mTop = 16 * dpr;
      mBottom = 28 * dpr;
    } else {
      mLeft = 50 * dpr;
      mRight = 16 * dpr;
      mTop = 20 * dpr;
      mBottom = (showLabels ? 36 * dpr : 12 * dpr) + legendH;
    }

    const plotW = w - mLeft - mRight;
    const plotH = h - mTop - mBottom;

    // Value range
    let vMin = 0, vMax = 0;
    for (const d of data) {
      if (d.value < vMin) vMin = d.value;
      if (d.value > vMax) vMax = d.value;
    }
    if (vMin > 0) vMin = 0;
    if (vMax < 0) vMax = 0;
    const vRange = vMax - vMin || 1;
    vMax += vRange * 0.1;
    vMin -= vRange * 0.1;
    const totalRange = vMax - vMin;

    if (horiz) {
      drawHorizontalSimple(ctx, w, h, elapsed, n, mLeft, mRight, mTop, mBottom, plotW, plotH, vMin, vMax, totalRange);
    } else {
      drawVerticalSimple(ctx, w, h, elapsed, n, mLeft, mTop, plotW, plotH, vMin, vMax, totalRange);
    }

    // Legend: n/a for simple mode, drawn only if series keys exist
    if (showLegend && keys.length > 1) drawLegend(ctx, keys, [], w, h);
  }

  function drawVerticalSimple(
    ctx: CanvasRenderingContext2D, _w: number, _h: number, elapsed: number,
    n: number, mLeft: number, mTop: number, plotW: number, plotH: number,
    vMin: number, vMax: number, totalRange: number,
  ) {
    const toY = (v: number) => mTop + (1 - (v - vMin) / totalRange) * plotH;
    const zeroY = toY(0);

    // Grid
    if (showGrid) drawVGrid(ctx, mLeft, mTop, plotW, plotH, vMin, totalRange, toY);
    drawZeroLineV(ctx, mLeft, plotW, zeroY, vMin, vMax);

    // Bars
    const totalBarW = plotW / n;
    const gapPx = totalBarW * gap;
    const barW = totalBarW - gapPx;
    const br = Math.min(borderRadius * dpr, barW / 2);

    const highlightCat = getHighlightCat();

    for (let i = 0; i < n; i++) {
      const d = data[i];
      const prog = barProgress(i, elapsed);
      const animVal = d.value * prog;
      const x = mLeft + i * totalBarW + gapPx / 2;
      const valY = toY(animVal);

      const color = resolveBarColor(d);
      const barTop = animVal >= 0 ? valY : zeroY;
      const barH = Math.max(0, Math.abs(valY - zeroY));

      // Hover alpha
      const alpha = resolveAlpha(i, highlightCat, prog);
      ctx.globalAlpha = alpha;

      ctx.fillStyle = color;
      if (barH > 0.5) {
        ctx.beginPath();
        ctx.roundRect(x, barTop, barW, barH, [
          animVal >= 0 ? br : 0, animVal >= 0 ? br : 0,
          animVal < 0 ? br : 0, animVal < 0 ? br : 0,
        ]);
        ctx.fill();
      }

      hits.push({ x, y: barTop, w: barW, h: barH, catIdx: i, seriesIdx: -1, label: d.label, value: d.value, color, seriesKey: '' });

      // Value label
      if (showValues && labelPosition !== 'none' && barH > 4 * dpr && prog > 0.3) {
        ctx.fillStyle = labelPosition === 'inside' ? '#fff' : textColor;
        ctx.font = `bold ${9 * dpr}px sans-serif`;
        ctx.textAlign = 'center';

        if (labelPosition === 'inside') {
          ctx.textBaseline = 'middle';
          ctx.fillText(fmtVal(d.value), x + barW / 2, barTop + barH / 2, barW - 4 * dpr);
        } else {
          ctx.textBaseline = animVal >= 0 ? 'bottom' : 'top';
          const ly = animVal >= 0 ? barTop - 3 * dpr : barTop + barH + 3 * dpr;
          ctx.fillText(fmtVal(d.value), x + barW / 2, ly, barW);
        }
      }

      ctx.globalAlpha = 1;

      // X-axis label
      if (showLabels) {
        ctx.fillStyle = textColor;
        ctx.globalAlpha = _isLight ? 0.85 : 0.7;
        ctx.font = `${9 * dpr}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(d.label, x + barW / 2, mTop + plotH + 8 * dpr, totalBarW);
        ctx.globalAlpha = 1;
      }
    }
  }

  function drawHorizontalSimple(
    ctx: CanvasRenderingContext2D, _w: number, _h: number, elapsed: number,
    n: number, mLeft: number, mRight: number, mTop: number, _mBottom: number,
    plotW: number, plotH: number, vMin: number, vMax: number, totalRange: number,
  ) {
    const toX = (v: number) => mLeft + ((v - vMin) / totalRange) * plotW;
    const zeroX = toX(0);

    // Grid (vertical lines)
    if (showGrid) drawHGrid(ctx, mLeft, mTop, plotW, plotH, vMin, totalRange, toX);

    // Zero line
    if (vMin < 0 && vMax > 0) {
      ctx.strokeStyle = textColor;
      ctx.globalAlpha = _isLight ? 0.45 : 0.3;
      ctx.lineWidth = dpr;
      ctx.beginPath();
      ctx.moveTo(zeroX, mTop);
      ctx.lineTo(zeroX, mTop + plotH);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Bars
    const totalSlotH = plotH / n;
    const gapPx = totalSlotH * gap;
    const barH = totalSlotH - gapPx;
    const br = Math.min(borderRadius * dpr, barH / 2);

    const highlightCat = getHighlightCat();

    for (let i = 0; i < n; i++) {
      const d = data[i];
      const prog = barProgress(i, elapsed);
      const animVal = d.value * prog;
      const y = mTop + i * totalSlotH + gapPx / 2;
      const valX = toX(animVal);

      const color = resolveBarColor(d);
      const barLeft = animVal >= 0 ? zeroX : valX;
      const barW = Math.max(0, Math.abs(valX - zeroX));

      const alpha = resolveAlpha(i, highlightCat, prog);
      ctx.globalAlpha = alpha;

      ctx.fillStyle = color;
      if (barW > 0.5) {
        ctx.beginPath();
        ctx.roundRect(barLeft, y, barW, barH, [
          animVal < 0 ? br : 0, animVal >= 0 ? br : 0,
          animVal >= 0 ? br : 0, animVal < 0 ? br : 0,
        ]);
        ctx.fill();
      }

      hits.push({ x: barLeft, y, w: barW, h: barH, catIdx: i, seriesIdx: -1, label: d.label, value: d.value, color, seriesKey: '' });

      // Value label
      if (showValues && labelPosition !== 'none' && barW > 4 * dpr && prog > 0.3) {
        ctx.fillStyle = labelPosition === 'inside' ? '#fff' : textColor;
        ctx.font = `bold ${9 * dpr}px sans-serif`;
        ctx.textBaseline = 'middle';

        if (labelPosition === 'inside') {
          ctx.textAlign = 'center';
          ctx.fillText(fmtVal(d.value), barLeft + barW / 2, y + barH / 2, barW - 4 * dpr);
        } else {
          ctx.textAlign = animVal >= 0 ? 'left' : 'right';
          const lx = animVal >= 0 ? barLeft + barW + 4 * dpr : barLeft - 4 * dpr;
          ctx.fillText(fmtVal(d.value), lx, y + barH / 2);
        }
      }

      ctx.globalAlpha = 1;

      // Category label on left
      if (showLabels) {
        ctx.fillStyle = textColor;
        ctx.globalAlpha = _isLight ? 0.85 : 0.7;
        ctx.font = `${9 * dpr}px sans-serif`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(d.label, mLeft - 8 * dpr, y + barH / 2, mLeft - 12 * dpr);
        ctx.globalAlpha = 1;
      }
    }

    // Value axis labels at bottom
    const gridLines = 5;
    ctx.fillStyle = textColor;
    ctx.globalAlpha = _isLight ? 0.75 : 0.6;
    ctx.font = `${9 * dpr}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 0; i <= gridLines; i++) {
      const v = vMin + (totalRange / gridLines) * i;
      const x = toX(v);
      ctx.fillText(fmtVal(v), x, mTop + plotH + 6 * dpr);
    }
    ctx.globalAlpha = 1;
  }

  // ── Series (grouped / stacked) chart ────────────────────────────────────────

  function drawSeriesChart(ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) {
    if (seriesData.length === 0) return;
    hits = [];

    const keys = seriesKeys();
    if (keys.length === 0) return;

    const horiz = isHorizontal();
    const n = seriesData.length;

    const legendRowH = 22 * dpr;
    const legendRows = showLegend ? Math.ceil(Math.min(keys.length, 12) / 6) : 0;
    const legendBlockH = legendRows * legendRowH;
    const legendGap = showLegend ? 6 * dpr : 0;

    let mLeft: number, mRight: number, mTop: number, mBottom: number;

    if (horiz) {
      ctx.font = `${9 * dpr}px sans-serif`;
      const maxLabelW = showLabels
        ? Math.max(...seriesData.map((d) => ctx.measureText(d.label).width)) + 8 * dpr
        : 0;
      mLeft = Math.max(maxLabelW, 30 * dpr);
      mRight = 16 * dpr;
      mTop = 16 * dpr;
      mBottom = 28 * dpr + legendGap + legendBlockH;
    } else {
      mLeft = 50 * dpr;
      mRight = 16 * dpr;
      mTop = 20 * dpr;
      mBottom = (showLabels ? 36 * dpr : 12 * dpr) + legendGap + legendBlockH;
    }

    const plotW = w - mLeft - mRight;
    const plotH = h - mTop - mBottom;

    // Value range
    let vMin = 0, vMax = 0;
    if (stacked) {
      for (const d of seriesData) {
        let posSum = 0, negSum = 0;
        for (const k of keys) { const v = d.values[k] ?? 0; if (v >= 0) posSum += v; else negSum += v; }
        if (posSum > vMax) vMax = posSum;
        if (negSum < vMin) vMin = negSum;
      }
    } else {
      for (const d of seriesData) {
        for (const k of keys) { const v = d.values[k] ?? 0; if (v < vMin) vMin = v; if (v > vMax) vMax = v; }
      }
    }
    if (vMin > 0) vMin = 0;
    if (vMax < 0) vMax = 0;
    const vRange = vMax - vMin || 1;
    vMax += vRange * 0.1;
    vMin -= vRange * 0.1;
    const totalRange = vMax - vMin;

    if (horiz) {
      drawHorizSeries(ctx, w, h, elapsed, n, keys, mLeft, mRight, mTop, plotW, plotH, vMin, vMax, totalRange);
    } else {
      drawVertSeries(ctx, w, h, elapsed, n, keys, mLeft, mTop, plotW, plotH, vMin, vMax, totalRange);
    }

    // Legend
    if (showLegend && keys.length > 1) {
      const colors = keys.map((k, i) => {
        for (const d of seriesData) { if (d.colors?.[k]) return d.colors[k]; }
        return PALETTE[i % PALETTE.length];
      });
      drawLegend(ctx, keys, colors, w, h - legendBlockH - legendGap);
    }
  }

  function drawVertSeries(
    ctx: CanvasRenderingContext2D, _w: number, _h: number, elapsed: number,
    n: number, keys: string[], mLeft: number, mTop: number,
    plotW: number, plotH: number, vMin: number, vMax: number, totalRange: number,
  ) {
    const toY = (v: number) => mTop + (1 - (v - vMin) / totalRange) * plotH;
    const zeroY = toY(0);

    if (showGrid) drawVGrid(ctx, mLeft, mTop, plotW, plotH, vMin, totalRange, toY);
    drawZeroLineV(ctx, mLeft, plotW, zeroY, vMin, vMax);

    const totalSlotW = plotW / n;
    const gapPx = totalSlotW * gap;
    const slotW = totalSlotW - gapPx;
    const highlightCat = getHighlightCat();

    for (let i = 0; i < n; i++) {
      const d = seriesData[i];
      const slotX = mLeft + i * totalSlotW + gapPx / 2;
      const prog = barProgress(i, elapsed);

      if (stacked) {
        let posAcc = 0, negAcc = 0;
        for (let ki = 0; ki < keys.length; ki++) {
          const k = keys[ki];
          const rawV = d.values[k] ?? 0;
          const v = rawV * prog;
          const color = d.colors?.[k] ?? PALETTE[ki % PALETTE.length];

          let barTop: number, barH: number;
          if (v >= 0) { const base = posAcc; posAcc += v; barTop = toY(posAcc); barH = toY(base) - barTop; }
          else { const base = negAcc; negAcc += v; barTop = toY(base); barH = toY(negAcc) - barTop; }

          const alpha = resolveAlpha(i, highlightCat, prog);
          ctx.globalAlpha = alpha;

          if (barH > 0.5) {
            const br = Math.min(borderRadius * dpr, slotW / 2);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.roundRect(slotX, barTop, slotW, barH, br);
            ctx.fill();
          }

          hits.push({ x: slotX, y: barTop, w: slotW, h: Math.max(barH, 0), catIdx: i, seriesIdx: ki, label: d.label, value: rawV, color, seriesKey: k });
          ctx.globalAlpha = 1;
        }

        // Stacked value label (total)
        if (showValues && labelPosition !== 'none' && prog > 0.3) {
          const totPos = keys.reduce((s, k) => { const v = (d.values[k] ?? 0) * prog; return v >= 0 ? s + v : s; }, 0);
          const totNeg = keys.reduce((s, k) => { const v = (d.values[k] ?? 0) * prog; return v < 0 ? s + v : s; }, 0);
          ctx.fillStyle = textColor;
          ctx.font = `bold ${9 * dpr}px sans-serif`;
          ctx.textAlign = 'center';
          if (totPos > 0) { ctx.textBaseline = 'bottom'; ctx.fillText(fmtVal(totPos / prog * prog), slotX + slotW / 2, toY(totPos) - 3 * dpr, slotW); }
          if (totNeg < 0) { ctx.textBaseline = 'top'; ctx.fillText(fmtVal(totNeg / prog * prog), slotX + slotW / 2, toY(totNeg) + 3 * dpr, slotW); }
        }
      } else {
        // Grouped
        const subBarW = slotW / keys.length;
        const subBr = Math.min(borderRadius * dpr, subBarW / 2);

        for (let ki = 0; ki < keys.length; ki++) {
          const k = keys[ki];
          const rawV = d.values[k] ?? 0;
          const v = rawV * prog;
          const color = d.colors?.[k] ?? PALETTE[ki % PALETTE.length];
          const x = slotX + ki * subBarW;
          const valY = toY(v);
          const barTop = v >= 0 ? valY : zeroY;
          const barH = Math.max(0, Math.abs(valY - zeroY));

          const alpha = resolveAlpha(i, highlightCat, prog);
          ctx.globalAlpha = alpha;

          if (barH > 0.5) {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.roundRect(x, barTop, subBarW, barH, [
              v >= 0 ? subBr : 0, v >= 0 ? subBr : 0,
              v < 0 ? subBr : 0, v < 0 ? subBr : 0,
            ]);
            ctx.fill();
          }

          hits.push({ x, y: barTop, w: subBarW, h: barH, catIdx: i, seriesIdx: ki, label: d.label, value: rawV, color, seriesKey: k });

          if (showValues && labelPosition !== 'none' && barH > 4 * dpr && prog > 0.3) {
            ctx.fillStyle = labelPosition === 'inside' ? '#fff' : textColor;
            ctx.font = `bold ${8 * dpr}px sans-serif`;
            ctx.textAlign = 'center';
            if (labelPosition === 'inside') {
              ctx.textBaseline = 'middle';
              ctx.fillText(fmtVal(rawV), x + subBarW / 2, barTop + barH / 2, subBarW - 2 * dpr);
            } else {
              ctx.textBaseline = v >= 0 ? 'bottom' : 'top';
              ctx.fillText(fmtVal(rawV), x + subBarW / 2, v >= 0 ? barTop - 2 * dpr : barTop + barH + 2 * dpr, subBarW);
            }
          }
          ctx.globalAlpha = 1;
        }
      }

      // X-axis label
      if (showLabels) {
        ctx.fillStyle = textColor;
        ctx.globalAlpha = _isLight ? 0.85 : 0.7;
        ctx.font = `${9 * dpr}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(d.label, slotX + slotW / 2, mTop + plotH + 8 * dpr, totalSlotW);
        ctx.globalAlpha = 1;
      }
    }
  }

  function drawHorizSeries(
    ctx: CanvasRenderingContext2D, _w: number, _h: number, elapsed: number,
    n: number, keys: string[], mLeft: number, _mRight: number, mTop: number,
    plotW: number, plotH: number, vMin: number, vMax: number, totalRange: number,
  ) {
    const toX = (v: number) => mLeft + ((v - vMin) / totalRange) * plotW;
    const zeroX = toX(0);

    if (showGrid) drawHGrid(ctx, mLeft, mTop, plotW, plotH, vMin, totalRange, toX);

    if (vMin < 0 && vMax > 0) {
      ctx.strokeStyle = textColor; ctx.globalAlpha = _isLight ? 0.45 : 0.3; ctx.lineWidth = dpr;
      ctx.beginPath(); ctx.moveTo(zeroX, mTop); ctx.lineTo(zeroX, mTop + plotH); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    const totalSlotH = plotH / n;
    const gapPx = totalSlotH * gap;
    const slotH = totalSlotH - gapPx;
    const highlightCat = getHighlightCat();

    for (let i = 0; i < n; i++) {
      const d = seriesData[i];
      const slotY = mTop + i * totalSlotH + gapPx / 2;
      const prog = barProgress(i, elapsed);

      if (stacked) {
        let posAcc = 0, negAcc = 0;
        for (let ki = 0; ki < keys.length; ki++) {
          const k = keys[ki];
          const rawV = d.values[k] ?? 0;
          const v = rawV * prog;
          const color = d.colors?.[k] ?? PALETTE[ki % PALETTE.length];

          let barLeft: number, barW: number;
          if (v >= 0) { const base = posAcc; posAcc += v; barLeft = toX(base); barW = toX(posAcc) - barLeft; }
          else { const base = negAcc; negAcc += v; barLeft = toX(negAcc); barW = toX(base) - barLeft; }

          const alpha = resolveAlpha(i, highlightCat, prog);
          ctx.globalAlpha = alpha;

          if (barW > 0.5) {
            const br = Math.min(borderRadius * dpr, slotH / 2);
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.roundRect(barLeft, slotY, barW, slotH, br); ctx.fill();
          }

          hits.push({ x: barLeft, y: slotY, w: Math.max(barW, 0), h: slotH, catIdx: i, seriesIdx: ki, label: d.label, value: rawV, color, seriesKey: k });
          ctx.globalAlpha = 1;
        }
      } else {
        const subBarH = slotH / keys.length;
        const subBr = Math.min(borderRadius * dpr, subBarH / 2);

        for (let ki = 0; ki < keys.length; ki++) {
          const k = keys[ki];
          const rawV = d.values[k] ?? 0;
          const v = rawV * prog;
          const color = d.colors?.[k] ?? PALETTE[ki % PALETTE.length];
          const y = slotY + ki * subBarH;
          const valX = toX(v);
          const barLeft = v >= 0 ? zeroX : valX;
          const barW = Math.max(0, Math.abs(valX - zeroX));

          const alpha = resolveAlpha(i, highlightCat, prog);
          ctx.globalAlpha = alpha;

          if (barW > 0.5) {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.roundRect(barLeft, y, barW, subBarH, [
              v < 0 ? subBr : 0, v >= 0 ? subBr : 0,
              v >= 0 ? subBr : 0, v < 0 ? subBr : 0,
            ]);
            ctx.fill();
          }

          hits.push({ x: barLeft, y, w: barW, h: subBarH, catIdx: i, seriesIdx: ki, label: d.label, value: rawV, color, seriesKey: k });
          ctx.globalAlpha = 1;
        }
      }

      // Category label
      if (showLabels) {
        ctx.fillStyle = textColor; ctx.globalAlpha = _isLight ? 0.85 : 0.7;
        ctx.font = `${9 * dpr}px sans-serif`;
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(d.label, mLeft - 8 * dpr, slotY + slotH / 2, mLeft - 12 * dpr);
        ctx.globalAlpha = 1;
      }
    }

    // Value axis at bottom
    const gridLines = 5;
    ctx.fillStyle = textColor; ctx.globalAlpha = _isLight ? 0.75 : 0.6;
    ctx.font = `${9 * dpr}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let gi = 0; gi <= gridLines; gi++) {
      const v = vMin + (totalRange / gridLines) * gi;
      ctx.fillText(fmtVal(v), toX(v), mTop + plotH + 6 * dpr);
    }
    ctx.globalAlpha = 1;
  }

  // ── Shared drawing helpers ──────────────────────────────────────────────────

  function resolveBarColor(d: BarDataPoint): string {
    if (d.color) return d.color;
    if (autoColor) return d.value >= 0 ? positiveColor : negativeColor;
    return barColor;
  }

  function getHighlightCat(): number {
    if (hoveredHitIdx >= 0) return hits[hoveredHitIdx]?.catIdx ?? -1;
    return activeIdx;
  }

  function resolveAlpha(catIdx: number, highlightCat: number, prog: number): number {
    let a = 1;
    if (interactive && highlightCat >= 0) {
      a = catIdx === highlightCat ? 1 : 0.3;
    }
    if (anim.style === 'fadeGrow') a *= prog;
    return a;
  }

  function drawVGrid(
    ctx: CanvasRenderingContext2D,
    mLeft: number, mTop: number, plotW: number, _plotH: number,
    vMin: number, totalRange: number, toY: (v: number) => number,
  ) {
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = dpr * (_isLight ? 0.8 : 0.5);
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const v = vMin + (totalRange / gridLines) * i;
      const y = toY(v);
      ctx.beginPath(); ctx.moveTo(mLeft, y); ctx.lineTo(mLeft + plotW, y); ctx.stroke();

      ctx.fillStyle = textColor; ctx.globalAlpha = _isLight ? 0.75 : 0.6;
      ctx.font = `${9 * dpr}px sans-serif`;
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(fmtVal(v), mLeft - 6 * dpr, y);
      ctx.globalAlpha = 1;
    }
  }

  function drawHGrid(
    ctx: CanvasRenderingContext2D,
    mLeft: number, mTop: number, _plotW: number, plotH: number,
    vMin: number, totalRange: number, toX: (v: number) => number,
  ) {
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = dpr * (_isLight ? 0.8 : 0.5);
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const v = vMin + (totalRange / gridLines) * i;
      const x = toX(v);
      ctx.beginPath(); ctx.moveTo(x, mTop); ctx.lineTo(x, mTop + plotH); ctx.stroke();
    }
  }

  function drawZeroLineV(
    ctx: CanvasRenderingContext2D,
    mLeft: number, plotW: number, zeroY: number, vMin: number, vMax: number,
  ) {
    if (vMin < 0 && vMax > 0) {
      ctx.strokeStyle = textColor; ctx.globalAlpha = _isLight ? 0.45 : 0.3; ctx.lineWidth = dpr;
      ctx.beginPath(); ctx.moveTo(mLeft, zeroY); ctx.lineTo(mLeft + plotW, zeroY); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  function drawLegend(
    ctx: CanvasRenderingContext2D, keys: string[], colors: string[],
    w: number, legendTopY: number,
  ) {
    const rowH = 22 * dpr;
    const colsPerRow = Math.min(keys.length, 6);
    const itemW = Math.min(100 * dpr, (w - 24 * dpr) / colsPerRow);
    const totalLW = itemW * colsPerRow;
    const startX = (w - totalLW) / 2;

    ctx.font = `${9 * dpr}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < keys.length && i < 12; i++) {
      const col = i % colsPerRow;
      const row = Math.floor(i / colsPerRow);
      const x = startX + col * itemW;
      const y = legendTopY + row * rowH + rowH / 2;

      ctx.fillStyle = colors[i] ?? PALETTE[i % PALETTE.length];
      ctx.beginPath();
      ctx.roundRect(x, y - 4 * dpr, 10 * dpr, 8 * dpr, 2 * dpr);
      ctx.fill();

      ctx.fillStyle = textColor; ctx.globalAlpha = _isLight ? 0.95 : 0.85;
      ctx.fillText(keys[i], x + 14 * dpr, y, itemW - 18 * dpr);
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
    setData(d) {
      data = d;
      seriesData = [];
      if (anim.enabled) startAnimation(); else drawStatic();
    },
    setSeriesData(d) {
      seriesData = d;
      if (anim.enabled) startAnimation(); else drawStatic();
    },
    setOptions(o) {
      const dataChanged = o.data !== undefined || o.seriesData !== undefined;
      applyOptions(o);
      if (dataChanged && anim.enabled) startAnimation(); else drawStatic();
    },
    setActiveIndex(idx) {
      activeIdx = idx ?? -1;
      if (!animating) draw(Infinity);
    },
    redraw: () => drawStatic(),
    resize() { sizeCanvas(); drawStatic(); },
    dispose() {
      ro.disconnect();
      if (animFrame) cancelAnimationFrame(animFrame);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      canvas.removeEventListener('click', onMouseClick);
      canvas.remove();
      tip.remove();
    },
  };
}

// ── Utility ───────────────────────────────────────────────────────────────────

function formatNum(v: number): string {
  if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toFixed(v % 1 === 0 ? 0 : 2);
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
