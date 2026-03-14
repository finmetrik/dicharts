// ---------------------------------------------------------------------------
// DiCharts – Gauge Chart
// ---------------------------------------------------------------------------
// Semi-circle gauge meter for displaying a value within a range.
// Use cases: Fear & Greed Index, RSI level, portfolio health, etc.
// Canvas2D.
// ---------------------------------------------------------------------------
const DEFAULT_SEGMENTS = [
    { color: '#ef5350', from: 0, to: 25 }, // Extreme Fear
    { color: '#ff9800', from: 25, to: 45 }, // Fear
    { color: '#FFD700', from: 45, to: 55 }, // Neutral
    { color: '#8bc34a', from: 55, to: 75 }, // Greed
    { color: '#26a69a', from: 75, to: 100 }, // Extreme Greed
];
export function createGauge(container, options = {}) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:100%;height:100%;display:block;';
    container.appendChild(canvas);
    const cs = getComputedStyle(container);
    if (cs.position === 'static')
        container.style.position = 'relative';
    let opts = {
        value: options.value ?? 50,
        min: options.min ?? 0,
        max: options.max ?? 100,
        label: options.label ?? '',
        formatValue: options.formatValue ?? ((v) => v.toFixed(0)),
        segments: options.segments ?? DEFAULT_SEGMENTS,
        trackColor: options.trackColor ?? '#2a2e39',
        needleColor: options.needleColor ?? '#e6edf3',
        background: options.background ?? '#1e222d',
        textColor: options.textColor ?? '#e6edf3',
        thickness: options.thickness ?? 0.18,
    };
    let dpr = window.devicePixelRatio || 1;
    function sizeCanvas() {
        dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(container.clientWidth * dpr);
        canvas.height = Math.round(container.clientHeight * dpr);
    }
    sizeCanvas();
    const ro = new ResizeObserver(() => { sizeCanvas(); draw(); });
    ro.observe(container);
    function draw() {
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = opts.background;
        ctx.fillRect(0, 0, w, h);
        const range = opts.max - opts.min || 1;
        // ---- Step 1: Measure min/max label widths so they don't clip ----
        const minMaxFontSize = Math.max(8 * dpr, Math.min(10 * dpr, h * 0.04));
        ctx.font = `${minMaxFontSize}px sans-serif`;
        const minLabelW = ctx.measureText(String(opts.min)).width;
        const maxLabelW = ctx.measureText(String(opts.max)).width;
        const labelMargin = Math.max(minLabelW, maxLabelW) + 8 * dpr;
        // ---- Step 2: Estimate text block height below the arc ----
        const valueFontBase = Math.min(20 * dpr, h * 0.14);
        const labelFontSize = opts.label ? Math.max(9 * dpr, Math.min(11 * dpr, h * 0.06)) : 0;
        const textGap = 14 * dpr; // gap between arc center line and value text
        const textBlockH = textGap + valueFontBase + (labelFontSize > 0 ? 4 * dpr + labelFontSize : 0);
        // ---- Step 3: Size the radius to fit ----
        // Horizontally: radius ≤ (w - 2*labelMargin) / 2
        const maxRadiusW = (w - labelMargin * 2) / 2;
        // Vertically: composition = radius (semicircle top-half) + textBlockH
        const maxRadiusH = h - textBlockH;
        const radius = Math.min(maxRadiusW, maxRadiusH) * 0.82;
        const thick = radius * opts.thickness;
        // ---- Step 4: Vertically center the whole composition ----
        // Composition: top of arc to bottom of text
        // Arc goes from (cy - radius) at top  to  cy at the flat bottom
        // Text goes from cy + textGap  to  cy + textBlockH
        const compositionH = radius + textBlockH;
        const topOffset = (h - compositionH) / 2;
        const cx = w / 2;
        const cy = topOffset + radius; // arc center at the flat bottom of the semicircle
        const startAngle = Math.PI;
        const endAngle = 0;
        const toAngle = (v) => {
            const t = Math.max(0, Math.min(1, (v - opts.min) / range));
            return startAngle + t * Math.PI;
        };
        // ---- Draw track ----
        ctx.strokeStyle = opts.trackColor;
        ctx.lineWidth = thick;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, cy, radius, startAngle, endAngle);
        ctx.stroke();
        // ---- Draw coloured segments ----
        for (const seg of opts.segments) {
            const a0 = toAngle(Math.max(seg.from, opts.min));
            const a1 = toAngle(Math.min(seg.to, opts.max));
            if (a1 <= a0)
                continue;
            ctx.strokeStyle = seg.color;
            ctx.lineWidth = thick;
            ctx.lineCap = 'butt';
            ctx.beginPath();
            ctx.arc(cx, cy, radius, a0, a1);
            ctx.stroke();
        }
        // Round caps at the ends.
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
        // ---- Min / Max labels – below each endpoint, inward-aligned ----
        ctx.font = `${minMaxFontSize}px sans-serif`;
        ctx.fillStyle = opts.textColor;
        ctx.globalAlpha = 0.5;
        ctx.textBaseline = 'top';
        ctx.textAlign = 'center';
        ctx.fillText(String(opts.min), cx - radius, cy + 6 * dpr);
        ctx.fillText(String(opts.max), cx + radius, cy + 6 * dpr);
        ctx.globalAlpha = 1;
        // ---- Needle ----
        const needleAngle = toAngle(opts.value);
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
        // Pivot circle.
        ctx.fillStyle = opts.needleColor;
        ctx.beginPath();
        ctx.arc(cx, cy, 4 * dpr, 0, Math.PI * 2);
        ctx.fill();
        // ---- Value text (centered below arc) ----
        const valueStr = opts.formatValue(opts.value);
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
        // ---- Sub-label ----
        if (opts.label) {
            ctx.font = `${labelFontSize}px sans-serif`;
            ctx.globalAlpha = 0.55;
            ctx.fillText(opts.label, cx, valueY + finalValueFont + 4 * dpr);
            ctx.globalAlpha = 1;
        }
    }
    draw();
    return {
        setValue(value) { opts.value = value; draw(); },
        setOptions(newOpts) { opts = { ...opts, ...newOpts }; draw(); },
        redraw: draw,
        resize() { sizeCanvas(); draw(); },
        dispose() { ro.disconnect(); canvas.remove(); },
    };
}
//# sourceMappingURL=Gauge.js.map