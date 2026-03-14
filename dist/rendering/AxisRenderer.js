// ---------------------------------------------------------------------------
// DiCharts – Axis Renderer
// ---------------------------------------------------------------------------
// Renders price (y) and time (x) axis labels as positioned DOM elements
// and thin separator lines via the grid shader.  Tick marks are computed
// using a "nice numbers" algorithm.
// ---------------------------------------------------------------------------
import { toRange } from '../scene/Scale';
// ---------------------------------------------------------------------------
// Nice‑number tick generation
// ---------------------------------------------------------------------------
/** Compute "nice" evenly‑spaced ticks for a linear axis. */
export function computeTicks(min, max, approxCount) {
    if (!isFinite(min) || !isFinite(max) || min >= max)
        return [];
    const range = max - min;
    const rawStep = range / Math.max(1, approxCount);
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const residual = rawStep / mag;
    let niceStep;
    if (residual <= 1.5)
        niceStep = 1 * mag;
    else if (residual <= 3)
        niceStep = 2 * mag;
    else if (residual <= 7)
        niceStep = 5 * mag;
    else
        niceStep = 10 * mag;
    const first = Math.ceil(min / niceStep) * niceStep;
    const ticks = [];
    for (let v = first; v <= max + niceStep * 0.001; v += niceStep) {
        ticks.push(v);
    }
    return ticks;
}
/** Pick the number of decimal places needed to display `step` cleanly. */
function precisionForStep(step) {
    if (step >= 1)
        return 0;
    return Math.max(0, -Math.floor(Math.log10(step)) + 1);
}
// ---------------------------------------------------------------------------
// Time formatting
// ---------------------------------------------------------------------------
function formatTimestamp(ts) {
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const mon = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${mon}/${day} ${hh}:${mm}`;
}
export function createAxisRenderer(container) {
    // We append a DOM overlay that sits on top of the canvas.
    const overlay = document.createElement('div');
    overlay.style.cssText =
        'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;';
    container.appendChild(overlay);
    // Pooled label elements.
    const pool = [];
    let poolIdx = 0;
    function acquireLabel() {
        if (poolIdx < pool.length) {
            const el = pool[poolIdx++];
            el.style.display = '';
            return el;
        }
        const el = document.createElement('div');
        el.style.cssText =
            'position:absolute;font-size:11px;line-height:1;white-space:nowrap;pointer-events:none;';
        overlay.appendChild(el);
        pool.push(el);
        poolIdx++;
        return el;
    }
    function resetPool() {
        // Hide unused labels from previous frame.
        for (let i = poolIdx; i < pool.length; i++) {
            pool[i].style.display = 'none';
        }
        poolIdx = 0;
    }
    // Separator line element.
    const sepV = document.createElement('div');
    sepV.style.cssText = 'position:absolute;top:0;width:1px;pointer-events:none;';
    overlay.appendChild(sepV);
    const sepH = document.createElement('div');
    sepH.style.cssText = 'position:absolute;left:0;height:1px;pointer-events:none;';
    overlay.appendChild(sepH);
    function update(layout, xScale, yScale, options, theme) {
        resetPool();
        const plot = layout.plot;
        const dpr = layout.dpr;
        const textColor = theme.axisTextColor;
        const borderColor = theme.axisBorderColor;
        // --- Price axis (Y) ---
        const approxYTicks = Math.max(2, Math.floor(plot.height / 60));
        const priceTicks = computeTicks(yScale.domainMin, yScale.domainMax, approxYTicks);
        const pricePrec = priceTicks.length > 1
            ? precisionForStep(priceTicks[1] - priceTicks[0])
            : 2;
        if (options.priceAxis.visible) {
            const isRight = options.priceAxis.position === 'right';
            // Separator line.
            sepV.style.display = '';
            sepV.style.height = `${plot.height}px`;
            sepV.style.top = `${plot.y}px`;
            sepV.style.left = isRight ? `${plot.x + plot.width}px` : `${plot.x}px`;
            sepV.style.backgroundColor = borderColor;
            for (const v of priceTicks) {
                // toRange returns device pixels; convert to CSS pixels for DOM positioning.
                const pyCss = toRange(yScale, v) / dpr;
                if (pyCss < plot.y - 5 || pyCss > plot.y + plot.height + 5)
                    continue;
                const lbl = acquireLabel();
                lbl.textContent = v.toFixed(pricePrec);
                lbl.style.color = textColor;
                lbl.style.top = `${pyCss - 6}px`;
                if (isRight) {
                    lbl.style.left = `${plot.x + plot.width + 6}px`;
                    lbl.style.right = '';
                }
                else {
                    lbl.style.right = `${layout.cssWidth - plot.x + 6}px`;
                    lbl.style.left = '';
                }
            }
        }
        else {
            sepV.style.display = 'none';
        }
        // --- Time axis (X) ---
        const approxXTicks = Math.max(2, Math.floor(plot.width / 120));
        const timeTicks = computeTicks(xScale.domainMin, xScale.domainMax, approxXTicks);
        if (options.timeAxis.visible) {
            sepH.style.display = '';
            sepH.style.width = `${plot.width}px`;
            sepH.style.top = `${plot.y + plot.height}px`;
            sepH.style.left = `${plot.x}px`;
            sepH.style.backgroundColor = borderColor;
            for (const ts of timeTicks) {
                // toRange returns device pixels; convert to CSS pixels for DOM positioning.
                const pxCss = toRange(xScale, ts) / dpr;
                if (pxCss < plot.x - 20 || pxCss > plot.x + plot.width + 20)
                    continue;
                const lbl = acquireLabel();
                lbl.textContent = formatTimestamp(ts);
                lbl.style.color = textColor;
                lbl.style.top = `${plot.y + plot.height + 6}px`;
                lbl.style.left = `${pxCss - 30}px`;
            }
        }
        else {
            sepH.style.display = 'none';
        }
        return { priceTicks, timeTicks };
    }
    function dispose() {
        overlay.remove();
    }
    return { update, dispose };
}
//# sourceMappingURL=AxisRenderer.js.map