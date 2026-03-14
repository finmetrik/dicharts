// ---------------------------------------------------------------------------
// DiCharts – Depth Chart (Order Book Visualization)
// ---------------------------------------------------------------------------
// Renders bids (green) and asks (red) as mirrored stepped area curves.
// Uses Canvas2D for simplicity -- this chart type doesn't need the
// performance of WebGPU since it typically has <200 price levels.
// ---------------------------------------------------------------------------
export function createDepthChart(container, options = {}) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:100%;height:100%;display:block;';
    container.appendChild(canvas);
    const cs = getComputedStyle(container);
    if (cs.position === 'static')
        container.style.position = 'relative';
    let opts = {
        bids: options.bids ?? [],
        asks: options.asks ?? [],
        bidColor: options.bidColor ?? '#26a69a',
        askColor: options.askColor ?? '#ef5350',
        bidFillColor: options.bidFillColor ?? 'rgba(38, 166, 154, 0.15)',
        askFillColor: options.askFillColor ?? 'rgba(239, 83, 80, 0.15)',
        midPrice: options.midPrice ?? 0,
        background: options.background ?? '#131722',
        textColor: options.textColor ?? '#787b86',
        gridColor: options.gridColor ?? 'rgba(255,255,255,0.06)',
        showLabels: options.showLabels ?? true,
    };
    let dpr = window.devicePixelRatio || 1;
    function sizeCanvas() {
        dpr = window.devicePixelRatio || 1;
        const w = container.clientWidth;
        const h = container.clientHeight;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
    }
    sizeCanvas();
    const ro = new ResizeObserver(() => { sizeCanvas(); draw(); });
    ro.observe(container);
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
        const bids = opts.bids;
        const asks = opts.asks;
        if (bids.length === 0 && asks.length === 0)
            return;
        // Compute cumulative volumes.
        const bidCum = [];
        let cumB = 0;
        for (const b of bids) {
            cumB += b.quantity;
            bidCum.push({ price: b.price, cum: cumB });
        }
        const askCum = [];
        let cumA = 0;
        for (const a of asks) {
            cumA += a.quantity;
            askCum.push({ price: a.price, cum: cumA });
        }
        const maxCum = Math.max(cumB, cumA) || 1;
        // Price range.
        const allPrices = [...bids.map(b => b.price), ...asks.map(a => a.price)];
        const pMin = Math.min(...allPrices);
        const pMax = Math.max(...allPrices);
        const pRange = pMax - pMin || 1;
        // Layout: margins.
        const marginLeft = 10 * dpr;
        const marginRight = 10 * dpr;
        const marginTop = 10 * dpr;
        const marginBottom = opts.showLabels ? 28 * dpr : 10 * dpr;
        const plotW = w - marginLeft - marginRight;
        const plotH = h - marginTop - marginBottom;
        const toX = (price) => marginLeft + ((price - pMin) / pRange) * plotW;
        const toY = (cum) => marginTop + plotH - (cum / maxCum) * plotH;
        // Grid lines.
        ctx.strokeStyle = opts.gridColor;
        ctx.lineWidth = dpr * 0.5;
        for (let i = 0; i <= 4; i++) {
            const y = marginTop + (plotH / 4) * i;
            ctx.beginPath();
            ctx.moveTo(marginLeft, y);
            ctx.lineTo(marginLeft + plotW, y);
            ctx.stroke();
        }
        // ----- Draw bids (left side, stepped) -----
        if (bidCum.length > 0) {
            // Fill.
            ctx.fillStyle = opts.bidFillColor;
            ctx.beginPath();
            ctx.moveTo(toX(bidCum[0].price), toY(0));
            for (let i = 0; i < bidCum.length; i++) {
                const x = toX(bidCum[i].price);
                const y = toY(bidCum[i].cum);
                if (i > 0) {
                    ctx.lineTo(x, toY(bidCum[i - 1].cum)); // horizontal step
                }
                ctx.lineTo(x, y);
            }
            const lastBid = bidCum[bidCum.length - 1];
            ctx.lineTo(toX(lastBid.price), toY(0));
            ctx.closePath();
            ctx.fill();
            // Line.
            ctx.strokeStyle = opts.bidColor;
            ctx.lineWidth = 2 * dpr;
            ctx.beginPath();
            for (let i = 0; i < bidCum.length; i++) {
                const x = toX(bidCum[i].price);
                const y = toY(bidCum[i].cum);
                if (i === 0) {
                    ctx.moveTo(x, y);
                }
                else {
                    ctx.lineTo(x, toY(bidCum[i - 1].cum));
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
        }
        // ----- Draw asks (right side, stepped) -----
        if (askCum.length > 0) {
            ctx.fillStyle = opts.askFillColor;
            ctx.beginPath();
            ctx.moveTo(toX(askCum[0].price), toY(0));
            for (let i = 0; i < askCum.length; i++) {
                const x = toX(askCum[i].price);
                const y = toY(askCum[i].cum);
                if (i > 0) {
                    ctx.lineTo(x, toY(askCum[i - 1].cum));
                }
                ctx.lineTo(x, y);
            }
            const lastAsk = askCum[askCum.length - 1];
            ctx.lineTo(toX(lastAsk.price), toY(0));
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = opts.askColor;
            ctx.lineWidth = 2 * dpr;
            ctx.beginPath();
            for (let i = 0; i < askCum.length; i++) {
                const x = toX(askCum[i].price);
                const y = toY(askCum[i].cum);
                if (i === 0) {
                    ctx.moveTo(x, y);
                }
                else {
                    ctx.lineTo(x, toY(askCum[i - 1].cum));
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
        }
        // Mid price line.
        const mid = opts.midPrice || (bids.length && asks.length ? (bids[0].price + asks[0].price) / 2 : 0);
        if (mid > pMin && mid < pMax) {
            ctx.strokeStyle = opts.textColor;
            ctx.lineWidth = dpr;
            ctx.setLineDash([4 * dpr, 3 * dpr]);
            const mx = toX(mid);
            ctx.beginPath();
            ctx.moveTo(mx, marginTop);
            ctx.lineTo(mx, marginTop + plotH);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        // X-axis price labels.
        if (opts.showLabels) {
            ctx.fillStyle = opts.textColor;
            ctx.font = `${10 * dpr}px sans-serif`;
            ctx.textAlign = 'center';
            const labelCount = 7;
            for (let i = 0; i <= labelCount; i++) {
                const p = pMin + (pRange / labelCount) * i;
                const x = toX(p);
                ctx.fillText(p.toFixed(2), x, marginTop + plotH + 16 * dpr);
            }
        }
    }
    draw();
    // ----- Public API -----
    return {
        update(bids, asks) {
            opts.bids = bids;
            opts.asks = asks;
            draw();
        },
        setOptions(newOpts) {
            opts = { ...opts, ...newOpts };
            draw();
        },
        redraw: draw,
        resize() { sizeCanvas(); draw(); },
        dispose() {
            ro.disconnect();
            canvas.remove();
        },
    };
}
//# sourceMappingURL=DepthChart.js.map