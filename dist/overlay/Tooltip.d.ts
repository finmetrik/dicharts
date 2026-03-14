import type { OHLCTuple } from '../types';
import type { ChartTheme } from '../theme';
export interface TooltipHandle {
    show(candle: OHLCTuple, x: number, y: number, theme: ChartTheme): void;
    hide(): void;
    dispose(): void;
}
export declare function createTooltip(container: HTMLElement): TooltipHandle;
//# sourceMappingURL=Tooltip.d.ts.map