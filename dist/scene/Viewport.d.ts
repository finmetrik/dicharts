export interface Viewport {
    /** Start of visible window (0–1). */
    start: number;
    /** End of visible window (0–1). */
    end: number;
    /**
     * Extra space beyond the data (0–1 normalised).
     * Used to keep the newest candle away from the right edge during streaming.
     * 0 = no overscroll, 0.25 = 25% of visible span as empty right padding.
     */
    rightPadding: number;
}
export declare function createViewport(start?: number, end?: number, rightPadding?: number): Viewport;
/** Returns the visible span (end - start). */
export declare function span(vp: Viewport): number;
/**
 * Zoom in or out centred on a normalised anchor point.
 * `factor` > 1 zooms in, < 1 zooms out.
 */
export declare function zoom(vp: Viewport, anchor: number, factor: number): Viewport;
/**
 * Pan by a delta expressed in normalised units.
 * Positive delta moves the window to the right.
 */
export declare function pan(vp: Viewport, delta: number): Viewport;
/**
 * Snap the viewport so the newest candle sits at ~75% from the left.
 * The remaining 25% is empty space to the right, giving visual breathing room.
 */
export declare function scrollToEnd(vp: Viewport): Viewport;
//# sourceMappingURL=Viewport.d.ts.map