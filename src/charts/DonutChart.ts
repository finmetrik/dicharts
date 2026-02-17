// ---------------------------------------------------------------------------
// DiCharts – Donut / Pie Chart (Enhanced)
// ---------------------------------------------------------------------------
// Feature-complete Canvas2D pie/donut chart supporting:
//   • Full pie (innerRadius 0) or donut (innerRadius > 0)
//   • Inside, outside, or label-list label positioning
//   • Custom label formatting & value formatting
//   • Auto-generated legend
//   • Interactive hover highlighting with DOM tooltip
//   • Configurable entry animations (sweep, grow, fade)
//   • Active slice highlighting with expand effect
//   • Custom center text for donut mode
//   • Stacked / nested concentric rings
//   • Transparent / inherit background
// ---------------------------------------------------------------------------

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DonutSlice {
  id: string;
  label: string;
  value: number;
  color?: string;
}

export interface DonutAnimationConfig {
  /** Duration in ms. Default 800. */
  duration?: number;
  /** Easing function. Default `'easeOut'`. */
  easing?: 'linear' | 'easeOut' | 'easeInOut' | 'spring';
  /** Stagger delay between slices in ms. Default 0. */
  delay?: number;
  /** Animation style. Default `'sweep'`. */
  style?: 'sweep' | 'grow' | 'fade' | 'none';
}

export type CenterTextConfig =
  | 'auto'
  | 'none'
  | { title?: string; value?: string }
  | ((hovered: DonutSlice | null, total: number) => { title: string; value: string });

export interface DonutChartOptions {
  data?: DonutSlice[];
  /** Additional data rings for stacked/nested mode. First = outermost ring. */
  stackedData?: DonutSlice[][];
  /** 0 = full pie, 0.5 = donut with 50% inner radius. Default 0.55. */
  innerRadius?: number;
  /** Colour palette (cycled). */
  colors?: string[];
  /**
   * Background colour. `'transparent'` uses clearRect only,
   * inheriting the parent container's background.
   */
  background?: string;
  textColor?: string;
  /** Label display type. Default `'percentage'`. */
  labelType?: 'percentage' | 'value' | 'label' | 'custom' | 'none';
  /** Label position. Default `'inside'`. */
  labelPosition?: 'inside' | 'outside' | 'none';
  /** Show connector lines for outside labels. Default true when labelPosition is 'outside'. */
  showLabelLines?: boolean;
  /** Custom label formatter. */
  formatLabel?: (slice: DonutSlice, pct: number, total: number) => string;
  /** Backward-compat: true = labelType 'percentage' + labelPosition 'inside'. */
  showLabels?: boolean;
  /** Show legend below the chart. Default true. */
  showLegend?: boolean;
  /** Show tooltip on hover. Default false. */
  showTooltip?: boolean;
  /** Enable hover highlighting (dim non-hovered slices). Default false. */
  interactive?: boolean;
  /** Programmatic active (highlighted) slice index. Default -1. */
  activeIndex?: number;
  /** Center text configuration for donut mode. Default 'auto'. */
  centerText?: CenterTextConfig;
  /** Entry animation. Pass `true` for defaults, object for custom, or `false` to disable. */
  animation?: boolean | DonutAnimationConfig;
  /** Custom value formatter for tooltip / center text. */
  formatValue?: (v: number) => string;
  /** Click callback. */
  onClick?: (slice: DonutSlice, index: number) => void;
  /** Hover callback. */
  onHover?: (slice: DonutSlice | null, index: number) => void;
}

