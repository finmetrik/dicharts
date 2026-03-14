import type { GPUContextHandle } from '../gpu/Context';
import type { ChartLayout } from '../scene/Layout';
import type { LinearScale } from '../scene/Scale';
export interface LineOverlayData {
    /** Array of [timestamp, value] pairs. */
    points: [number, number][];
    color: string;
    opacity?: number;
}
/** A horizontal line at a fixed price level. */
export interface HorizontalLineData {
    price: number;
    color: string;
    opacity?: number;
    dashed?: boolean;
}
export interface LineOverlayRendererHandle {
    prepare(overlays: LineOverlayData[], horizontals: HorizontalLineData[], xScale: LinearScale, yScale: LinearScale, layout: ChartLayout): void;
    render(pass: GPURenderPassEncoder): void;
    dispose(): void;
}
export declare function createLineOverlayRenderer(gpu: GPUContextHandle): LineOverlayRendererHandle;
//# sourceMappingURL=LineOverlayRenderer.d.ts.map