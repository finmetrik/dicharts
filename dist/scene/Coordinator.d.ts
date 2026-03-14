import type { GPUContextHandle } from '../gpu/Context';
import type { ResolvedChartOptions, OHLCTuple } from '../types';
import { type ChartLayout } from './Layout';
import { type LinearScale } from './Scale';
import type { Viewport } from './Viewport';
export interface SceneCoordinator {
    /** Full render cycle. */
    render(data: OHLCTuple[], options: ResolvedChartOptions, viewport: Viewport, crosshairPos: {
        x: number;
        y: number;
    } | null): void;
    /** Retrieve the last-computed layout and scales (for interaction hit-testing). */
    readonly lastLayout: ChartLayout | null;
    readonly lastXScale: LinearScale | null;
    readonly lastYScale: LinearScale | null;
    /** Visible data slice (set after each render). */
    readonly visibleData: OHLCTuple[];
    readonly visibleStartIndex: number;
    dispose(): void;
}
export declare function createCoordinator(gpu: GPUContextHandle, overlayContainer: HTMLElement, subPaneContainer: HTMLElement): SceneCoordinator;
//# sourceMappingURL=Coordinator.d.ts.map