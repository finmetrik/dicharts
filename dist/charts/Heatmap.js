// ---------------------------------------------------------------------------
// DiCharts – Heatmap / Treemap Chart
// ---------------------------------------------------------------------------
// Renders a treemap of colored rectangles sized by a "weight" value (e.g.
// market cap) and colored by a "change" value (e.g. 24h % change).
// Similar to finviz.com market map or CoinGecko's heatmap.
// Uses Canvas2D with a squarified treemap layout algorithm.
// ---------------------------------------------------------------------------
function layoutTreemap(items, x, y, w, h, gap) {
    if (items.length === 0)
        return [];
    // Sort by weight descending.
    const sorted = items.slice().sort((a, b) => b.weight - a.weight);
    const totalWeight = sorted.reduce((s, i) => s + i.weight, 0);
    if (totalWeight <= 0)
        return [];
    const rects = [];
    squarify(sorted, [], x, y, w, h, totalWeight, rects, gap);
    return rects;
}
function squarify(children, row, x, y, w, h, totalArea, out, gap) {
    if (children.length === 0) {
        layoutRow(row, x, y, w, h, totalArea, out, gap);
        return;
    }
    const area = w * h;
    const c = children[0];
    const newRow = [...row, c];
    if (row.length === 0 || worst(newRow, w, h, area, totalArea) <= worst(row, w, h, area, totalArea)) {
        squarify(children.slice(1), newRow, x, y, w, h, totalArea, out, gap);
    }
    else {
        const rowWeight = row.reduce((s, i) => s + i.weight, 0);
        const fraction = rowWeight / totalArea;
        const isWide = w >= h;
        if (isWide) {
            const rowW = fraction * w;
            layoutRow(row, x, y, rowW, h, totalArea, out, gap);
            squarify(children, [], x + rowW, y, w - rowW, h, totalArea - rowWeight, out, gap);
        }
        else {
            const rowH = fraction * h;
            layoutRow(row, x, y, w, rowH, totalArea, out, gap);
            squarify(children, [], x, y + rowH, w, h - rowH, totalArea - rowWeight, out, gap);
        }
    }
}
function worst(row, w, h, area, totalArea) {
    const rowWeight = row.reduce((s, i) => s + i.weight, 0);
    const fraction = rowWeight / totalArea;
    const isWide = w >= h;
    const side = isWide ? fraction * w : fraction * h;
    if (side <= 0)
        return Infinity;
    let maxR = 0;
    for (const item of row) {
        const itemFrac = item.weight / rowWeight;
        const other = isWide ? itemFrac * h : itemFrac * w;
        const r = Math.max(side / other, other / side);
        if (r > maxR)
            maxR = r;
    }
    return maxR;
}
function layoutRow(row, x, y, w, h, totalArea, out, gap) {
    if (row.length === 0)
        return;
    const rowWeight = row.reduce((s, i) => s + i.weight, 0);
    const isWide = w >= h;
    let offset = 0;
    for (const item of row) {
        const frac = item.weight / rowWeight;
        let rx, ry, rw, rh;
        if (isWide) {
            rh = frac * h;
            rw = w;
            rx = x;
            ry = y + offset;
            offset += rh;
        }
        else {
            rw = frac * w;
            rh = h;
            rx = x + offset;
            ry = y;
            offset += rw;
        }
        // Apply gap.
        const g = gap / 2;
        out.push({
            x: rx + g,
            y: ry + g,
            w: Math.max(0, rw - gap),
            h: Math.max(0, rh - gap),
            item,
        });
    }
}
// ---------------------------------------------------------------------------
// Color interpolation
// ---------------------------------------------------------------------------
function changeToColor(change, maxChange, posColor, negColor, neutralColor) {
    const t = Math.min(1, Math.abs(change) / maxChange);
    const target = change >= 0 ? posColor : negColor;
    return lerpColor(neutralColor, target, t);
}
function lerpColor(a, b, t) {
    const ca = parseHex(a);
    const cb = parseHex(b);
    const r = Math.round(ca[0] + (cb[0] - ca[0]) * t);
    const g = Math.round(ca[1] + (cb[1] - ca[1]) * t);
    const bl = Math.round(ca[2] + (cb[2] - ca[2]) * t);
    return `rgb(${r},${g},${bl})`;
}
function parseHex(hex) {
    let h = hex.replace('#', '');
    if (h.length === 3)
        h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}
// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------
export function createHeatmap(container, options = {}) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:100%;height:100%;display:block;cursor:pointer;';
    container.appendChild(canvas);
    const cs = getComputedStyle(container);
    if (cs.position === 'static')
        container.style.position = 'relative';
    let opts = {
        data: options.data ?? [],
        maxChange: options.maxChange ?? 10,
        positiveColor: options.positiveColor ?? '#26a69a',
        negativeColor: options.negativeColor ?? '#ef5350',
        neutralColor: options.neutralColor ?? '#2a2e39',
        background: options.background ?? '#131722',
        textColor: options.textColor ?? '#e6edf3',
        borderColor: options.borderColor ?? '#131722',
        gap: options.gap ?? 2,
        borderRadius: options.borderRadius ?? 3,
        onClick: options.onClick ?? (() => { }),
    };
    let dpr = window.devicePixelRatio || 1;
    let rects = [];
    function sizeCanvas() {
        dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(container.clientWidth * dpr);
        canvas.height = Math.round(container.clientHeight * dpr);
    }
    sizeCanvas();
    const ro = new ResizeObserver(() => { sizeCanvas(); draw(); });
    ro.observe(container);
    // ----- Click handling -----
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const cx = (e.clientX - rect.left) * dpr;
        const cy = (e.clientY - rect.top) * dpr;
        for (const r of rects) {
            if (cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h) {
                opts.onClick(r.item);
                break;
            }
        }
    });
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
        const gap = opts.gap * dpr;
        const br = opts.borderRadius * dpr;
        rects = layoutTreemap(opts.data, 0, 0, w, h, gap);
        for (const r of rects) {
            if (r.w < 1 || r.h < 1)
                continue;
            const color = changeToColor(r.item.change, opts.maxChange, opts.positiveColor, opts.negativeColor, opts.neutralColor);
            // Rounded rectangle.
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.roundRect(r.x, r.y, r.w, r.h, br);
            ctx.fill();
            // Labels (only if cell is large enough).
            ctx.fillStyle = opts.textColor;
            const minW = 40 * dpr;
            const minH = 28 * dpr;
            if (r.w >= minW && r.h >= minH) {
                // Main label.
                const fontSize = Math.min(14 * dpr, r.w / 4, r.h / 3);
                ctx.font = `bold ${fontSize}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const centerX = r.x + r.w / 2;
                let centerY = r.y + r.h / 2;
                // If we have room for sublabel, shift main label up.
                const hasSub = r.h >= minH * 1.5;
                if (hasSub)
                    centerY -= fontSize * 0.4;
                ctx.fillText(r.item.label, centerX, centerY, r.w - 8 * dpr);
                // Change percentage.
                if (hasSub) {
                    const subSize = fontSize * 0.7;
                    ctx.font = `${subSize}px sans-serif`;
                    const sign = r.item.change >= 0 ? '+' : '';
                    ctx.fillText(`${sign}${r.item.change.toFixed(2)}%`, centerX, centerY + fontSize * 0.9, r.w - 8 * dpr);
                }
                // Sublabel (e.g. price).
                if (r.item.sublabel && r.h >= minH * 2) {
                    const subSize = fontSize * 0.55;
                    ctx.font = `${subSize}px sans-serif`;
                    ctx.globalAlpha = 0.7;
                    ctx.fillText(r.item.sublabel, centerX, centerY + fontSize * 1.6, r.w - 8 * dpr);
                    ctx.globalAlpha = 1;
                }
            }
            else if (r.w >= 20 * dpr && r.h >= 14 * dpr) {
                // Tiny cell: just label.
                const fontSize = Math.min(9 * dpr, r.w / 3, r.h * 0.7);
                ctx.font = `bold ${fontSize}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(r.item.label, r.x + r.w / 2, r.y + r.h / 2, r.w - 4 * dpr);
            }
        }
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
//# sourceMappingURL=Heatmap.js.map