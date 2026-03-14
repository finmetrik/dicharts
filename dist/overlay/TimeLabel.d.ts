import type { ChartTheme } from '../theme';
export interface TimeLabelHandle {
    show(timestamp: number, x: number, axisY: number, theme: ChartTheme): void;
    hide(): void;
    dispose(): void;
}
export declare function createTimeLabel(container: HTMLElement): TimeLabelHandle;
//# sourceMappingURL=TimeLabel.d.ts.map