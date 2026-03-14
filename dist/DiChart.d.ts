import type { CandleDataPoint, DiChartEventMap, DiChartEventName, DiChartOptions, OverlayConfig, OrderLineConfig, SubPaneConfig } from './types';
export interface DiChartInstance {
    /** Replace chart options (partial merge). */
    setOptions(opts: Partial<DiChartOptions>): void;
    /** Append new candles to the dataset. */
    appendCandles(candles: CandleDataPoint[]): void;
    /** Update (replace) the last candle – used for streaming forming candle. */
    updateLastCandle(candle: CandleDataPoint): void;
    /** Replace all candle data. */
    setData(candles: CandleDataPoint[]): void;
    /** Programmatic zoom control (0–1 range). */
    setZoomRange(start: number, end: number): void;
    /** Set volume data (one entry per candle). */
    setVolumes(volumes: number[]): void;
    /** Append volumes (matching appendCandles). */
    appendVolumes(volumes: number[]): void;
    /** Add or update an overlay indicator. */
    addOverlay(config: OverlayConfig): void;
    /** Remove an overlay by id. */
    removeOverlay(id: string): void;
    /** Add or update an order/position line. */
    addOrderLine(config: OrderLineConfig): void;
    /** Remove an order line by id. */
    removeOrderLine(id: string): void;
    /** Remove all order lines. */
    clearOrderLines(): void;
    /** Add or update a sub-pane indicator. */
    addSubPane(config: SubPaneConfig): void;
    /** Remove a sub-pane by id. */
    removeSubPane(id: string): void;
    /** Register an event listener. */
    on<K extends DiChartEventName>(event: K, handler: (e: DiChartEventMap[K]) => void): void;
    /** Remove an event listener. */
    off<K extends DiChartEventName>(event: K, handler: (e: DiChartEventMap[K]) => void): void;
    /** Get the current FPS. */
    readonly fps: number;
    /** Get the candle count. */
    readonly candleCount: number;
    /** Force a resize (call if the container size changes). */
    resize(): void;
    /** Release all resources. */
    dispose(): void;
}
export declare class DiChart {
    /**
     * Create a new DiChart instance.
     *
     * ```ts
     * const chart = await DiChart.create(container, { theme: 'dark', candles: { data } });
     * ```
     */
    static create(container: HTMLElement, options?: DiChartOptions): Promise<DiChartInstance>;
}
//# sourceMappingURL=DiChart.d.ts.map