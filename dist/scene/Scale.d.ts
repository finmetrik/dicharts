export interface LinearScale {
    domainMin: number;
    domainMax: number;
    rangeStart: number;
    rangeEnd: number;
}
/** Create a linear scale. */
export declare function createScale(domainMin: number, domainMax: number, rangeStart: number, rangeEnd: number): LinearScale;
/** Map a domain value to a range (pixel) value. */
export declare function toRange(scale: LinearScale, value: number): number;
/** Map a range (pixel) value back to domain. */
export declare function toDomain(scale: LinearScale, pixel: number): number;
/**
 * Map a domain value directly to WebGPU clip space (-1 … +1).
 * `rangeSize` is the pixel extent (e.g. canvas.width for x, canvas.height for y).
 * For the y axis, the result is flipped so that higher values go *up*.
 */
export declare function toClipX(scale: LinearScale, value: number, canvasWidth: number): number;
export declare function toClipY(scale: LinearScale, value: number, canvasHeight: number): number;
//# sourceMappingURL=Scale.d.ts.map