export interface DonutChartInstance {
  setData(data: DonutSlice[]): void;
  setStackedData(data: DonutSlice[][]): void;
  setOptions(opts: Partial<DonutChartOptions>): void;
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

interface ResolvedAnim {
  enabled: boolean;
  duration: number;
  easing: (t: number) => number;
  delay: number;
  style: string;
}

function resolveAnim(raw?: boolean | DonutAnimationConfig): ResolvedAnim {
  if (!raw) return { enabled: false, duration: 0, easing: EASINGS.linear, delay: 0, style: 'none' };
  const cfg = raw === true ? {} : raw;
  return {
    enabled: (cfg.style ?? 'sweep') !== 'none',
    duration: cfg.duration ?? 800,
    easing: EASINGS[cfg.easing ?? 'easeOut'] ?? EASINGS.easeOut,
    delay: cfg.delay ?? 0,
    style: cfg.style ?? 'sweep',
  };
}

// ── Main factory ──────────────────────────────────────────────────────────────

export function createDonutChart(
  container: HTMLElement,
  options: DonutChartOptions = {},
): DonutChartInstance {
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
  let data: DonutSlice[] = options.data ?? [];
  let stackedData: DonutSlice[][] = options.stackedData ?? [];
  let innerRadiusRatio = options.innerRadius ?? 0.55;
  let colors = options.colors ?? PALETTE;
  let background = options.background ?? 'transparent';
  let _isLight = isLightBg(background, container);
  let textColor = options.textColor ?? (_isLight ? '#1e293b' : '#e6edf3');
  applyTipTheme(_isLight);
  let labelType: string = options.labelType ?? (options.showLabels === false ? 'none' : 'percentage');
  let labelPosition: string = options.labelPosition ?? 'inside';
  let showLabelLines = options.showLabelLines ?? (labelPosition === 'outside');
  let formatLabel = options.formatLabel ?? null;
  let showLegend = options.showLegend ?? true;
  let showTooltip = options.showTooltip ?? false;
  let interactive = options.interactive ?? false;
  let activeIdx = options.activeIndex ?? -1;
  let centerText: CenterTextConfig = options.centerText ?? 'auto';
  let anim: ResolvedAnim = resolveAnim(options.animation);
  let fmtVal = options.formatValue ?? defaultFormatValue;
  let onClick: (slice: DonutSlice, index: number) => void = options.onClick ?? (() => {});
  let onHover: (slice: DonutSlice | null, index: number) => void = options.onHover ?? (() => {});

  function applyOptions(o: DonutChartOptions) {
    if (o.data !== undefined) data = o.data;
    if (o.stackedData !== undefined) stackedData = o.stackedData;
    if (o.innerRadius !== undefined) innerRadiusRatio = o.innerRadius;
    if (o.colors !== undefined) colors = o.colors;
    if (o.background !== undefined) {
      background = o.background;
      _isLight = isLightBg(background, container);
      applyTipTheme(_isLight);
      if (o.textColor === undefined) textColor = _isLight ? '#1e293b' : '#e6edf3';
    }
    if (o.textColor !== undefined) textColor = o.textColor;
    if (o.labelType !== undefined) labelType = o.labelType;
    if (o.labelPosition !== undefined) { labelPosition = o.labelPosition; showLabelLines = o.showLabelLines ?? (labelPosition === 'outside'); }
    if (o.showLabelLines !== undefined) showLabelLines = o.showLabelLines;
    if (o.formatLabel !== undefined) formatLabel = o.formatLabel;
    if (o.showLabels !== undefined && o.labelType === undefined) labelType = o.showLabels ? 'percentage' : 'none';
    if (o.showLegend !== undefined) showLegend = o.showLegend;
    if (o.showTooltip !== undefined) showTooltip = o.showTooltip;
    if (o.interactive !== undefined) interactive = o.interactive;
    if (o.activeIndex !== undefined) activeIdx = o.activeIndex;
    if (o.centerText !== undefined) centerText = o.centerText;
    if (o.animation !== undefined) anim = resolveAnim(o.animation);
    if (o.formatValue !== undefined) fmtVal = o.formatValue;
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
      // Don't interrupt a running animation
    } else {
      drawStatic();
    }
  });
  ro.observe(container);

  // ---- Internal state ----
  let hoveredIdx = -1;
  let animFrame = 0;
  let animStartTime = 0;
  let animating = false;

  // Geometry cached per draw
  let chartCx = 0, chartCy = 0, outerR = 0, innerR = 0;
  let sliceAngles: { start: number; end: number }[] = [];

  function isStacked(): boolean { return stackedData.length > 0; }

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
      const numSlices = data.length;
      const totalTime = anim.duration + anim.delay * Math.max(0, numSlices - 1);
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

  function sliceProgress(sliceIdx: number, elapsed: number): number {
    if (!anim.enabled || elapsed === Infinity) return 1;
    const sliceElapsed = Math.max(0, elapsed - anim.delay * sliceIdx);
    const raw = Math.min(1, sliceElapsed / anim.duration);
    return anim.easing(raw);
  }

  // ---- Hit testing ----
  function hitTest(x: number, y: number): number {
    const dx = x - chartCx;
    const dy = y - chartCy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < innerR || dist > outerR + 8 * dpr) return -1;

    let angle = Math.atan2(dy, dx);
    if (angle < -Math.PI / 2) angle += Math.PI * 2;

    for (let i = 0; i < sliceAngles.length; i++) {
      if (angle >= sliceAngles[i].start && angle < sliceAngles[i].end) return i;
    }
    return -1;
  }

  function getHighlightIdx(): number {
    if (hoveredIdx >= 0) return hoveredIdx;
    return activeIdx;
  }

  // ---- Mouse events ----
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * dpr;
    const my = (e.clientY - rect.top) * dpr;
    const idx = hitTest(mx, my);

    if (idx !== hoveredIdx) {
      hoveredIdx = idx;
      if (!animating) draw(Infinity);

      if (idx >= 0) {
        onHover(data[idx], idx);
        if (showTooltip) positionTooltip(idx, e.clientX - container.getBoundingClientRect().left, e.clientY - container.getBoundingClientRect().top);
      } else {
        onHover(null, -1);
        hideTip();
      }
    }
  });

  canvas.addEventListener('mouseleave', () => {
    if (hoveredIdx !== -1) {
      hoveredIdx = -1;
      onHover(null, -1);
      hideTip();
      if (!animating) draw(Infinity);
    }
  });

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * dpr;
    const my = (e.clientY - rect.top) * dpr;
    const idx = hitTest(mx, my);
    if (idx >= 0) onClick(data[idx], idx);
  });

  // ---- Tooltip ----
  function positionTooltip(idx: number, cx: number, cy: number) {
    const d = data[idx];
    const total = data.reduce((s, sl) => s + sl.value, 0);
    const pct = total > 0 ? (d.value / total) * 100 : 0;
    const color = d.color || colors[idx % colors.length];

    let html = `<div style="font-weight:600;margin-bottom:2px;color:#f8fafc">${d.label}</div>`;
    html += `<div style="display:flex;align-items:center;gap:6px">`;
    html += `<span style="width:8px;height:8px;border-radius:2px;background:${color};flex-shrink:0"></span>`;
    html += `<span style="font-variant-numeric:tabular-nums">${fmtVal(d.value)}</span>`;
    html += `<span style="opacity:.6;margin-left:4px">(${pct.toFixed(1)}%)</span></div>`;

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

    ctx.clearRect(0, 0, w, h);
    if (background !== 'transparent') { ctx.fillStyle = background; ctx.fillRect(0, 0, w, h); }

    if (isStacked()) {
      drawStackedRings(ctx, w, h, elapsed);
    } else {
      drawPrimaryRing(ctx, w, h, elapsed);
    }
  }

  // ── Primary ring (single data set) ─────────────────────────────────────────

  function drawPrimaryRing(ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) {
    if (data.length === 0) return;

    const total = data.reduce((s, d) => s + d.value, 0);
    if (total <= 0) return;

    // ---- Layout ----
    const legendRowH = 18 * dpr;
    const legendRows = showLegend ? Math.ceil(Math.min(data.length, 12) / 6) : 0;
    const legendGap = showLegend ? 10 * dpr : 0;
    const legendBlockH = legendRows * legendRowH;

    const outsideLabelPad = (labelPosition === 'outside' && labelType !== 'none') ? 60 * dpr : 0;
    const hoverPad = 8 * dpr;
    const availH = h - legendGap - legendBlockH - hoverPad * 2;
    const availW = w - hoverPad * 2 - outsideLabelPad * 2;
    const diameter = Math.min(availW, availH);
    outerR = Math.max(diameter / 2, 10);
    innerR = outerR * innerRadiusRatio;

    const compositionH = diameter + legendGap + legendBlockH;
    const topOffset = (h - compositionH) / 2;

    chartCx = w / 2;
    chartCy = topOffset + outerR;

    // ---- Compute slice angles ----
    sliceAngles = [];
    let angle = -Math.PI / 2;
    for (const d of data) {
      const sweep = (d.value / total) * Math.PI * 2;
      sliceAngles.push({ start: angle, end: angle + sweep });
      angle += sweep;
    }

    const highlightIdx = getHighlightIdx();

    // ---- Draw slices ----
    for (let i = 0; i < data.length; i++) {
      const { start, end } = sliceAngles[i];
      const color = data[i].color || colors[i % colors.length];
      const isHighlight = i === highlightIdx;
      const prog = sliceProgress(i, elapsed);

      let drawStart = start;
      let drawEnd = end;
      let drawOuterR = isHighlight ? outerR + 6 * dpr : outerR;
      let drawInnerR = innerR;
      let alpha = 1;

      // Animation transforms
      if (anim.style === 'sweep' && prog < 1) {
        const sweepAngle = (end - start) * prog;
        drawEnd = start + sweepAngle;
      } else if (anim.style === 'grow' && prog < 1) {
        drawOuterR = (isHighlight ? outerR + 6 * dpr : outerR) * prog;
        drawInnerR = innerR * prog;
      } else if (anim.style === 'fade' && prog < 1) {
        alpha = prog;
      }

      // Interactive dimming
      if (interactive && highlightIdx >= 0 && !isHighlight) {
        alpha *= 0.35;
      } else if (!interactive) {
        alpha *= isHighlight && hoveredIdx >= 0 ? 1 : (hoveredIdx >= 0 ? 0.85 : 0.85);
        if (isHighlight && hoveredIdx >= 0) alpha = 1;
      }

      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(chartCx + Math.cos(drawStart) * drawInnerR, chartCy + Math.sin(drawStart) * drawInnerR);
      ctx.arc(chartCx, chartCy, drawOuterR, drawStart, drawEnd);
      ctx.arc(chartCx, chartCy, drawInnerR, drawEnd, drawStart, true);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // ---- Labels ----
    if (labelType !== 'none' && labelPosition !== 'none' && elapsed === Infinity) {
      if (labelPosition === 'inside') {
        drawLabelsInside(ctx, total);
      } else if (labelPosition === 'outside') {
        drawLabelsOutside(ctx, total);
      }
    }

    // ---- Center text ----
    if (innerRadiusRatio > 0 && centerText !== 'none' && elapsed === Infinity) {
      drawCenterText(ctx, total);
    }

    // ---- Legend ----
    if (showLegend && legendRows > 0) {
      const legendTop = topOffset + diameter + legendGap;
      drawLegend(ctx, data, legendTop, w);
    }
  }

  // ── Labels inside slices ───────────────────────────────────────────────────

  function drawLabelsInside(ctx: CanvasRenderingContext2D, total: number) {
    const labelR = (outerR + innerR) / 2;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const fontSize = Math.max(9 * dpr, Math.min(11 * dpr, outerR * 0.11));
    ctx.font = `bold ${fontSize}px sans-serif`;

    for (let i = 0; i < data.length; i++) {
      const pct = (data[i].value / total) * 100;
      if (pct < 4) continue;

      const mid = (sliceAngles[i].start + sliceAngles[i].end) / 2;
      const lx = chartCx + Math.cos(mid) * labelR;
      const ly = chartCy + Math.sin(mid) * labelR;

      const text = getLabelText(data[i], pct, total);
      ctx.fillText(text, lx, ly);
    }
  }

  // ── Labels outside with connector lines ────────────────────────────────────

  function drawLabelsOutside(ctx: CanvasRenderingContext2D, total: number) {
    const lineOuterR = outerR + 10 * dpr;
    const labelR = outerR + 24 * dpr;

    const fontSize = Math.max(9 * dpr, Math.min(10 * dpr, outerR * 0.1));
    ctx.font = `${fontSize}px sans-serif`;

    for (let i = 0; i < data.length; i++) {
      const pct = (data[i].value / total) * 100;
      if (pct < 2) continue;

      const mid = (sliceAngles[i].start + sliceAngles[i].end) / 2;
      const cos = Math.cos(mid);
      const sin = Math.sin(mid);

      const sx = chartCx + cos * outerR;
      const sy = chartCy + sin * outerR;
      const mx = chartCx + cos * lineOuterR;
      const my = chartCy + sin * lineOuterR;
      const lx = chartCx + cos * labelR;
      const ly = chartCy + sin * labelR;

      // Connector line
      if (showLabelLines) {
        ctx.strokeStyle = data[i].color || colors[i % colors.length];
        ctx.globalAlpha = _isLight ? 0.7 : 0.5;
        ctx.lineWidth = dpr;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(mx, my);
        const ext = cos >= 0 ? 12 * dpr : -12 * dpr;
        ctx.lineTo(mx + ext, my);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Label text
      const text = getLabelText(data[i], pct, total);
      ctx.fillStyle = textColor;
      ctx.globalAlpha = _isLight ? 0.95 : 0.85;
      ctx.textBaseline = 'middle';
      ctx.textAlign = cos >= 0 ? 'left' : 'right';

      const textX = cos >= 0 ? lx : chartCx + cos * labelR;
      ctx.fillText(text, textX, ly);
      ctx.globalAlpha = 1;
    }
  }

  function getLabelText(slice: DonutSlice, pct: number, total: number): string {
    if (formatLabel) return formatLabel(slice, pct, total);
    switch (labelType) {
      case 'percentage': return `${pct.toFixed(1)}%`;
      case 'value': return fmtVal(slice.value);
      case 'label': return slice.label;
      case 'custom': return `${slice.label}: ${fmtVal(slice.value)}`;
      default: return `${pct.toFixed(1)}%`;
    }
  }

  // ── Center text (donut mode) ───────────────────────────────────────────────

  function drawCenterText(ctx: CanvasRenderingContext2D, total: number) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let title = '';
    let value = '';

    if (typeof centerText === 'function') {
      const hovered = hoveredIdx >= 0 ? data[hoveredIdx] : null;
      const result = centerText(hovered, total);
      title = result.title;
      value = result.value;
    } else if (typeof centerText === 'object' && centerText !== null && centerText !== 'auto' && centerText !== 'none') {
      title = centerText.title ?? '';
      value = centerText.value ?? '';
    } else {
      // 'auto' mode — show hovered slice or total
      if (hoveredIdx >= 0) {
        const d = data[hoveredIdx];
        const pct = (d.value / total) * 100;
        title = d.label;
        value = `${pct.toFixed(1)}%`;
      } else if (activeIdx >= 0 && activeIdx < data.length) {
        const d = data[activeIdx];
        const pct = (d.value / total) * 100;
        title = d.label;
        value = `${pct.toFixed(1)}%`;
      } else {
        title = 'Total';
        value = fmtVal(total);
      }
    }

    if (title) {
      ctx.fillStyle = textColor;
      ctx.globalAlpha = _isLight ? 0.7 : 0.5;
      ctx.font = `${Math.max(9 * dpr, innerR * 0.2)}px sans-serif`;
      ctx.fillText(title, chartCx, chartCy - innerR * 0.12, innerR * 1.6);
      ctx.globalAlpha = 1;
    }

    if (value) {
      ctx.fillStyle = textColor;
      ctx.font = `bold ${Math.max(11 * dpr, innerR * 0.3)}px sans-serif`;
      ctx.fillText(value, chartCx, chartCy + innerR * 0.18, innerR * 1.6);
    }
  }

  // ── Legend ──────────────────────────────────────────────────────────────────

  function drawLegend(ctx: CanvasRenderingContext2D, slices: DonutSlice[], legendTop: number, w: number) {
    const legendRowH = 18 * dpr;
    const colsPerRow = Math.min(slices.length, 6);
    const itemW = Math.min(110 * dpr, (w - 24 * dpr) / colsPerRow);
    const totalLegendW = itemW * colsPerRow;
    const startX = (w - totalLegendW) / 2;

    ctx.font = `${10 * dpr}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < slices.length && i < 12; i++) {
      const col = i % colsPerRow;
      const row = Math.floor(i / colsPerRow);
      const x = startX + col * itemW;
      const y = legendTop + row * legendRowH + legendRowH / 2;

      const color = slices[i].color || colors[i % colors.length];
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x + 4 * dpr, y, 4 * dpr, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = textColor;
      ctx.globalAlpha = _isLight ? 0.95 : 0.85;
      ctx.fillText(slices[i].label, x + 12 * dpr, y, itemW - 16 * dpr);
      ctx.globalAlpha = 1;
    }
  }

  // ── Stacked / nested rings ─────────────────────────────────────────────────

  function drawStackedRings(ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) {
    const rings = stackedData;
    if (rings.length === 0) return;

    const numRings = rings.length;
    const legendRowH = 18 * dpr;
    const outerRingSlices = rings[0];
    const legendRows = showLegend ? Math.ceil(Math.min(outerRingSlices.length, 12) / 6) : 0;
    const legendGap = showLegend ? 10 * dpr : 0;
    const legendBlockH = legendRows * legendRowH;

    const hoverPad = 8 * dpr;
    const availH = h - legendGap - legendBlockH - hoverPad * 2;
    const availW = w - hoverPad * 2;
    const diameter = Math.min(availW, availH);
    const maxR = Math.max(diameter / 2, 10);

    const compositionH = diameter + legendGap + legendBlockH;
    const topOffset = (h - compositionH) / 2;
    const cx = w / 2;
    const cy = topOffset + maxR;

    // Store for hit test (use outermost ring)
    chartCx = cx;
    chartCy = cy;
    outerR = maxR;
    innerR = maxR * 0.3; // smallest ring inner radius

    const ringGap = 3 * dpr;
    const totalRingSpace = maxR - innerR;
    const ringWidth = (totalRingSpace - ringGap * (numRings - 1)) / numRings;

    for (let ri = 0; ri < numRings; ri++) {
      const ringData = rings[ri];
      const total = ringData.reduce((s, d) => s + d.value, 0);
      if (total <= 0) continue;

      const ringOuterR = maxR - ri * (ringWidth + ringGap);
      const ringInnerR = ringOuterR - ringWidth;

      let angle = -Math.PI / 2;
      for (let si = 0; si < ringData.length; si++) {
        const d = ringData[si];
        const sweep = (d.value / total) * Math.PI * 2;
        const start = angle;
        const end = angle + sweep;
        angle += sweep;

        const color = d.color || colors[(ri * 6 + si) % colors.length];
        const prog = sliceProgress(si, elapsed);

        let drawEnd = end;
        let dOuterR = ringOuterR;
        let alpha = 0.85;

        if (anim.style === 'sweep' && prog < 1) {
          drawEnd = start + sweep * prog;
        } else if (anim.style === 'grow' && prog < 1) {
          dOuterR = ringInnerR + (ringOuterR - ringInnerR) * prog;
        } else if (anim.style === 'fade' && prog < 1) {
          alpha = prog * 0.85;
        }

        // Store hit regions for outermost ring
        if (ri === 0) {
          if (si === 0) sliceAngles = [];
          sliceAngles.push({ start, end });
        }

        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(start) * ringInnerR, cy + Math.sin(start) * ringInnerR);
        ctx.arc(cx, cy, dOuterR, start, drawEnd);
        ctx.arc(cx, cy, ringInnerR, drawEnd, start, true);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // Legend for outermost ring
    if (showLegend && legendRows > 0) {
      const legendTop = topOffset + diameter + legendGap;
      drawLegend(ctx, outerRingSlices, legendTop, w);
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
      stackedData = [];
      if (anim.enabled) startAnimation(); else drawStatic();
    },
    setStackedData(d) {
      stackedData = d;
      if (anim.enabled) startAnimation(); else drawStatic();
    },
    setOptions(o) {
      const dataChanged = o.data !== undefined || o.stackedData !== undefined;
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
      canvas.removeEventListener('mousemove', () => {});
      canvas.removeEventListener('mouseleave', () => {});
      canvas.removeEventListener('click', () => {});
      canvas.remove();
      tip.remove();
    },
  };
}

// ── Utility ───────────────────────────────────────────────────────────────────

function defaultFormatValue(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return v % 1 === 0 ? `${v}` : `${v.toFixed(2)}`;
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
