import type { GPUContextHandle } from '../gpu/Context';
import type { ChartLayout } from '../scene/Layout';
import type { LinearScale } from '../scene/Scale';
import type { ChartTheme } from '../theme';
import type { OHLCTuple } from '../types';
export interface VolumeRendererHandle {
    prepare(data: OHLCTuple[], volumes: number[], xScale: LinearScale, layout: ChartLayout, theme: ChartTheme, upColor: string, downColor: string): void;
    render(pass: GPURenderPassEncoder): void;
    dispose(): void;
}
export declare function createVolumeRenderer(gpu: GPUContextHandle): VolumeRendererHandle;
//# sourceMappingURL=VolumeRenderer.d.ts.map