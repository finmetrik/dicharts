export interface DonutSlice {
    id: string;
    label: string;
    value: number;
    color?: string;
}
export interface DonutChartOptions {
    data?: DonutSlice[];
    /** 0 = full pie, 0.5 = donut with 50% inner radius, etc. Default 0.55. */
    innerRadius?: number;
    /** Default colour palette (cycled). */
    colors?: string[];
    background?: string;
    textColor?: string;
    /** Show percentage labels on slices. Default true. */
    showLabels?: boolean;
    /** Show legend below/beside the chart. Default true. */
    showLegend?: boolean;
    /** Click callback. */
    onClick?: (slice: DonutSlice) => void;
}
export interface DonutChartInstance {
    setData(data: DonutSlice[]): void;
    setOptions(opts: Partial<DonutChartOptions>): void;
    redraw(): void;
    resize(): void;
    dispose(): void;
}
export declare function createDonutChart(container: HTMLElement, options?: DonutChartOptions): DonutChartInstance;
//# sourceMappingURL=DonutChart.d.ts.map