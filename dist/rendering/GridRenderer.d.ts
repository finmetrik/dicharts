import type { GPUContextHandle } from '../gpu/Context';
import type { ChartLayout } from '../scene/Layout';
import type { ChartTheme } from '../theme';
export interface GridRenderer {
    prepare(layout: ChartLayout, theme: ChartTheme, hLines: number, vLines: number): void;
    render(pass: GPURenderPassEncoder): void;
    dispose(): void;
}
export declare function createGridRenderer(gpu: GPUContextHandle): GridRenderer;
//# sourceMappingURL=GridRenderer.d.ts.map