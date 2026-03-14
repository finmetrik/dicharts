export interface BarDataPoint {
    label: string;
    value: number;
    color?: string;
    /** For grouped bars: group key. */
    group?: string;
}
export interface BarChartOptions {
    data?: BarDataPoint[];
    /** Auto-colour positive values green, negative red. Default true. */
    autoColor?: boolean;
    positiveColor?: string;
    negativeColor?: string;
    /** Default bar colour when autoColor is false and no per-bar colour. */
    barColor?: string;
    background?: string;
    textColor?: string;
    gridColor?: string;
    /** Gap between bars as fraction of bar width (0–1, default 0.3). */
    gap?: number;
    /** Border radius on bars in CSS px (default 3). */
    borderRadius?: number;
    /** Show value labels on top of bars. Default true. */
    showValues?: boolean;
    /** Show X-axis labels. Default true. */
    showLabels?: boolean;
    /** Click callback. */
    onClick?: (item: BarDataPoint) => void;
}
export interface BarChartInstance {
    setData(data: BarDataPoint[]): void;
    setOptions(opts: Partial<BarChartOptions>): void;
    redraw(): void;
    resize(): void;
    dispose(): void;
}
export declare function createBarChart(container: HTMLElement, options?: BarChartOptions): BarChartInstance;
//# sourceMappingURL=BarChart.d.ts.map