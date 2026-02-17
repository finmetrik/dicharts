# DiCharts Library — API Reference

> Complete API documentation for the core charting library.

---

## Overview

The library exports:
- **DiChart** — WebGPU-powered candlestick chart (the main feature)
- **11 Indicator functions** — SMA, EMA, Bollinger, RSI, MACD, Stochastic, ATR, VWAP, OBV, ADX, Ichimoku
- **Data utilities** — TickAggregator, downsample, Heikin-Ashi, Renko transforms
- **7 Standalone chart components** — DepthChart, Heatmap, Sparkline, DonutChart, BarChart, RadarChart, Gauge
- **Themes** — dark and light colour palettes

---

## DiChart

### `DiChart.create(container, options)`

Creates a WebGPU-powered chart instance.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `container` | `HTMLElement` | DOM element to mount the chart in. Must have non-zero dimensions. |
| `options` | `DiChartOptions` | Configuration object (see below). |

**Returns:** `Promise<DiChartInstance>`

**Requirements:** WebGPU support (Chrome 113+, Edge 113+, Safari 18+)

```ts
const chart = await DiChart.create(document.getElementById('chart'), {
  theme: 'dark',
  candles: {
    data: candles,
    style: 'classic',
  },
  volume: {
    enabled: true,
    data: volumes,
  },
});
```

---

## DiChartOptions

```ts
interface DiChartOptions {
  theme?: 'dark' | 'light';
  candles?: CandleSeriesOptions;
  volume?: VolumeOptions;
  timeAxis?: TimeAxisOptions;
  priceAxis?: PriceAxisOptions;
  crosshair?: CrosshairOptions;
  dataZoom?: DataZoomOptions;
  overlays?: OverlayConfig[];
  orderLines?: OrderLineConfig[];
  subPanes?: SubPaneConfig[];
  autoScroll?: boolean;
  animation?: boolean;
}
```

### `theme`
- **Type:** `'dark' | 'light'`
- **Default:** `'dark'`

### `candles`

```ts
interface CandleSeriesOptions {
  data?: CandleDataPoint[];    // Initial OHLC data
  style?: CandleStyle;         // Default: 'classic'
  upColor?: string;            // Bullish candle colour
  downColor?: string;          // Bearish candle colour
  upBorderColor?: string;      // Bullish border (hollow mode)
  downBorderColor?: string;    // Bearish border (hollow mode)
  bodyWidth?: number | string; // CSS pixels or "80%" (default: "70%")
  lineColor?: string;          // Line/area/baseline colour
  baselinePrice?: number;      // Baseline reference price
}
```

**CandleStyle options:** `'classic'` | `'hollow'` | `'heikin-ashi'` | `'renko'` | `'bar'` | `'line'` | `'area'` | `'baseline'`

### `volume`

```ts
interface VolumeOptions {
  enabled?: boolean;       // Default: false
  data?: number[];         // One entry per candle
  heightRatio?: number;    // Fraction of plot area (0–1, default: 0.2)
}
```

### `timeAxis`

```ts
interface TimeAxisOptions {
  visible?: boolean;       // Default: true
}
```

### `priceAxis`

```ts
interface PriceAxisOptions {
  visible?: boolean;       // Default: true
  position?: 'left' | 'right';  // Default: 'right'
  scaleType?: 'linear' | 'log'; // Default: 'linear'
}
```

### `crosshair`

```ts
interface CrosshairOptions {
  enabled?: boolean;       // Default: true
  lineColor?: string;      // Default: theme crosshair colour
  lineWidth?: number;      // Default: 1
  dashPattern?: [number, number];  // Default: [6, 4]
}
```

### `dataZoom`

```ts
interface DataZoomOptions {
  enabled?: boolean;       // Default: true
  initialRange?: [number, number];  // Default: [0, 1] (show all)
}
```

### `overlays`

Array of overlay indicator configs (drawn on the price chart):

```ts
interface OverlayConfig {
  id: string;              // Unique identifier
  type: OverlayType;       // 'sma' | 'ema' | 'bollinger' | 'vwap' | 'ichimoku'
  period?: number;         // Lookback period
  color?: string;          // Line colour
  stdDev?: number;         // Bollinger: stdDev multiplier (default: 2)
  bandColor?: string;      // Bollinger: band colour
  tenkanPeriod?: number;   // Ichimoku: Tenkan period (default: 9)
  kijunPeriod?: number;    // Ichimoku: Kijun period (default: 26)
  senkouPeriod?: number;   // Ichimoku: Senkou period (default: 52)
  displacement?: number;   // Ichimoku: displacement (default: 26)
  visible?: boolean;       // Show/hide (default: true)
}
```

### `orderLines`

Array of horizontal price lines:

```ts
interface OrderLineConfig {
  id: string;              // Unique identifier
  price: number;           // Price level
  label?: string;          // Display label (e.g. "Buy Limit")
  color?: string;          // Line colour (default: #FFD700)
  style?: 'solid' | 'dashed';  // Default: 'solid'
}
```

### `subPanes`

Array of sub-pane indicator configs (drawn below the main chart):

```ts
interface SubPaneConfig {
  id: string;              // Unique identifier
  type: SubPaneType;       // 'rsi' | 'macd' | 'volume' | 'stochastic' | 'atr' | 'obv' | 'adx'
  height?: number;         // Height in CSS pixels (default: 100)
  period?: number;         // Lookback period
  fastPeriod?: number;     // MACD fast period (default: 12)
  slowPeriod?: number;     // MACD slow period (default: 26)
  signalPeriod?: number;   // MACD signal period (default: 9)
  smoothK?: number;        // Stochastic %K smoothing (default: 3)
  smoothD?: number;        // Stochastic %D smoothing (default: 3)
  visible?: boolean;       // Show/hide (default: true)
}
```

### `autoScroll`
- **Type:** `boolean`
- **Default:** `true`
- Auto-scroll to keep the newest candle visible when data is appended.

### `animation`
- **Type:** `boolean`
- **Default:** `false`
- Enable/disable animations globally.

---

## DiChartInstance

The object returned by `DiChart.create()`.

### Options

