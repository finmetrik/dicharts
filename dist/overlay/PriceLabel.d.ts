import type { ChartTheme } from '../theme';
export interface PriceLabelHandle {
    show(price: number, y: number, axisX: number, theme: ChartTheme): void;
    hide(): void;
    dispose(): void;
}
export declare function createPriceLabel(container: HTMLElement): PriceLabelHandle;
//# sourceMappingURL=PriceLabel.d.ts.map