export interface DepthLevel {
    price: number;
    quantity: number;
}
export interface DepthChartOptions {
    /** Bid levels sorted by price descending (highest bid first). */
    bids?: DepthLevel[];
    /** Ask levels sorted by price ascending (lowest ask first). */
    asks?: DepthLevel[];
    bidColor?: string;
    askColor?: string;
    bidFillColor?: string;
    askFillColor?: string;
    midPrice?: number;
    /** Background colour (auto-detected from theme if not set). */
    background?: string;
    textColor?: string;
    gridColor?: string;
    /** Show price labels on X axis. */
    showLabels?: boolean;
}
export interface DepthChartInstance {
    /** Update the order book data. */
    update(bids: DepthLevel[], asks: DepthLevel[]): void;
    /** Update options. */
    setOptions(opts: Partial<DepthChartOptions>): void;
    /** Force a redraw. */
    redraw(): void;
    /** Resize (call when container changes size). */
    resize(): void;
    /** Dispose. */
    dispose(): void;
}
export declare function createDepthChart(container: HTMLElement, options?: DepthChartOptions): DepthChartInstance;
//# sourceMappingURL=DepthChart.d.ts.map