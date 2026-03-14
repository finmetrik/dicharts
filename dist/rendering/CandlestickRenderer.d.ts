import type { CandleDataPoint, ResolvedCandleOptions } from '../types';
import type { GPUContextHandle } from '../gpu/Context';
import type { ChartLayout } from '../scene/Layout';
import type { LinearScale } from '../scene/Scale';
import type { ChartTheme } from '../theme';
export interface CandlestickRenderer {
    prepare(data: CandleDataPoint[], opts: ResolvedCandleOptions, xScale: LinearScale, yScale: LinearScale, layout: ChartLayout, theme: ChartTheme): void;
    render(pass: GPURenderPassEncoder): void;
    dispose(): void;
}
export declare function createCandlestickRenderer(gpu: GPUContextHandle): CandlestickRenderer;
//# sourceMappingURL=CandlestickRenderer.d.ts.map