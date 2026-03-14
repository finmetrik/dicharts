// ---------------------------------------------------------------------------
// DiCharts – Sparkline
// ---------------------------------------------------------------------------
// A tiny inline chart with no axes, labels, or interaction. Designed for
// watchlists, tables, dashboards. Renders a close-price polyline with
// optional gradient fill. Uses Canvas2D.
// ---------------------------------------------------------------------------
export function createSparkline(container, options = {}) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:100%;height:100%;display:block;';
    container.appendChild(canvas);
    let opts = {
        data: options.data ?? [],
        lineColor: options.lineColor ?? '',
        fillColor: options.fillColor ?? '',
        lineWidth: options.lineWidth ?? 1.5,
        upColor: options.upColor ?? '#26a69a',
        downColor: options.downColor ?? '#ef5350',
        background: options.background ?? 'transparent',
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
        if (opts.background !== 'transparent') {
            ctx.fillStyle = opts.background;
            ctx.fillRect(0, 0, w, h);
        }
        const data = opts.data;
        if (data.length < 2)
            return;
        // Auto color.
        const isUp = data[data.length - 1] >= data[0];
        const lineColor = opts.lineColor || (isUp ? opts.upColor : opts.downColor);
        // Compute range.
        let vMin = Infinity, vMax = -Infinity;
        for (const v of data) {
            if (v < vMin)
                vMin = v;
            if (v > vMax)
                vMax = v;
        }
        const range = vMax - vMin || 1;
        // Small padding.
        const padX = 2 * dpr;
        const padY = 2 * dpr;
        const plotW = w - padX * 2;
        const plotH = h - padY * 2;
        const toX = (i) => padX + (i / (data.length - 1)) * plotW;
        const toY = (v) => padY + (1 - (v - vMin) / range) * plotH;
        // Build path.
        ctx.beginPath();
        ctx.moveTo(toX(0), toY(data[0]));
        for (let i = 1; i < data.length; i++) {
            ctx.lineTo(toX(i), toY(data[i]));
        }
        // Fill.
        const fillColor = opts.fillColor || (lineColor + '30'); // 30 hex = ~19% opacity
        if (fillColor !== 'none') {
            ctx.save();
            // Clone path and close to bottom.
            const fillPath = new Path2D();
            fillPath.moveTo(toX(0), toY(data[0]));
            for (let i = 1; i < data.length; i++) {
                fillPath.lineTo(toX(i), toY(data[i]));
            }
            fillPath.lineTo(toX(data.length - 1), h);
            fillPath.lineTo(toX(0), h);
            fillPath.closePath();
            // Gradient.
            const grad = ctx.createLinearGradient(0, 0, 0, h);
            grad.addColorStop(0, fillColor);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fill(fillPath);
            ctx.restore();
        }
        // Line.
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = opts.lineWidth * dpr;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();
    }
    draw();
    return {
        setData(data) { opts.data = data; draw(); },
        setOptions(newOpts) {
            opts = { ...opts, ...newOpts };
            draw();
        },
        redraw: draw,
        resize() { sizeCanvas(); draw(); },
        dispose() { ro.disconnect(); canvas.remove(); },
    };
}
//# sourceMappingURL=Sparkline.js.map