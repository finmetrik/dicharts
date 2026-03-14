// ---------------------------------------------------------------------------
// DiCharts – Linear Scale
// ---------------------------------------------------------------------------
// Maps a continuous numeric domain [min, max] to a pixel range [start, end].
// Used for both the time (x) axis and the price (y) axis.
// ---------------------------------------------------------------------------
/** Create a linear scale. */
export function createScale(domainMin, domainMax, rangeStart, rangeEnd) {
    return { domainMin, domainMax, rangeStart, rangeEnd };
}
/** Map a domain value to a range (pixel) value. */
export function toRange(scale, value) {
    const span = scale.domainMax - scale.domainMin;
    if (span === 0)
        return (scale.rangeStart + scale.rangeEnd) / 2;
    const t = (value - scale.domainMin) / span;
    return scale.rangeStart + t * (scale.rangeEnd - scale.rangeStart);
}
/** Map a range (pixel) value back to domain. */
export function toDomain(scale, pixel) {
    const span = scale.rangeEnd - scale.rangeStart;
    if (span === 0)
        return (scale.domainMin + scale.domainMax) / 2;
    const t = (pixel - scale.rangeStart) / span;
    return scale.domainMin + t * (scale.domainMax - scale.domainMin);
}
/**
 * Map a domain value directly to WebGPU clip space (-1 … +1).
 * `rangeSize` is the pixel extent (e.g. canvas.width for x, canvas.height for y).
 * For the y axis, the result is flipped so that higher values go *up*.
 */
export function toClipX(scale, value, canvasWidth) {
    const px = toRange(scale, value);
    return (px / canvasWidth) * 2 - 1;
}
export function toClipY(scale, value, canvasHeight) {
    const px = toRange(scale, value);
    // In WebGPU clip space y goes up; in our pixel space y goes down (top = 0).
    return 1 - (px / canvasHeight) * 2;
}
//# sourceMappingURL=Scale.js.map