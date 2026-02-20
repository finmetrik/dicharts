// ---------------------------------------------------------------------------
// DiCharts – Public API
// ---------------------------------------------------------------------------

export { DiChart } from './DiChart';
export type { DiChartInstance } from './DiChart';

// Types
export type {
  OHLCTuple,
  OHLCObject,
  CandleDataPoint,
  CandleStyle,
  CandleSeriesOptions,
  DiChartOptions,
  TimeAxisOptions,
  PriceAxisOptions,
  CrosshairOptions,
  DataZoomOptions,
  ThemeId,
  CandleHit,
  DiChartEventMap,
  DiChartEventName,
  // New types
  VolumeOptions,
  OverlayType,
  OverlayConfig,
  OrderLineConfig,
  SubPaneType,
  SubPaneConfig,
} from './types';

// Data utilities (for streaming use)
export { createTickAggregator } from './data/TickAggregator';
export type { Tick, TickAggregator } from './data/TickAggregator';
export { downsampleOHLC } from './data/Sampler';
export { toHeikinAshi } from './data/HeikinAshi';
export { toRenko } from './data/Renko';

// Indicators (standalone computation functions)
export { computeSMA, computeEMA } from './indicators/ma';
export { computeBollinger } from './indicators/bollinger';
export type { BollingerResult } from './indicators/bollinger';
export { computeRSI } from './indicators/rsi';
export { computeMACD } from './indicators/macd';
export type { MACDResult } from './indicators/macd';
export { computeStochastic } from './indicators/stochastic';
export type { StochasticResult } from './indicators/stochastic';
export { computeATR } from './indicators/atr';
export { computeVWAP } from './indicators/vwap';
export { computeOBV } from './indicators/obv';
export { computeADX } from './indicators/adx';
export type { ADXResult } from './indicators/adx';
export { computeIchimoku } from './indicators/ichimoku';
export type { IchimokuResult } from './indicators/ichimoku';

// Standalone chart components
export { createDepthChart } from './charts/DepthChart';
export type { DepthLevel, DepthChartOptions, DepthAnimationConfig, DepthChartInstance } from './charts/DepthChart';
export { createHeatmap } from './charts/Heatmap';
export type { HeatmapItem, HeatmapOptions, HeatmapAnimationConfig, HeatmapInstance } from './charts/Heatmap';
export { createSparkline } from './charts/Sparkline';
export type { SparklineOptions, SparklineAnimationConfig, SparklineInstance } from './charts/Sparkline';
export { createDonutChart, createDonutChart as createPieChart } from './charts/DonutChart';
export type { DonutSlice, DonutAnimationConfig, CenterTextConfig, DonutChartOptions, DonutChartInstance } from './charts/DonutChart';
export { createBarChart } from './charts/BarChart';
export type { BarDataPoint, BarSeriesDataPoint, BarAnimationConfig, BarChartOptions, BarChartInstance } from './charts/BarChart';
export { createGauge } from './charts/Gauge';
export type { GaugeSegment, GaugeOptions, GaugeAnimationConfig, GaugeInstance } from './charts/Gauge';
export { createRadarChart } from './charts/RadarChart';
export type { RadarAxis, RadarSeries, RadarAnimationConfig, RadarChartOptions, RadarChartInstance } from './charts/RadarChart';
export { createAreaChart } from './charts/AreaChart';
export type { AreaDataPoint, AreaSeriesConfig, AreaAnimationConfig, AreaChartOptions, AreaChartInstance } from './charts/AreaChart';

// Theme
export type { ChartTheme } from './theme';
export { darkTheme, lightTheme } from './theme';