#### `setOptions(opts)`
Partial-merge update of chart options. Nested objects are shallow-merged (e.g. `{ candles: { style: 'hollow' } }` won't wipe other candle options).

```ts
chart.setOptions({ theme: 'light' });
chart.setOptions({ candles: { style: 'heikin-ashi' } });
chart.setOptions({ priceAxis: { scaleType: 'log' } });
```

### Data

#### `setData(candles)`
Replace all candle data.

```ts
chart.setData([[1700000000000, 42000, 42500, 41800, 42300], ...]);
```

#### `appendCandles(candles)`
Append new candles to the end. If `autoScroll` is enabled, scrolls to show the newest candle.

```ts
chart.appendCandles([[ts, open, high, low, close]]);
```

#### `updateLastCandle(candle)`
Update the last (forming) candle — used for streaming.

```ts
chart.updateLastCandle([ts, open, high, low, close]);
```

### Volume

#### `setVolumes(volumes)`
Replace all volume data and enable volume display.

```ts
chart.setVolumes([1200, 3400, 2100, ...]);
```

#### `appendVolumes(volumes)`
Append volume entries (one per appended candle).

```ts
chart.appendVolumes([1500]);
```

### Navigation

#### `zoomIn(factor?)`
Zoom in centered on current view. Default factor: 1.5.

#### `zoomOut(factor?)`
Zoom out centered on current view. Default factor: 1.5.

#### `panLeft(amount?)`
Pan left by a fraction of visible span. Default: 0.2.

#### `panRight(amount?)`
Pan right by a fraction of visible span. Default: 0.2.

#### `resetZoom()`
Reset zoom to show all data.

#### `setZoomRange(start, end)`
Set the visible range programmatically (0–1 normalised).

```ts
chart.setZoomRange(0.8, 1.0); // Show last 20% of data
```

### Overlays (Indicators)

#### `addOverlay(config)`
Add or update an overlay indicator. If an overlay with the same `id` already exists, it is replaced.

```ts
chart.addOverlay({ id: 'sma20', type: 'sma', period: 20, color: '#FFD700' });
```

#### `removeOverlay(id)`
Remove an overlay by id.

```ts
chart.removeOverlay('sma20');
```

### Order Lines

#### `addOrderLine(config)`
Add or update a horizontal price line. If a line with the same `id` exists, it is replaced.

```ts
chart.addOrderLine({
  id: 'buy-limit',
  price: 41500,
  label: 'Buy Limit',
  color: '#26a69a',
  style: 'dashed',
});
```

#### `removeOrderLine(id)`
Remove an order line by id.

#### `clearOrderLines()`
Remove all order lines.

### Sub-Panes

#### `addSubPane(config)`
Add or update a sub-pane indicator. If a pane with the same `id` exists, it is replaced.

```ts
chart.addSubPane({ id: 'rsi', type: 'rsi', period: 14, height: 120 });
```

#### `removeSubPane(id)`
Remove a sub-pane by id.

### Events

#### `on(event, handler)`
Register an event listener.

```ts
chart.on('click', ({ candle, x, y }) => {
  if (candle) console.log('Clicked candle:', candle.index, candle.candle);
});

chart.on('crosshairMove', ({ x, y, candle }) => {
  // Update external UI with hovered candle
});

chart.on('deviceLost', ({ reason }) => {
  console.error('GPU lost:', reason);
});

chart.on('error', ({ message }) => {
  console.error('Render error:', message);
});
```

#### `off(event, handler)`
Remove a previously registered event listener.

### Properties

#### `fps` (readonly)
Current measured frames per second.

#### `candleCount` (readonly)
Number of candles in the data store.

### Utility

#### `resize()`
Force a resize. Call this if the container size changes programmatically (ResizeObserver handles automatic resizes).

#### `dispose()`
Destroy the chart and release all GPU, DOM, and event resources. Must be called when removing the chart from the page.

---

## Data Types

### OHLCTuple

```ts
type OHLCTuple = readonly [
  timestamp: number,  // Unix ms
  open: number,
  high: number,
  low: number,
  close: number,
];
```

### OHLCObject

```ts
interface OHLCObject {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}
```

### CandleDataPoint

```ts
type CandleDataPoint = OHLCTuple | OHLCObject;
```

Both tuple and object forms are accepted by all data methods. Internally, everything is normalised to `OHLCTuple`.

### CandleHit

```ts
interface CandleHit {
  index: number;       // Index in the visible data array
  candle: OHLCTuple;   // The candle data
}
```

### Event Map

```ts
interface DiChartEventMap {
  click: { candle: CandleHit | null; x: number; y: number };
  crosshairMove: { x: number; y: number; candle: CandleHit | null };
  deviceLost: { reason: string };
  error: { message: string };
}
```

---

## Indicator Functions

All indicator functions are pure: they take `OHLCTuple[]` and return computed values. They can be used independently of the chart.

### `computeSMA(data, period, source?)`

Simple Moving Average.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `data` | `OHLCTuple[]` | — | OHLC data |
| `period` | `number` | — | Lookback period |
| `source` | `'close' \| 'open' \| 'high' \| 'low'` | `'close'` | Price source |

**Returns:** `[timestamp, sma][]`

```ts
import { computeSMA } from 'dicharts';
const sma = computeSMA(candles, 20);
```

### `computeEMA(data, period, source?)`

Exponential Moving Average. Seeded with SMA of first `period` values.

**Returns:** `[timestamp, ema][]`

### `computeBollinger(data, period?, stdDev?)`

Bollinger Bands.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `period` | `number` | `20` | SMA period |
| `stdDev` | `number` | `2` | Standard deviation multiplier |

**Returns:** `BollingerResult`

```ts
interface BollingerResult {
  upper: [number, number][];
  middle: [number, number][];
  lower: [number, number][];
}
```

### `computeRSI(data, period?)`

Relative Strength Index (0–100 scale).

| Parameter | Type | Default |
|-----------|------|---------|
| `period` | `number` | `14` |

**Returns:** `[timestamp, rsi][]`

### `computeMACD(data, fast?, slow?, signal?)`

Moving Average Convergence/Divergence.

| Parameter | Type | Default |
|-----------|------|---------|
| `fast` | `number` | `12` |
| `slow` | `number` | `26` |
| `signal` | `number` | `9` |

**Returns:** `MACDResult`

```ts
interface MACDResult {
  macd: [number, number][];
  signal: [number, number][];
  histogram: [number, number][];
}
```

### `computeStochastic(data, period?, smoothK?, smoothD?)`

Stochastic Oscillator (0–100 scale).

| Parameter | Type | Default |
|-----------|------|---------|
| `period` | `number` | `14` |
| `smoothK` | `number` | `3` |
| `smoothD` | `number` | `3` |

**Returns:** `StochasticResult`

```ts
interface StochasticResult {
  k: [number, number][];
  d: [number, number][];
}
```

### `computeATR(data, period?)`

Average True Range.

| Parameter | Type | Default |
|-----------|------|---------|
| `period` | `number` | `14` |

**Returns:** `[timestamp, atr][]`

### `computeVWAP(data, volumes)`

Volume-Weighted Average Price.

| Parameter | Type | Description |
|-----------|------|-------------|
| `data` | `OHLCTuple[]` | OHLC data |
| `volumes` | `number[]` | Volume array (same length as data) |

**Returns:** `[timestamp, vwap][]`

### `computeOBV(data, volumes)`

On-Balance Volume.

**Returns:** `[timestamp, obv][]`

### `computeADX(data, period?)`

Average Directional Index.

| Parameter | Type | Default |
|-----------|------|---------|
| `period` | `number` | `14` |

**Returns:** `ADXResult`

```ts
interface ADXResult {
  adx: [number, number][];
  plusDI: [number, number][];
  minusDI: [number, number][];
}
```

### `computeIchimoku(data, tenkanPeriod?, kijunPeriod?, senkouPeriod?, displacement?)`

Ichimoku Cloud.

| Parameter | Type | Default |
|-----------|------|---------|
| `tenkanPeriod` | `number` | `9` |
| `kijunPeriod` | `number` | `26` |
| `senkouPeriod` | `number` | `52` |
| `displacement` | `number` | `26` |

**Returns:** `IchimokuResult`

```ts
interface IchimokuResult {
  tenkan: [number, number][];   // Conversion line
  kijun: [number, number][];    // Base line
  senkouA: [number, number][];  // Leading span A (displaced forward)
  senkouB: [number, number][];  // Leading span B (displaced forward)
  chikou: [number, number][];   // Lagging span (displaced backward)
}
```

---

## Data Utilities

### `createTickAggregator(intervalMs)`

Creates a tick-to-OHLC aggregator for live streaming.

```ts
import { createTickAggregator } from 'dicharts';

const aggregator = createTickAggregator(60000); // 1-minute candles

// Feed ticks
const completed = aggregator.processTick({
  timestamp: Date.now(),
  price: 42150.50,
  volume: 1.5,
});

if (completed) {
  chart.appendCandles([completed]);
}

// Get the forming candle
const forming = aggregator.currentCandle();
if (forming) {
  chart.updateLastCandle(forming);
}

// Change timeframe
aggregator.setInterval(300000); // Switch to 5-minute
```

#### Tick Interface

```ts
interface Tick {
  timestamp: number;  // epoch ms
  price: number;
  volume?: number;
}
```

#### TickAggregator Interface

```ts
interface TickAggregator {
  processTick(tick: Tick): OHLCTuple | null;  // Returns completed candle or null
  currentCandle(): OHLCTuple | null;          // The forming candle
  setInterval(intervalMs: number): void;      // Change interval (resets state)
  reset(): void;                              // Reset internal state
}
```

### `downsampleOHLC(data, factor)`

Downsample OHLC data by taking every Nth candle.

```ts
import { downsampleOHLC } from 'dicharts';
const downsampled = downsampleOHLC(candles, 5); // Every 5th candle
```

### `toHeikinAshi(data)`

Convert OHLC data to Heikin-Ashi candles.

```ts
import { toHeikinAshi } from 'dicharts';
const haCandles = toHeikinAshi(candles);
```

### `toRenko(data)`

Convert OHLC data to Renko bricks.

```ts
import { toRenko } from 'dicharts';
const renkoBricks = toRenko(candles);
```

---

## Standalone Chart Components

All standalone components use Canvas2D (no WebGPU required). They work in all modern browsers. Each returns an instance with `update/setData`, `setOptions`, `redraw`, `resize`, and `dispose` methods.

---

### `createDepthChart(container, options)`

Order book depth visualization with stepped area curves.

```ts
import { createDepthChart } from 'dicharts';

const depth = createDepthChart(el, {
  bids: [{ price: 42000, quantity: 5 }, { price: 41900, quantity: 3 }],
  asks: [{ price: 42100, quantity: 4 }, { price: 42200, quantity: 6 }],
  midPrice: 42050,
  bidColor: '#26a69a',
  askColor: '#ef5350',
});

// Update data
depth.update(newBids, newAsks);
depth.dispose();
```

#### DepthChartOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `bids` | `DepthLevel[]` | `[]` | Bid levels (sorted by price descending) |
| `asks` | `DepthLevel[]` | `[]` | Ask levels (sorted by price ascending) |
| `bidColor` | `string` | `'#26a69a'` | Bid line colour |
| `askColor` | `string` | `'#ef5350'` | Ask line colour |
| `bidFillColor` | `string` | — | Bid area fill |
| `askFillColor` | `string` | — | Ask area fill |
| `midPrice` | `number` | — | Center price |
| `background` | `string` | — | Background colour |
| `textColor` | `string` | — | Label colour |
| `gridColor` | `string` | — | Grid colour |
| `showLabels` | `boolean` | — | Show price labels |

```ts
interface DepthLevel { price: number; quantity: number; }
```

---

### `createHeatmap(container, options)`

Treemap heatmap sized by weight and coloured by change value.

```ts
const heatmap = createHeatmap(el, {
  data: [
    { id: 'btc', label: 'BTC', weight: 1000, change: 2.5, sublabel: '$42,500' },
    { id: 'eth', label: 'ETH', weight: 500, change: -1.2, sublabel: '$2,200' },
  ],
  maxChange: 10,
  onClick: (item) => console.log('Clicked', item.label),
});

heatmap.setData(newData);
heatmap.dispose();
```

#### HeatmapOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `data` | `HeatmapItem[]` | `[]` | Items to display |
| `maxChange` | `number` | `10` | Max change for full colour saturation |
| `positiveColor` | `string` | `'#26a69a'` | Positive change colour |
| `negativeColor` | `string` | `'#ef5350'` | Negative change colour |
| `neutralColor` | `string` | `'#2a2e39'` | Zero change colour |
| `gap` | `number` | `2` | Gap between cells (CSS px) |
| `borderRadius` | `number` | `3` | Cell border radius (CSS px) |
| `onClick` | `(item) => void` | — | Click callback |

```ts
interface HeatmapItem {
  id: string;
  label: string;
  weight: number;     // Sizing (e.g. market cap)
  change: number;     // Colouring (e.g. % change)
  sublabel?: string;
  group?: string;
}
```

---

### `createSparkline(container, options)`

Tiny inline chart for watchlists and dashboards. No axes, no interaction.

```ts
const spark = createSparkline(el, {
  data: [100, 102, 98, 105, 110, 108],
  lineWidth: 1.5,
});

spark.setData(newPrices);
spark.dispose();
```

#### SparklineOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `data` | `number[]` | `[]` | Numeric values (e.g. close prices) |
| `lineColor` | `string` | auto | Line colour (auto: green if up, red if down) |
| `fillColor` | `string` | auto | Area fill colour (set to `'none'` to disable) |
| `lineWidth` | `number` | `1.5` | Line width (CSS px) |
| `upColor` | `string` | `'#26a69a'` | Positive trend colour |
| `downColor` | `string` | `'#ef5350'` | Negative trend colour |
| `background` | `string` | transparent | Background colour |

---

### `createDonutChart(container, options)` / `createPieChart(container, options)`

Feature-complete pie/donut chart supporting multiple display modes — full pie or donut, inside/outside labels, custom formatters, label list with connector lines, auto-generated legend, interactive hover with tooltips, entry animations (sweep, grow, fade), active slice highlighting, custom center text, stacked concentric rings, and transparent backgrounds. `createPieChart` is an alias for `createDonutChart`.

#### Pie Chart — Basic

```ts
const pie = createDonutChart(el, {
  data: [
    { id: 'btc', label: 'Bitcoin', value: 45 },
    { id: 'eth', label: 'Ethereum', value: 30 },
    { id: 'other', label: 'Other', value: 25 },
  ],
  innerRadius: 0,           // full pie (no hole)
  labelType: 'percentage',
  labelPosition: 'inside',
  animation: { duration: 900, easing: 'easeOut', style: 'sweep' },
});
```

#### Pie Chart — Label (Name Labels)

```ts
const pie = createDonutChart(el, {
  data: slices,
  innerRadius: 0,
  labelType: 'label',        // shows slice.label on each slice
  labelPosition: 'inside',
});
```

#### Pie Chart — Custom Label

```ts
const pie = createDonutChart(el, {
  data: revenueSlices,
  innerRadius: 0,
  labelType: 'custom',
  formatLabel: (slice, pct, total) => `$${(slice.value / 1000).toFixed(1)}K`,
  labelPosition: 'inside',
});
```

#### Pie Chart — Label List (Outside Labels with Connector Lines)

```ts
const pie = createDonutChart(el, {
  data: slices,
  innerRadius: 0,
  labelType: 'custom',
  formatLabel: (slice, pct) => `${slice.label} (${pct.toFixed(0)}%)`,
  labelPosition: 'outside',
  showLabelLines: true,
  showLegend: false,
});
```

#### Pie Chart — Legend

```ts
const pie = createDonutChart(el, {
  data: slices,
  innerRadius: 0,
  labelType: 'none',         // no labels on slices
  showLegend: true,           // auto-generated legend
  animation: { style: 'fade' },
});
```

#### Donut Chart — Standard

```ts
const donut = createDonutChart(el, {
  data: slices,
  innerRadius: 0.55,
  centerText: 'auto',        // shows hovered slice or total
  showLegend: true,
  animation: { duration: 800, easing: 'easeOut', style: 'sweep' },
});
```

#### Donut Chart — Active Slice

```ts
const donut = createDonutChart(el, {
  data: slices,
  innerRadius: 0.55,
  interactive: true,
  activeIndex: 1,             // 2nd slice is highlighted
  onClick: (slice, idx) => donut.setActiveIndex(idx),
});
```

#### Donut Chart — Custom Center Text

```ts
const donut = createDonutChart(el, {
  data: slices,
  innerRadius: 0.6,
  labelType: 'none',
  centerText: (hovered, total) => {
    if (hovered) return { title: hovered.label, value: `${hovered.value}%` };
    return { title: 'Sessions', value: `${total}%` };
  },
});
```

#### Pie Chart — Stacked (Concentric Rings)

```ts
const stacked = createDonutChart(el, {
  stackedData: [
    // Outer ring
    [{ id: 'na', label: 'N. America', value: 40 }, { id: 'eu', label: 'Europe', value: 30 }, ...],
    // Inner ring
    [{ id: 'saas', label: 'SaaS', value: 55 }, { id: 'ent', label: 'Enterprise', value: 30 }, ...],
  ],
  showLegend: true,
  animation: { duration: 1000, easing: 'easeOut', style: 'sweep' },
});
```

#### Pie Chart — Interactive (Hover + Tooltip)

```ts
const pie = createDonutChart(el, {
  data: slices,
  innerRadius: 0.5,
  interactive: true,          // dims non-hovered slices
  showTooltip: true,          // DOM tooltip on hover
  formatValue: (v) => `$${(v / 1000).toFixed(1)}K`,
  onHover: (slice, idx) => console.log(slice?.label ?? 'none'),
});
```

#### Transparent Background

```ts
const pie = createDonutChart(el, {
  data: slices,
  background: 'transparent',  // clearRect only — inherits parent
});
```

#### DonutChartOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `data` | `DonutSlice[]` | `[]` | Slices to display |
| `stackedData` | `DonutSlice[][]` | `[]` | Array of rings for stacked mode (outermost first). Takes precedence over `data`. |
| `innerRadius` | `number` | `0.55` | 0 = full pie, 0.5 = donut with 50% inner radius |
| `colors` | `string[]` | built-in palette | Colour cycle |
| `background` | `string` | `'transparent'` | Background colour. `'transparent'` inherits parent. Set a hex value to override. |
| `textColor` | `string` | `'#e6edf3'` | Text colour for labels and center text |
| `labelType` | `string` | `'percentage'` | `'percentage'` / `'value'` / `'label'` / `'custom'` / `'none'` |
| `labelPosition` | `string` | `'inside'` | `'inside'` / `'outside'` / `'none'` |
| `showLabelLines` | `boolean` | auto | Show connector lines for outside labels |
| `formatLabel` | `function` | — | `(slice, pct, total) => string` custom label formatter |
| `showLabels` | `boolean` | `true` | Backward compat: maps to labelType + labelPosition |
| `showLegend` | `boolean` | `true` | Show auto-generated legend |
| `showTooltip` | `boolean` | `false` | Show DOM tooltip on hover |
| `interactive` | `boolean` | `false` | Dim non-hovered slices to 35% opacity |
| `activeIndex` | `number` | `-1` | Programmatic active (highlighted) slice |
| `centerText` | `CenterTextConfig` | `'auto'` | `'auto'` / `'none'` / `{ title, value }` / `(hovered, total) => { title, value }` |
| `animation` | `boolean \| DonutAnimationConfig` | `false` | Entry animation config |
| `formatValue` | `(v: number) => string` | built-in | Custom value formatter for tooltip / center text |
| `onClick` | `(slice, index) => void` | — | Click callback |
| `onHover` | `(slice \| null, index) => void` | — | Hover callback |

#### DonutAnimationConfig

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `duration` | `number` | `800` | Animation duration in ms |
| `easing` | `string` | `'easeOut'` | `'linear'` / `'easeOut'` / `'easeInOut'` / `'spring'` |
| `delay` | `number` | `0` | Stagger delay between slices in ms |
| `style` | `string` | `'sweep'` | `'sweep'` / `'grow'` / `'fade'` / `'none'` |

#### DonutChartInstance Methods

| Method | Description |
|--------|-------------|
| `setData(data)` | Replace slices and re-render (re-animates if enabled) |
| `setStackedData(data)` | Replace stacked rings and re-render |
| `setOptions(opts)` | Merge partial options and re-render |
| `setActiveIndex(idx)` | Highlight a slice by index (`null` to clear) |
| `redraw()` | Force redraw |
| `resize()` | Recalculate canvas dimensions and redraw |
| `dispose()` | Remove canvas, tooltip, and event listeners |

```ts
interface DonutSlice { id: string; label: string; value: number; color?: string; }
```

---

### `createBarChart(container, options)`

Feature-complete bar chart supporting multiple display modes — vertical/horizontal, simple/grouped/stacked, per-bar colours, interactive hover with tooltips, entry animations, and transparent backgrounds. Comparable to shadcn/Recharts bar chart variants.

#### Bar Chart — Basic (Vertical)

```ts
const bar = createBarChart(el, {
  data: [
    { label: 'Mon', value: 150 },
    { label: 'Tue', value: -80 },
    { label: 'Wed', value: 220 },
  ],
  autoColor: true,
  animation: true,
});
```

#### Bar Chart — Horizontal

```ts
const bar = createBarChart(el, {
  data: items,
  orientation: 'horizontal',
  autoColor: false,
  barColor: '#2962ff',
});
```

#### Bar Chart — Per-bar Colours (Mixed)

```ts
const bar = createBarChart(el, {
  data: [
    { label: 'BTC', value: 45, color: '#f7931a' },
    { label: 'ETH', value: 30, color: '#627eea' },
    { label: 'SOL', value: 15, color: '#14f195' },
  ],
  autoColor: false,
});
```

#### Bar Chart — Negative Values

```ts
const bar = createBarChart(el, {
  data: pnlByDay,         // mix of positive and negative values
  autoColor: true,         // green for gains, red for losses
  positiveColor: '#26a69a',
  negativeColor: '#ef5350',
});
```

#### Bar Chart — Multiple (Grouped Series)

```ts
const bar = createBarChart(el, {
  seriesData: [
    { label: 'Q1', values: { Revenue: 400, Costs: 250, Profit: 150 } },
    { label: 'Q2', values: { Revenue: 500, Costs: 300, Profit: 200 } },
    { label: 'Q3', values: { Revenue: 450, Costs: 280, Profit: 170 } },
  ],
});
```

#### Bar Chart — Stacked + Legend

```ts
const bar = createBarChart(el, {
  seriesData: [
    { label: 'Q1', values: { Revenue: 400, Costs: -250 } },
    { label: 'Q2', values: { Revenue: 500, Costs: -300 } },
  ],
  stacked: true,
  showLegend: true,
});
```

#### Bar Chart — Labels (Inside / Outside)

```ts
const bar = createBarChart(el, {
  data: items,
  orientation: 'horizontal',
  labelPosition: 'inside',   // or 'outside' (default) or 'none'
  formatValue: (v) => `$${v.toLocaleString()}`,
});
```

#### Bar Chart — Interactive (Hover + Tooltip)

```ts
const bar = createBarChart(el, {
  data: items,
  interactive: true,     // hover highlighting (default: true)
  showTooltip: true,     // DOM tooltip on hover (default: true)
  onClick: (item, idx) => console.log('Clicked', item.label, idx),
  onHover: (item, idx) => updateHeader(item),
});
```

#### Bar Chart — Active (Programmatic Highlight)

```ts
const bar = createBarChart(el, { data: items, interactive: true });
bar.setActiveIndex(2);   // highlight the 3rd bar
bar.setActiveIndex(null); // clear highlight
```

#### Bar Chart — Animated

```ts
// Use defaults (grow, 600ms, easeOut)
const bar = createBarChart(el, { data: items, animation: true });

// Custom animation
const bar2 = createBarChart(el, {
  data: items,
  animation: {
    duration: 800,
    easing: 'spring',     // 'linear' | 'easeOut' | 'easeInOut' | 'spring'
    delay: 50,            // per-bar stagger delay (ms)
    style: 'fadeGrow',    // 'grow' | 'fadeGrow' | 'slide' | 'none'
  },
});
```

#### Bar Chart — Transparent Background

```ts
const bar = createBarChart(el, {
  data: items,
  background: 'transparent', // inherits parent bg (ideal for shadcn/themed cards)
});
```

#### BarChartOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `data` | `BarDataPoint[]` | `[]` | Simple bar data (one value per bar) |
| `seriesData` | `BarSeriesDataPoint[]` | `[]` | Series data for grouped/stacked mode. Takes precedence over `data`. |
| `orientation` | `'vertical' \| 'horizontal'` | `'vertical'` | Bar orientation |
| `stacked` | `boolean` | `false` | Render series as stacked instead of grouped |
| `autoColor` | `boolean` | `true` | Green for positive, red for negative (simple mode) |
| `positiveColor` | `string` | `'#26a69a'` | Positive bar colour |
| `negativeColor` | `string` | `'#ef5350'` | Negative bar colour |
| `barColor` | `string` | `'#2962ff'` | Default colour when autoColor is off |
| `background` | `string` | `'transparent'` | Background. Inherits parent by default. Set a hex value to override. |
| `textColor` | `string` | `'#e6edf3'` | Text colour |
| `gridColor` | `string` | `'rgba(255,255,255,0.06)'` | Grid line colour |
| `gap` | `number` | `0.3` | Gap as fraction of bar slot width |
| `borderRadius` | `number` | `3` | Bar corner radius (CSS px) |
| `showValues` | `boolean` | `true` | Show value labels on bars |
| `showLabels` | `boolean` | `true` | Show category-axis labels |
| `showLegend` | `boolean` | `true` | Auto-generated legend (series mode) |
| `showGrid` | `boolean` | `true` | Show grid lines |
| `showTooltip` | `boolean` | `true` | Show tooltip on hover |
| `labelPosition` | `'outside' \| 'inside' \| 'none'` | `'outside'` | Value label position |
| `formatValue` | `(v: number) => string` | auto | Custom value formatter |
| `interactive` | `boolean` | `true` | Enable hover highlighting |
| `activeIndex` | `number` | `-1` | Programmatic active bar index |
| `animation` | `boolean \| BarAnimationConfig` | `false` | Entry animation config |
| `onClick` | `(item, index) => void` | — | Click callback |
| `onHover` | `(item, index) => void` | — | Hover callback |

#### BarAnimationConfig

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `duration` | `number` | `600` | Per-bar animation duration (ms) |
| `easing` | `string` | `'easeOut'` | `'linear'`, `'easeOut'`, `'easeInOut'`, `'spring'` |
| `delay` | `number` | `30` | Per-bar stagger delay (ms) |
| `style` | `string` | `'grow'` | `'grow'`, `'fadeGrow'`, `'slide'`, `'none'` |

#### Data Types

```ts
interface BarDataPoint { label: string; value: number; color?: string; }

interface BarSeriesDataPoint {
  label: string;
  values: { [seriesKey: string]: number };
  colors?: { [seriesKey: string]: string };
}
```

#### BarChartInstance methods

| Method | Description |
|--------|-------------|
| `setData(data)` | Replace bar data (simple mode, clears seriesData). Re-animates. |
| `setSeriesData(data)` | Replace series data (grouped/stacked mode). Re-animates. |
| `setOptions(opts)` | Partial-merge update of options |
| `setActiveIndex(idx)` | Set programmatic active bar (pass `null` to clear) |
| `redraw()` | Force a redraw |
| `resize()` | Recalculate canvas size and redraw |
| `dispose()` | Destroy the chart, remove canvas and tooltip |

---

### `createRadarChart(container, options)`

Feature-complete radar/spider chart supporting polygon or circular grids, single or multi-series with fill and stroke, data-point dots, custom axis labels, filled grid bands, radius-axis value labels, auto-generated legend, interactive hover with tooltips, and entry animations.

#### Radar Chart — Basic

```ts
const radar = createRadarChart(el, {
  axes: [
    { key: 'attack', label: 'Attack' },
    { key: 'defense', label: 'Defense' },
    { key: 'speed', label: 'Speed' },
    { key: 'magic', label: 'Magic' },
    { key: 'stamina', label: 'Stamina' },
  ],
  series: [{
    name: 'Player A',
    data: { attack: 85, defense: 70, speed: 90, magic: 60, stamina: 75 },
  }],
  animation: { duration: 800, easing: 'easeOut', style: 'grow' },
});
```

#### Radar Chart — Multiple Series

```ts
const radar = createRadarChart(el, {
  axes: axes,
  series: [playerA, playerB],
  showDots: true,
  showLegend: true,
  fillOpacity: 0.15,
});
```

#### Radar Chart — Lines Only

```ts
const radar = createRadarChart(el, {
  axes: axes,
  series: [seriesA, seriesB, seriesC],
  showFill: false,
  showLines: true,
  showDots: true,
  lineWidth: 2,
});
```

#### Radar Chart — Circle Grid

```ts
const radar = createRadarChart(el, {
  axes: axes,
  series: [seriesA],
  gridType: 'circle',
});
```

#### Radar Chart — Filled Grid Bands

```ts
const radar = createRadarChart(el, {
  axes: axes,
  series: [seriesA],
  gridFilled: true,
  gridLevels: 5,
});
```

#### Radar Chart — Custom Axis Labels

```ts
const radar = createRadarChart(el, {
  axes: axes,
  series: [seriesA],
  formatLabel: (axis, idx) => `${idx + 1}. ${axis.label}`,
});
```

#### Radar Chart — Radius Axis (Value Labels)

```ts
const radar = createRadarChart(el, {
  axes: axes.map(a => ({ ...a, max: 100 })),
  series: [seriesA],
  showValueLabels: true,
  formatValue: (v) => `${v}`,
});
```

#### Radar Chart — Interactive (Hover + Tooltip)

```ts
const radar = createRadarChart(el, {
  axes: axes,
  series: [seriesA, seriesB],
  interactive: true,
  showTooltip: true,
  showDots: true,
  onHover: (series, axisKey) => console.log(series?.name, axisKey),
});
```

#### RadarChartOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `axes` | `RadarAxis[]` | `[]` | Spokes of the radar: `{ key, label, max? }` |
| `series` | `RadarSeries[]` | `[]` | Data series: `{ name, data: Record<string,number>, color?, fillOpacity? }` |
| `gridType` | `string` | `'polygon'` | `'polygon'` or `'circle'` |
| `gridLevels` | `number` | `5` | Number of concentric grid levels |
| `gridFilled` | `boolean` | `false` | Alternating filled grid bands |
| `showDots` | `boolean` | `false` | Show data-point dots |
| `dotRadius` | `number` | `4` | Dot radius in CSS px |
| `fillOpacity` | `number` | `0.25` | Default fill opacity for series areas |
| `showFill` | `boolean` | `true` | Show area fill |
| `showLines` | `boolean` | `true` | Show series stroke lines |
| `lineWidth` | `number` | `2` | Stroke width in CSS px |
| `showAxisLabels` | `boolean` | `true` | Show axis labels around perimeter |
| `formatLabel` | `function` | — | `(axis, index) => string` custom label formatter |
| `showValueLabels` | `boolean` | `false` | Show value labels along first spoke |
| `formatValue` | `function` | built-in | `(v: number) => string` value formatter |
| `showLegend` | `boolean` | `true` | Show legend for multi-series |
| `showTooltip` | `boolean` | `false` | Show DOM tooltip on hover |
| `interactive` | `boolean` | `false` | Dim non-hovered series to 15% opacity |
| `background` | `string` | `'transparent'` | Inherits parent by default. Set a hex value to override. |
| `textColor` | `string` | `'#e6edf3'` | Label text colour |
| `gridColor` | `string` | `'rgba(255,255,255,0.08)'` | Grid line colour |
| `colors` | `string[]` | built-in palette | Colour cycle for series |
| `animation` | `boolean \| RadarAnimationConfig` | `false` | Entry animation |
| `onClick` | `(series, axisKey, value) => void` | — | Click callback |
| `onHover` | `(series \| null, axisKey \| null) => void` | — | Hover callback |

#### RadarAnimationConfig

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `duration` | `number` | `800` | Animation duration in ms |
| `easing` | `string` | `'easeOut'` | `'linear'` / `'easeOut'` / `'easeInOut'` / `'spring'` |
| `style` | `string` | `'grow'` | `'grow'` (expand from center) / `'fade'` / `'none'` |

#### RadarChartInstance Methods

| Method | Description |
|--------|-------------|
| `setSeries(series)` | Replace series data and re-render |
| `setAxes(axes)` | Replace axes and re-render |
| `setOptions(opts)` | Merge partial options and re-render |
| `redraw()` | Force redraw |
| `resize()` | Recalculate canvas dimensions and redraw |
| `dispose()` | Remove canvas, tooltip, and event listeners |

---

### `createAreaChart(container, options)`

Feature-complete area chart supporting smooth/linear/step curves, single or multi-series with filled areas, stacked and stacked-expanded (100%) modes, gradient fills, data-point dots, grid lines, axis labels, auto-generated legend, interactive hover with tooltips, and entry animations.

```ts
import { createAreaChart } from 'dicharts';

const area = createAreaChart(el, {
  data: [
    { label: 'Jan', value: 186 },
    { label: 'Feb', value: 305 },
    { label: 'Mar', value: 237 },
    { label: 'Apr', value: 73 },
    { label: 'May', value: 209 },
    { label: 'Jun', value: 214 },
  ],
  curveType: 'smooth',
  fillOpacity: 0.3,
  animation: { duration: 800, easing: 'easeOut', style: 'draw' },
});

area.dispose();
```

#### Area Chart — Multi-Series

```ts
const area = createAreaChart(el, {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  series: [
    { name: 'Desktop', data: [186, 305, 237, 173, 209, 214], color: '#2962ff' },
    { name: 'Mobile', data: [80, 200, 120, 190, 130, 140], color: '#26a69a' },
  ],
  showLegend: true,
  fillOpacity: 0.2,
  animation: { duration: 800, easing: 'easeOut', style: 'draw' },
});
```

#### Area Chart — Stacked

```ts
const area = createAreaChart(el, {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  series: [
    { name: 'Desktop', data: [186, 305, 237, 173, 209, 214], color: '#2962ff' },
    { name: 'Mobile', data: [80, 200, 120, 190, 130, 140], color: '#26a69a' },
  ],
  stacked: true,
  showLegend: true,
});
```

#### Area Chart — Stacked Expanded (100%)

```ts
const area = createAreaChart(el, {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  series: [
    { name: 'Desktop', data: [186, 305, 237, 173, 209, 214] },
    { name: 'Mobile', data: [80, 200, 120, 190, 130, 140] },
    { name: 'Tablet', data: [40, 55, 70, 45, 60, 50] },
  ],
  stacked: true,
  stackedExpanded: true,
  showLegend: true,
});
```

#### Area Chart — Gradient Fill

```ts
const area = createAreaChart(el, {
  data: items,
  gradient: true,
  fillOpacity: 0.5,
  colors: ['#A78BFA'],
});
```

#### Area Chart — Step Curve

```ts
const area = createAreaChart(el, {
  data: items,
  curveType: 'step',
  fillOpacity: 0.25,
});
```

#### Area Chart — With Dots

```ts
const area = createAreaChart(el, {
  data: items,
  showDots: true,
  dotRadius: 5,
  gradient: true,
});
```

#### Area Chart — Interactive (Hover + Tooltip)

```ts
const area = createAreaChart(el, {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  series: [
    { name: 'Downloads', data: [1200, 2100, 1800, 3200, 2400, 2900], color: '#2962ff' },
    { name: 'Uploads', data: [400, 700, 600, 1100, 900, 1050], color: '#FFD700' },
  ],
  interactive: true,
  showTooltip: true,
  showDots: true,
  gradient: true,
  showLegend: true,
});
```

#### Area Chart — Transparent Background

```ts
const area = createAreaChart(el, {
  data: items,
  background: 'transparent', // inherits parent bg (ideal for shadcn/themed cards)
});
```

#### AreaChartOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `data` | `AreaDataPoint[]` | `[]` | Simple single-series data |
| `series` | `AreaSeriesConfig[]` | `[]` | Multi-series data. Each series has a `name`, `data: number[]`, optional `color` and `fillOpacity`. |
| `labels` | `string[]` | `[]` | X-axis labels (required when using `series` mode) |
| `curveType` | `string` | `'smooth'` | `'smooth'` (bezier) / `'linear'` / `'step'` |
| `stacked` | `boolean` | `false` | Stack series on top of each other |
| `stackedExpanded` | `boolean` | `false` | Normalize stacked values to 100% |
| `fillOpacity` | `number` | `0.3` | Default fill opacity for the area |
| `gradient` | `boolean` | `false` | Vertical gradient fill (colour → transparent) |
| `lineWidth` | `number` | `2` | Stroke line width in CSS px |
| `showDots` | `boolean` | `false` | Show data-point dots on the curve |
| `dotRadius` | `number` | `4` | Dot radius in CSS px |
| `showXAxis` | `boolean` | `true` | Show X-axis labels |
| `showYAxis` | `boolean` | `true` | Show Y-axis labels |
| `showGrid` | `boolean` | `true` | Show horizontal grid lines |
| `showLegend` | `boolean` | `true` | Show auto-generated legend (multi-series) |
| `showTooltip` | `boolean` | `true` | Show tooltip on hover |
| `interactive` | `boolean` | `true` | Enable hover highlighting |
| `formatValue` | `(v: number) => string` | auto | Custom value formatter |
| `colors` | `string[]` | built-in palette | Colour cycle for series |
| `background` | `string` | `'transparent'` | Inherits parent by default. Set a hex value to override. |
| `textColor` | `string` | auto | Text colour (auto-detects light/dark) |
| `gridColor` | `string` | auto | Grid line colour (auto-detects light/dark) |
| `animation` | `boolean \| AreaAnimationConfig` | `false` | Entry animation config |
| `onClick` | `(label, index) => void` | — | Click callback |
| `onHover` | `(label \| null, index) => void` | — | Hover callback |

#### AreaAnimationConfig

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `duration` | `number` | `800` | Animation duration in ms |
| `easing` | `string` | `'easeOut'` | `'linear'` / `'easeOut'` / `'easeInOut'` / `'spring'` |
| `style` | `string` | `'draw'` | `'draw'` (progressive reveal) / `'fade'` / `'grow'` (rise from baseline) / `'none'` |

#### AreaChartInstance Methods

| Method | Description |
|--------|-------------|
| `setData(data)` | Replace single-series data and re-render |
| `setSeries(series)` | Replace multi-series data and re-render |
| `setOptions(opts)` | Merge partial options and re-render |
| `redraw()` | Force redraw |
| `resize()` | Recalculate canvas dimensions and redraw |
| `dispose()` | Remove canvas, tooltip, and event listeners |

---

### `createGauge(container, options)`

Semi-circle gauge meter for displaying a value within a range.

```ts
const gauge = createGauge(el, {
  value: 72,
  min: 0,
  max: 100,
  label: 'Fear & Greed',
  segments: [
    { color: '#ef5350', from: 0, to: 25 },
    { color: '#ff9800', from: 25, to: 45 },
    { color: '#FFD700', from: 45, to: 55 },
    { color: '#8bc34a', from: 55, to: 75 },
    { color: '#26a69a', from: 75, to: 100 },
  ],
});

gauge.setValue(85);
gauge.dispose();
```

#### GaugeOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `value` | `number` | `0` | Current value |
| `min` | `number` | `0` | Minimum value |
| `max` | `number` | `100` | Maximum value |
| `label` | `string` | — | Center label text |
| `formatValue` | `(v) => string` | number display | Value formatting function |
| `segments` | `Segment[]` | 5-segment default | Colour segments |
| `trackColor` | `string` | dark grey | Unfilled track colour |
| `needleColor` | `string` | white | Needle colour |
| `thickness` | `number` | `0.18` | Arc thickness as fraction of radius |

---

## Themes

### Built-in Themes

```ts
import { darkTheme, lightTheme } from 'dicharts';
```

### ChartTheme Interface

```ts
interface ChartTheme {
  background: string;
  gridColor: string;
  axisTextColor: string;
  axisBorderColor: string;
  crosshairColor: string;
  tooltipBackground: string;
  tooltipBorder: string;
  tooltipText: string;
  candleUpColor: string;
  candleDownColor: string;
  candleUpBorderColor: string;
  candleDownBorderColor: string;
  textColor: string;
  textSecondary: string;
}
```

---

## Usage Examples

### Basic Chart

```ts
import { DiChart } from 'dicharts';

const chart = await DiChart.create(container, {
  candles: { data: candles, style: 'classic' },
  volume: { enabled: true, data: volumes },
});
```

### With Indicators

```ts
const chart = await DiChart.create(container, {
  candles: { data: candles },
  overlays: [
    { id: 'sma20', type: 'sma', period: 20, color: '#FFD700' },
    { id: 'bb', type: 'bollinger', period: 20, stdDev: 2, color: '#4ECDC4' },
  ],
  subPanes: [
    { id: 'rsi', type: 'rsi', period: 14, height: 120 },
    { id: 'macd', type: 'macd', fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, height: 130 },
  ],
});
```

### Streaming

```ts
import { DiChart, createTickAggregator } from 'dicharts';

const chart = await DiChart.create(container, {
  candles: { data: historicalCandles },
  volume: { enabled: true, data: historicalVolumes },
  autoScroll: true,
});

const aggregator = createTickAggregator(60000); // 1-minute

ws.onmessage = (msg) => {
  const trade = JSON.parse(msg.data);
  const completed = aggregator.processTick({
    timestamp: trade.time,
    price: trade.price,
    volume: trade.qty,
  });

  if (completed) {
    chart.appendCandles([completed]);
  }

  const forming = aggregator.currentCandle();
  if (forming) {
    chart.updateLastCandle(forming);
  }
};
```

### Order Lines

```ts
chart.addOrderLine({ id: 'buy', price: 41500, label: 'Buy Limit', color: '#26a69a', style: 'dashed' });
chart.addOrderLine({ id: 'tp', price: 43000, label: 'Take Profit', color: '#FFD700', style: 'dashed' });
chart.addOrderLine({ id: 'sl', price: 40800, label: 'Stop Loss', color: '#ef5350', style: 'dashed' });

// Remove one
chart.removeOrderLine('tp');

// Remove all
chart.clearOrderLines();
```

### Standalone Indicator Computation

```ts
import { computeRSI, computeMACD, computeBollinger } from 'dicharts';

const rsi = computeRSI(candles, 14);
const macd = computeMACD(candles, 12, 26, 9);
const bb = computeBollinger(candles, 20, 2);

// Use the values in your own UI
console.log('Latest RSI:', rsi[rsi.length - 1][1]);
```
