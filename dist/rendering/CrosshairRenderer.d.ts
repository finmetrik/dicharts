import type { GPUContextHandle } from '../gpu/Context';
import type { ChartLayout } from '../scene/Layout';
export interface CrosshairRendererHandle {
    /**
     * Update crosshair position.  Pass `null` to hide.
     * `x` and `y` are in *device pixels* relative to the canvas.
     */
    prepare(layout: ChartLayout, color: [number, number, number, number], x: number | null, y: number | null, dashOn?: number, dashOff?: number): void;
    render(pass: GPURenderPassEncoder): void;
    dispose(): void;
}
export declare function createCrosshairRenderer(gpu: GPUContextHandle): CrosshairRendererHandle;
//# sourceMappingURL=CrosshairRenderer.d.ts.map