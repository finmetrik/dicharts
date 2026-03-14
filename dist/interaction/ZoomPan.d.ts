import type { Viewport } from '../scene/Viewport';
import type { PlotArea } from '../types';
export interface ZoomPanController {
    attach(canvas: HTMLCanvasElement): void;
    detach(): void;
}
export interface ZoomPanCallbacks {
    getViewport(): Viewport;
    getPlotArea(): PlotArea | null;
    setViewport(vp: Viewport): void;
}
export declare function createZoomPan(cb: ZoomPanCallbacks): ZoomPanController;
//# sourceMappingURL=ZoomPan.d.ts.map