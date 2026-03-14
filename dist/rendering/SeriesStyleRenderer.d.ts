import type { GPUContextHandle } from '../gpu/Context';
import type { ChartLayout } from '../scene/Layout';
import type { LinearScale } from '../scene/Scale';
import type { ChartTheme } from '../theme';
import type { OHLCTuple, ResolvedCandleOptions } from '../types';
export interface SeriesStyleRendererHandle {
    prepare(data: OHLCTuple[], opts: ResolvedCandleOptions, xScale: LinearScale, yScale: LinearScale, layout: ChartLayout, theme: ChartTheme): void;
    render(pass: GPURenderPassEncoder): void;
    dispose(): void;
}
export declare function createSeriesStyleRenderer(gpu: GPUContextHandle): SeriesStyleRendererHandle;
//# sourceMappingURL=SeriesStyleRenderer.d.ts.map