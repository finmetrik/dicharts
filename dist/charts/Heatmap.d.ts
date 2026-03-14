export interface HeatmapItem {
    /** Unique id. */
    id: string;
    /** Display label (e.g. "BTC"). */
    label: string;
    /** Weight for sizing (e.g. market cap). Must be > 0. */
    weight: number;
    /** Change value for colouring (e.g. +2.5 for +2.5%). */
    change: number;
    /** Optional secondary label (e.g. "$42,500"). */
    sublabel?: string;
    /** Optional group name (e.g. "DeFi", "Layer 1"). */
    group?: string;
}
export interface HeatmapOptions {
    data?: HeatmapItem[];
    /** Max positive change for full green (default 10). */
    maxChange?: number;
    /** Positive change colour (default #26a69a). */
    positiveColor?: string;
    /** Negative change colour (default #ef5350). */
    negativeColor?: string;
    /** Neutral / zero colour (default #2a2e39). */
    neutralColor?: string;
    background?: string;
    textColor?: string;
    borderColor?: string;
    /** Gap between cells in CSS pixels (default 2). */
    gap?: number;
    /** Border radius of cells in CSS pixels (default 3). */
    borderRadius?: number;
    /** Click callback. */
    onClick?: (item: HeatmapItem) => void;
}
export interface HeatmapInstance {
    /** Replace all data. */
    setData(data: HeatmapItem[]): void;
    /** Update options. */
    setOptions(opts: Partial<HeatmapOptions>): void;
    /** Force a redraw. */
    redraw(): void;
    /** Resize. */
    resize(): void;
    /** Dispose. */
    dispose(): void;
}
export declare function createHeatmap(container: HTMLElement, options?: HeatmapOptions): HeatmapInstance;
//# sourceMappingURL=Heatmap.d.ts.map