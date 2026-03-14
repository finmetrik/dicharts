// ---------------------------------------------------------------------------
// DiCharts – Candle Hit‑Testing
// ---------------------------------------------------------------------------
// Given a pointer position in CSS pixels, determines which candle (if any)
// the cursor is hovering over.  Uses binary search for performance.
// ---------------------------------------------------------------------------
import { toRange } from '../scene/Scale';
function asOHLC(p) {
    if (Array.isArray(p))
        return p;
    const o = p;
    return [o.timestamp, o.open, o.high, o.low, o.close];
}
/**
 * Find the candle at the given CSS pixel position.
 *
 * @param data     Visible data slice.
 * @param offset   Index offset of the visible slice within the full dataset.
 * @param cssX     Pointer X in CSS pixels (canvas‑relative).
 * @param cssY     Pointer Y in CSS pixels (canvas‑relative).
 * @param xScale   Current x (time) scale.
 * @param yScale   Current y (price) scale.
 * @param bodyWidthPx  Body width in CSS pixels.
 */
export function findCandleAtPoint(data, offset, cssX, cssY, xScale, yScale, bodyWidthPx) {
    if (data.length === 0)
        return null;
    const halfBody = bodyWidthPx / 2;
    // Binary search for the nearest candle by timestamp.
    let lo = 0;
    let hi = data.length - 1;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        const px = toRange(xScale, asOHLC(data[mid])[0]);
        if (px < cssX)
            lo = mid + 1;
        else
            hi = mid;
    }
    // Check candidates around the found index.
    let best = null;
    let bestDx = Infinity;
    for (let i = Math.max(0, lo - 2); i <= Math.min(data.length - 1, lo + 2); i++) {
        const c = asOHLC(data[i]);
        const px = toRange(xScale, c[0]);
        const dx = Math.abs(px - cssX);
        if (dx > halfBody)
            continue;
        // Check vertical: is cssY within the candle range (high → low)?
        const yHigh = toRange(yScale, c[2]);
        const yLow = toRange(yScale, c[3]);
        const yTop = Math.min(yHigh, yLow);
        const yBottom = Math.max(yHigh, yLow);
        if (cssY >= yTop && cssY <= yBottom && dx < bestDx) {
            bestDx = dx;
            best = { index: offset + i, candle: c };
        }
    }
    return best;
}
//# sourceMappingURL=HitTest.js.map