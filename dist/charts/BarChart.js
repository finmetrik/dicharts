// ---------------------------------------------------------------------------
// DiCharts – Bar Chart
// ---------------------------------------------------------------------------
// Simple vertical bar chart for comparing values: PnL by day, returns by
// asset, volume by exchange, etc. Supports grouped bars and positive/negative
// colouring. Canvas2D.
// ---------------------------------------------------------------------------
export function createBarChart(container, options = {}) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:100%;height:100%;display:block;cursor:pointer;';
    container.appendChild(canvas);
    const cs = getComputedStyle(container);
    if (cs.position === 'static')
        container.style.position = 'relative';
    let opts = {
        data: options.data ?? [],
        autoColor: options.autoColor ?? true,
        positiveColor: options.positiveColor ?? '#26a69a',
        negativeColor: options.negativeColor ?? '#ef5350',
        barColor: options.barColor ?? '#2962ff',
        background: options.background ?? '#1e222d',
        textColor: options.textColor ?? '#e6edf3',
        gridColor: options.gridColor ?? 'rgba(255,255,255,0.06)',
        gap: options.gap ?? 0.3,
        borderRadius: options.borderRadius ?? 3,
        showValues: options.showValues ?? true,
        showLabels: options.showLabels ?? true,
        onClick: options.onClick ?? (() => { }),
    };
    let dpr = window.devicePixelRatio || 1;
    let barRects = [];
    function sizeCanvas() {
        dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(container.clientWidth * dpr);
        canvas.height = Math.round(container.clientHeight * dpr);
    }
    sizeCanvas();
    const ro = new ResizeObserver(() => { sizeCanvas(); draw(); });
    ro.observe(container);
    // Click handler.
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const cx = (e.clientX - rect.left) * dpr;
        const cy = (e.clientY - rect.top) * dpr;
        for (const br of barRects) {
            if (cx >= br.x && cx <= br.x + br.w && cy >= br.y && cy <= br.y + br.h) {
                opts.onClick(opts.data[br.idx]);
                break;
            }
        }
    });
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
        barRects = [];
        // Margins.
        const mLeft = 50 * dpr;
        const mRight = 16 * dpr;
        const mTop = 20 * dpr;
        const mBottom = opts.showLabels ? 36 * dpr : 12 * dpr;
        const plotW = w - mLeft - mRight;
        const plotH = h - mTop - mBottom;
        // Value range.
        let vMin = 0, vMax = 0;
        for (const d of data) {
            if (d.value < vMin)
                vMin = d.value;
            if (d.value > vMax)
                vMax = d.value;
        }
        // Ensure zero is always visible.
        if (vMin > 0)
            vMin = 0;
        if (vMax < 0)
            vMax = 0;
        const vRange = vMax - vMin || 1;
        // Add 10% padding.
        vMax += vRange * 0.1;
        vMin -= vRange * 0.1;
        const totalRange = vMax - vMin;
        const toY = (v) => mTop + (1 - (v - vMin) / totalRange) * plotH;
        const zeroY = toY(0);
        // Grid lines.
        ctx.strokeStyle = opts.gridColor;
        ctx.lineWidth = dpr * 0.5;
        const gridLines = 5;
        for (let i = 0; i <= gridLines; i++) {
            const v = vMin + (totalRange / gridLines) * i;
            const y = toY(v);
            ctx.beginPath();
            ctx.moveTo(mLeft, y);
            ctx.lineTo(mLeft + plotW, y);
            ctx.stroke();
            // Y-axis labels.
            ctx.fillStyle = opts.textColor;
            ctx.globalAlpha = 0.6;
            ctx.font = `${9 * dpr}px sans-serif`;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(formatNum(v), mLeft - 6 * dpr, y);
            ctx.globalAlpha = 1;
        }
        // Zero line (if in range).
        if (vMin < 0 && vMax > 0) {
            ctx.strokeStyle = opts.textColor;
            ctx.globalAlpha = 0.3;
            ctx.lineWidth = dpr;
            ctx.beginPath();
            ctx.moveTo(mLeft, zeroY);
            ctx.lineTo(mLeft + plotW, zeroY);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
        // Bars.
        const n = data.length;
        const totalBarW = plotW / n;
        const gapPx = totalBarW * opts.gap;
        const barW = totalBarW - gapPx;
        const br = Math.min(opts.borderRadius * dpr, barW / 2);
        for (let i = 0; i < n; i++) {
            const d = data[i];
            const x = mLeft + i * totalBarW + gapPx / 2;
            const valY = toY(d.value);
            let color;
            if (d.color) {
                color = d.color;
            }
            else if (opts.autoColor) {
                color = d.value >= 0 ? opts.positiveColor : opts.negativeColor;
            }
            else {
                color = opts.barColor;
            }
            const barTop = d.value >= 0 ? valY : zeroY;
            const barH = Math.abs(valY - zeroY);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.roundRect(x, barTop, barW, barH, [
                d.value >= 0 ? br : 0,
                d.value >= 0 ? br : 0,
                d.value < 0 ? br : 0,
                d.value < 0 ? br : 0,
            ]);
            ctx.fill();
            barRects.push({ x, y: barTop, w: barW, h: barH, idx: i });
            // Value label on top.
            if (opts.showValues && barH > 4 * dpr) {
                ctx.fillStyle = opts.textColor;
                ctx.font = `bold ${9 * dpr}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = d.value >= 0 ? 'bottom' : 'top';
                const labelY = d.value >= 0 ? barTop - 3 * dpr : barTop + barH + 3 * dpr;
                ctx.fillText(formatNum(d.value), x + barW / 2, labelY, barW);
            }
            // X-axis label.
            if (opts.showLabels) {
                ctx.fillStyle = opts.textColor;
                ctx.globalAlpha = 0.7;
                ctx.font = `${9 * dpr}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillText(d.label, x + barW / 2, mTop + plotH + 8 * dpr, totalBarW);
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
function formatNum(v) {
    if (Math.abs(v) >= 1e9)
        return `${(v / 1e9).toFixed(1)}B`;
    if (Math.abs(v) >= 1e6)
        return `${(v / 1e6).toFixed(1)}M`;
    if (Math.abs(v) >= 1e3)
        return `${(v / 1e3).toFixed(1)}K`;
    return v.toFixed(v % 1 === 0 ? 0 : 2);
}
//# sourceMappingURL=BarChart.js.map