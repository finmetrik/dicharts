import type { ChartLayout } from '../scene/Layout';
import type { LinearScale } from '../scene/Scale';
import type { ChartTheme } from '../theme';
import type { ResolvedChartOptions } from '../types';
/** Compute "nice" evenly‑spaced ticks for a linear axis. */
export declare function computeTicks(min: number, max: number, approxCount: number): number[];
export interface AxisRendererHandle {
    /**
     * Update labels.  Call once per frame before rendering.
     * Returns the computed price and time ticks for the grid renderer.
     */
    update(layout: ChartLayout, xScale: LinearScale, yScale: LinearScale, options: ResolvedChartOptions, theme: ChartTheme): {
        priceTicks: number[];
        timeTicks: number[];
    };
    dispose(): void;
}
export declare function createAxisRenderer(container: HTMLElement): AxisRendererHandle;
//# sourceMappingURL=AxisRenderer.d.ts.map