/**
 * A single OHLC candle represented as a tuple.
 * [timestamp, open, high, low, close]
 * Volume can be provided separately via the volumes array.
 */
export type OHLCTuple = readonly [
    timestamp: number,
    open: number,
    high: number,
    low: number,
    close: number
];
/** Object representation of an OHLC candle. */
export interface OHLCObject {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
}
/** Accepted candle data point – either tuple or object form. */
export type CandleDataPoint = OHLCTuple | OHLCObject;
export type CandleStyle = 'classic' | 'hollow' | 'heikin-ashi' | 'renko' | 'bar' | 'line' | 'area' | 'baseline';
export interface CandleSeriesOptions {
    /** Initial candle data. */
    data?: CandleDataPoint[];
    /** Visual style – filled bodies or hollow up‑candles. */
    style?: CandleStyle;
    /** Colour for bullish (close >= open) candles. */
    upColor?: string;
    /** Colour for bearish (close < open) candles. */
    downColor?: string;
    /** Border colour for bullish candles in hollow mode. */
    upBorderColor?: string;
    /** Border colour for bearish candles in hollow mode. */
    downBorderColor?: string;
    /** Body width as CSS pixels or percentage string like "80%". */
    bodyWidth?: number | string;
    /** Line colour for line/area/baseline styles. Defaults to upColor. */
    lineColor?: string;
    /** Baseline price for baseline style. Defaults to first visible close. */
    baselinePrice?: number;
}
export interface TimeAxisOptions {
    visible?: boolean;
}
export interface PriceAxisOptions {
    visible?: boolean;
    position?: 'left' | 'right';
}
export interface CrosshairOptions {
    enabled?: boolean;
    lineColor?: string;
    lineWidth?: number;
    dashPattern?: [number, number];
}
export interface DataZoomOptions {
    enabled?: boolean;
    /** Initial visible range as [start%, end%] in 0–1 range. */
    initialRange?: [number, number];
}
export type ThemeId = 'dark' | 'light';
export interface VolumeOptions {
    enabled?: boolean;
    /** Volume data array, one entry per candle. */
    data?: number[];
    /** Height as fraction of plot area (0–1, default 0.2). */
    heightRatio?: number;
}
export type OverlayType = 'sma' | 'ema' | 'bollinger';
export interface OverlayConfig {
    id: string;
    type: OverlayType;
    period?: number;
    color?: string;
    /** For Bollinger: stdDev multiplier (default 2). */
    stdDev?: number;
    /** For Bollinger: band line colour. */
    bandColor?: string;
    visible?: boolean;
}
export interface OrderLineConfig {
    id: string;
    price: number;
    label?: string;
    color?: string;
    style?: 'solid' | 'dashed';
}
export type SubPaneType = 'rsi' | 'macd' | 'volume';
export interface SubPaneConfig {
    id: string;
    type: SubPaneType;
    /** Height in CSS pixels (default 100). */
    height?: number;
    period?: number;
    /** MACD-specific settings. */
    fastPeriod?: number;
    slowPeriod?: number;
    signalPeriod?: number;
    visible?: boolean;
}
export interface DiChartOptions {
    theme?: ThemeId;
    candles?: CandleSeriesOptions;
    volume?: VolumeOptions;
    timeAxis?: TimeAxisOptions;
    priceAxis?: PriceAxisOptions;
    crosshair?: CrosshairOptions;
    dataZoom?: DataZoomOptions;
    /** Line overlays (indicators on the price chart). */
    overlays?: OverlayConfig[];
    /** Horizontal order / position lines. */
    orderLines?: OrderLineConfig[];
    /** Sub-pane indicators rendered below the main chart. */
    subPanes?: SubPaneConfig[];
    /** Automatically scroll to keep newest candle visible. */
    autoScroll?: boolean;
    /** Disable animation globally. */
    animation?: boolean;
}
export interface ResolvedCandleOptions {
    data: CandleDataPoint[];
    style: CandleStyle;
    upColor: string;
    downColor: string;
    upBorderColor: string;
    downBorderColor: string;
    bodyWidth: number | string;
    lineColor: string;
    baselinePrice: number | null;
}
export interface ResolvedVolumeOptions {
    enabled: boolean;
    data: number[];
    heightRatio: number;
}
export interface ResolvedChartOptions {
    theme: ThemeId;
    candles: ResolvedCandleOptions;
    volume: ResolvedVolumeOptions;
    timeAxis: Required<TimeAxisOptions>;
    priceAxis: Required<PriceAxisOptions>;
    crosshair: Required<CrosshairOptions>;
    dataZoom: Required<DataZoomOptions>;
    overlays: OverlayConfig[];
    orderLines: OrderLineConfig[];
    subPanes: SubPaneConfig[];
    autoScroll: boolean;
    animation: boolean;
}
/** The rectangular area available for the plot (in CSS pixels). */
export interface PlotArea {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface CandleHit {
    index: number;
    candle: OHLCTuple;
}
export interface DiChartEventMap {
    click: {
        candle: CandleHit | null;
        x: number;
        y: number;
    };
    crosshairMove: {
        x: number;
        y: number;
        candle: CandleHit | null;
    };
    /** Fired when the GPU device is lost (driver crash, sleep/wake, etc.). */
    deviceLost: {
        reason: string;
    };
    /** Fired when an unrecoverable render error occurs. */
    error: {
        message: string;
    };
}
export type DiChartEventName = keyof DiChartEventMap;
//# sourceMappingURL=types.d.ts.map