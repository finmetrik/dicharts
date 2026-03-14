// ---------------------------------------------------------------------------
// DiCharts – Viewport (Zoom Window)
// ---------------------------------------------------------------------------
// Stores the currently visible portion of the data as a [start, end] range
// in normalised 0–1 space (0 = leftmost candle, 1 = rightmost candle).
// Provides helpers for zooming and panning.
// ---------------------------------------------------------------------------
const MIN_SPAN = 0.002; // at most 1/500th of dataset visible (extreme zoom)
const MAX_SPAN = 1.0;
export function createViewport(start = 0, end = 1, rightPadding = 0) {
    return { start: clamp01(start), end: clamp01(end), rightPadding };
}
/** Returns the visible span (end - start). */
export function span(vp) {
    return vp.end - vp.start;
}
/**
 * Zoom in or out centred on a normalised anchor point.
 * `factor` > 1 zooms in, < 1 zooms out.
 */
export function zoom(vp, anchor, factor) {
    const currentSpan = span(vp);
    let newSpan = clampSpan(currentSpan / factor);
    // Keep anchor at the same relative position within the window.
    const anchorRatio = currentSpan === 0 ? 0.5 : (anchor - vp.start) / currentSpan;
    let newStart = anchor - anchorRatio * newSpan;
    let newEnd = newStart + newSpan;
    // Allow overscroll up to (1 + rightPadding).
    const maxEnd = 1 + vp.rightPadding;
    if (newStart < 0) {
        newStart = 0;
        newEnd = Math.min(maxEnd, newSpan);
    }
    if (newEnd > maxEnd) {
        newEnd = maxEnd;
        newStart = Math.max(0, maxEnd - newSpan);
    }
    return { start: newStart, end: newEnd, rightPadding: vp.rightPadding };
}
/**
 * Pan by a delta expressed in normalised units.
 * Positive delta moves the window to the right.
 */
export function pan(vp, delta) {
    const s = span(vp);
    let newStart = vp.start + delta;
    let newEnd = vp.end + delta;
    const maxEnd = 1 + vp.rightPadding;
    if (newStart < 0) {
        newStart = 0;
        newEnd = s;
    }
    if (newEnd > maxEnd) {
        newEnd = maxEnd;
        newStart = Math.max(0, maxEnd - s);
    }
    return { start: newStart, end: newEnd, rightPadding: vp.rightPadding };
}
/**
 * Snap the viewport so the newest candle sits at ~75% from the left.
 * The remaining 25% is empty space to the right, giving visual breathing room.
 */
export function scrollToEnd(vp) {
    const s = span(vp);
    // Place data-end (1.0) at 75% of the visible window width.
    // That means: start + 0.75 * s = 1.0  =>  start = 1.0 - 0.75 * s
    // And end = start + s = 1.0 + 0.25 * s
    const newStart = Math.max(0, 1 - 0.75 * s);
    const newEnd = newStart + s;
    return { start: newStart, end: newEnd, rightPadding: vp.rightPadding };
}
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function clamp01(v) {
    return Math.max(0, Math.min(1, v));
}
function clampSpan(s) {
    return Math.max(MIN_SPAN, Math.min(MAX_SPAN, s));
}
//# sourceMappingURL=Viewport.js.map