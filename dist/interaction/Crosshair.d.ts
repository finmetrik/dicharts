import type { PlotArea } from '../types';
export interface CrosshairController {
    attach(canvas: HTMLCanvasElement): void;
    detach(): void;
    /** Current crosshair position (CSS pixels) or null when outside plot. */
    readonly position: {
        x: number;
        y: number;
    } | null;
}
export interface CrosshairCallbacks {
    getPlotArea(): PlotArea | null;
    onMove(pos: {
        x: number;
        y: number;
    } | null): void;
}
export declare function createCrosshairController(cb: CrosshairCallbacks): CrosshairController;
//# sourceMappingURL=Crosshair.d.ts.map