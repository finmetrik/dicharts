export interface SparklineOptions {
    /** Array of numeric values (e.g. close prices). */
    data?: number[];
    /** Line colour. Default auto: green if last > first, red otherwise. */
    lineColor?: string;
    /** Fill colour (area under line). Set to 'none' to disable. */
    fillColor?: string;
    /** Line width in CSS pixels (default 1.5). */
    lineWidth?: number;
    /** Positive trend colour (default #26a69a). */
    upColor?: string;
    /** Negative trend colour (default #ef5350). */
    downColor?: string;
    /** Background colour (default transparent). */
    background?: string;
}
export interface SparklineInstance {
    /** Replace data and redraw. */
    setData(data: number[]): void;
    /** Update options. */
    setOptions(opts: Partial<SparklineOptions>): void;
    /** Force a redraw. */
    redraw(): void;
    /** Resize. */
    resize(): void;
    /** Dispose. */
    dispose(): void;
}
export declare function createSparkline(container: HTMLElement, options?: SparklineOptions): SparklineInstance;
//# sourceMappingURL=Sparkline.d.ts.map