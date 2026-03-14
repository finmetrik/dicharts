// ---------------------------------------------------------------------------
// DiCharts – Donut / Pie Chart
// ---------------------------------------------------------------------------
// Renders a donut or pie chart for portfolio allocation, token distribution,
// etc. Canvas2D. Supports hover highlighting, labels, and legend.
// ---------------------------------------------------------------------------
const DEFAULT_COLORS = [
    '#2962ff', '#26a69a', '#ef5350', '#FFD700', '#A78BFA',
    '#F472B6', '#4ECDC4', '#FF6B6B', '#38bdf8', '#fb923c',
    '#a3e635', '#e879f9',
];
export function createDonutChart(container, options = {}) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:100%;height:100%;display:block;cursor:pointer;';
    container.appendChild(canvas);
    const cs = getComputedStyle(container);
    if (cs.position === 'static')
        container.style.position = 'relative';
    let opts = {
        data: options.data ?? [],
        innerRadius: options.innerRadius ?? 0.55,
        colors: options.colors ?? DEFAULT_COLORS,
        background: options.background ?? '#1e222d',
        textColor: options.textColor ?? '#e6edf3',
        showLabels: options.showLabels ?? true,
        showLegend: options.showLegend ?? true,
        onClick: options.onClick ?? (() => { }),
    };
    let dpr = window.devicePixelRatio || 1;
    let hoveredIdx = -1;
    function sizeCanvas() {
        dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(container.clientWidth * dpr);
        canvas.height = Math.round(container.clientHeight * dpr);
    }
    sizeCanvas();
    const ro = new ResizeObserver(() => { sizeCanvas(); draw(); });
    ro.observe(container);
    // ----- Hover / Click -----
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const cx = (e.clientX - rect.left) * dpr;
        const cy = (e.clientY - rect.top) * dpr;
        const idx = hitTest(cx, cy);
        if (idx !== hoveredIdx) {
            hoveredIdx = idx;
            draw();
        }
    });
    canvas.addEventListener('mouseleave', () => {
        if (hoveredIdx !== -1) {
            hoveredIdx = -1;
            draw();
        }
    });
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const cx = (e.clientX - rect.left) * dpr;
        const cy = (e.clientY - rect.top) * dpr;
        const idx = hitTest(cx, cy);
        if (idx >= 0)
            opts.onClick(opts.data[idx]);
    });
    let chartCx = 0, chartCy = 0, outerR = 0, innerR = 0;
    let sliceAngles = [];
    function hitTest(x, y) {
        const dx = x - chartCx;
        const dy = y - chartCy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < innerR || dist > outerR + 8 * dpr)
            return -1;
        let angle = Math.atan2(dy, dx);
        if (angle < -Math.PI / 2)
            angle += Math.PI * 2;
        for (let i = 0; i < sliceAngles.length; i++) {
            if (angle >= sliceAngles[i].start && angle < sliceAngles[i].end)
                return i;
        }
        return -1;
    }
    // ----- Drawing -----
    function draw() {
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = opts.background;
        ctx.fillRect(0, 0, w, h);
        const data = opts.data;
        if (data.length === 0)
            return;
        const total = data.reduce((s, d) => s + d.value, 0);
        if (total <= 0)
            return;
        // ---- Step 1: Measure legend height ----
        const legendRowH = 18 * dpr;
        const legendRows = opts.showLegend ? Math.ceil(Math.min(data.length, 12) / 6) : 0;
        const legendGap = opts.showLegend ? 10 * dpr : 0; // gap between donut and legend
        const legendBlockH = legendRows * legendRowH;
        // ---- Step 2: Size the donut to fill available space ----
        const hoverPad = 8 * dpr; // room for hover expansion
        const availH = h - legendGap - legendBlockH - hoverPad * 2;
        const availW = w - hoverPad * 2;
        const diameter = Math.min(availW, availH);
        outerR = diameter / 2;
        innerR = outerR * opts.innerRadius;
        // ---- Step 3: Vertically center the donut+legend composition ----
        const compositionH = diameter + legendGap + legendBlockH;
        const topOffset = (h - compositionH) / 2;
        chartCx = w / 2;
        chartCy = topOffset + outerR;
        // ---- Compute slice angles ----
        sliceAngles = [];
        let angle = -Math.PI / 2; // start at top
        for (const d of data) {
            const sweep = (d.value / total) * Math.PI * 2;
            sliceAngles.push({ start: angle, end: angle + sweep });
            angle += sweep;
        }
        // ---- Draw slices ----
        for (let i = 0; i < data.length; i++) {
            const { start, end } = sliceAngles[i];
            const color = data[i].color || opts.colors[i % opts.colors.length];
            const isHovered = i === hoveredIdx;
            const r = isHovered ? outerR + 6 * dpr : outerR;
            ctx.fillStyle = color;
            ctx.globalAlpha = isHovered ? 1 : 0.85;
            ctx.beginPath();
            ctx.moveTo(chartCx + Math.cos(start) * innerR, chartCy + Math.sin(start) * innerR);
            ctx.arc(chartCx, chartCy, r, start, end);
            ctx.arc(chartCx, chartCy, innerR, end, start, true);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        // ---- Percentage labels on slices ----
        if (opts.showLabels) {
            ctx.fillStyle = opts.textColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const labelR = (outerR + innerR) / 2;
            for (let i = 0; i < data.length; i++) {
                const pct = (data[i].value / total) * 100;
                if (pct < 4)
                    continue;
                const mid = (sliceAngles[i].start + sliceAngles[i].end) / 2;
                const lx = chartCx + Math.cos(mid) * labelR;
                const ly = chartCy + Math.sin(mid) * labelR;
                const fontSize = Math.max(9 * dpr, Math.min(11 * dpr, outerR * 0.11));
                ctx.font = `bold ${fontSize}px sans-serif`;
                ctx.fillText(`${pct.toFixed(1)}%`, lx, ly);
            }
        }
        // ---- Center label (total or hovered) ----
        if (opts.innerRadius > 0) {
            ctx.fillStyle = opts.textColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            if (hoveredIdx >= 0) {
                const d = data[hoveredIdx];
                const pct = (d.value / total) * 100;
                ctx.font = `bold ${Math.max(11 * dpr, innerR * 0.3)}px sans-serif`;
                ctx.fillText(d.label, chartCx, chartCy - innerR * 0.12);
                ctx.font = `${Math.max(9 * dpr, innerR * 0.22)}px sans-serif`;
                ctx.globalAlpha = 0.7;
                ctx.fillText(`${pct.toFixed(1)}%`, chartCx, chartCy + innerR * 0.18);
                ctx.globalAlpha = 1;
            }
            else {
                ctx.font = `${Math.max(9 * dpr, innerR * 0.2)}px sans-serif`;
                ctx.globalAlpha = 0.5;
                ctx.fillText('Total', chartCx, chartCy - innerR * 0.12);
                ctx.globalAlpha = 1;
                ctx.font = `bold ${Math.max(11 * dpr, innerR * 0.3)}px sans-serif`;
                ctx.fillText(formatValue(total), chartCx, chartCy + innerR * 0.18);
            }
        }
        // ---- Legend (centered horizontally, positioned right below donut) ----
        if (opts.showLegend && legendRows > 0) {
            const legendTop = topOffset + diameter + legendGap;
            const colsPerRow = Math.min(data.length, 6);
            const itemW = Math.min(110 * dpr, (w - 24 * dpr) / colsPerRow);
            const totalLegendW = itemW * colsPerRow;
            const startX = (w - totalLegendW) / 2;
            ctx.font = `${10 * dpr}px sans-serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            for (let i = 0; i < data.length && i < 12; i++) {
                const col = i % colsPerRow;
                const row = Math.floor(i / colsPerRow);
                const x = startX + col * itemW;
                const y = legendTop + row * legendRowH + legendRowH / 2;
                const color = data[i].color || opts.colors[i % opts.colors.length];
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(x + 4 * dpr, y, 4 * dpr, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = opts.textColor;
                ctx.globalAlpha = 0.85;
                ctx.fillText(data[i].label, x + 12 * dpr, y, itemW - 16 * dpr);
                ctx.globalAlpha = 1;
            }
        }
    }
    draw();
    return {
        setData(data) { opts.data = data; draw(); },
        setOptions(newOpts) { opts = { ...opts, ...newOpts }; draw(); },
        redraw: draw,
        resize() { sizeCanvas(); draw(); },
        dispose() { ro.disconnect(); canvas.remove(); },
    };
}
function formatValue(v) {
    if (v >= 1e12)
        return `$${(v / 1e12).toFixed(1)}T`;
    if (v >= 1e9)
        return `$${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6)
        return `$${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3)
        return `$${(v / 1e3).toFixed(1)}K`;
    return `$${v.toFixed(2)}`;
}
//# sourceMappingURL=DonutChart.js.map