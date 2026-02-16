<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://dicharts.com/logo-darkmode.webp" />
    <source media="(prefers-color-scheme: light)" srcset="https://dicharts.com/logo-lightmode.webp" />
    <img src="https://dicharts.com/logo-darkmode.webp" alt="DiCharts" width="200" />
  </picture>
</p>

<h1 align="center">DiCharts</h1>

<p align="center">
  <strong>The fastest charting library for trading platforms.</strong><br/>
  GPU-accelerated charts built for crypto exchanges, trading desks, and fintech products.
</p>

<p align="center">
  <a href="https://dicharts.com">Website</a> &middot;
  <a href="https://docs.dicharts.com">Documentation</a> &middot;
  <a href="https://dicharts.com/examples">Live Examples</a> &middot;
  <a href="https://dicharts.com/contact">Contact</a>
</p>

---

## Why DiCharts?

| | |
|---|---|
| **100K+ candles @ 60fps** | WebGPU instanced rendering pushes every frame to the GPU |
| **< 2ms render latency** | Purpose-built for real-time trading where milliseconds matter |
| **Zero dependencies** | Pure TypeScript — no runtime bloat, no supply-chain risk |
| **11 technical indicators** | Overlays and oscillators computed on the fly |
| **8 chart styles** | Classic, Hollow, Heikin-Ashi, Renko, Bar, Line, Area, Baseline |
| **6 dashboard components** | Depth Chart, Heatmap, Sparklines, Donut, Bar Chart, Gauge |

## Chart Styles

| Candlestick | Series |
|---|---|
| Classic | Bar (OHLC) |
| Hollow | Line |
| Heikin-Ashi | Area |
| Renko | Baseline |

## Technical Indicators

**Overlays** — rendered directly on the price chart:

- **SMA** — Simple Moving Average
- **EMA** — Exponential Moving Average
- **Bollinger Bands** — Upper, middle, and lower bands
- **VWAP** — Volume Weighted Average Price
- **Ichimoku Cloud** — Tenkan, Kijun, Senkou Span A/B, Chikou

**Oscillators** — rendered in dedicated sub-panes:

- **RSI** — Relative Strength Index
- **MACD** — Signal line + histogram
- **Stochastic** — %K and %D lines
- **ATR** — Average True Range
- **OBV** — On-Balance Volume
- **ADX** — Average Directional Index

## Dashboard Components

Standalone Canvas2D widgets that work in every browser — no WebGPU required.

- **Depth Chart** — Order book bid/ask visualization
- **Heatmap** — Market treemap with grouped sectors
- **Sparklines** — Compact mini-charts for watchlists and tickers
- **Donut / Pie Chart** — Portfolio allocation breakdown
- **Bar Chart** — P&L, statistics, and comparisons
- **Gauge** — Scalar metrics like Fear & Greed Index

## Quick Start

```html
<div id="chart" style="width: 100%; height: 500px;"></div>

<script src="https://cdn.dicharts.com/sdk/v1/dicharts.min.js"></script>
<script>
  const widget = await DiCharts.createWidget('#chart', {
    symbol: 'BTC/USDT',
    theme: 'dark',
    data: [
      // [timestamp, open, high, low, close]
      [1700000000000, 42100, 42500, 41800, 42350],
      [1700000060000, 42350, 42700, 42200, 42600],
      // ...
    ],
    overlays: [
      { type: 'sma', period: 20, color: '#FFD700' },
      { type: 'bollinger', period: 20, stdDev: 2 },
    ],
    subPanes: [
      { type: 'rsi', period: 14 },
      { type: 'macd', fast: 12, slow: 26, signal: 9 },
    ],
  });
</script>
```

## Real-Time Streaming

```javascript
const widget = await DiCharts.createWidget('#chart', {
  symbol: 'BTC/USDT',
  theme: 'dark',
  data: historicalCandles,
  streaming: { timeframe: '1m' },
});

// Feed live ticks — DiCharts handles candle aggregation automatically
websocket.onmessage = (msg) => {
  const tick = JSON.parse(msg.data);
  widget.addTick({
    timestamp: tick.time,
    price: tick.price,
    volume: tick.volume,
  });
};
```

## Theming

```javascript
// Switch between dark and light mode without recreating the chart
widget.setTheme('light');
```

Full color customization is available — override candle colors, axis styles, crosshair appearance, and more.

## Interaction

| Gesture | Action |
|---|---|
| Scroll wheel (vertical) | Zoom in/out centered at cursor |
| Scroll wheel (horizontal) | Pan left/right |
| Click + drag | Pan |
| Pinch (touch) | Zoom on mobile |
| Crosshair | Automatic price/time tracking |

## Browser Support

**WebGPU Charts:**

- Chrome 113+ / Edge 113+
- Safari 18+
- Firefox 145+ (Mac), 114+ (Windows)

**Canvas2D Components** (Depth Chart, Heatmap, Sparklines, Donut, Bar, Gauge):

- Every modern browser — no WebGPU required

## Who Uses DiCharts

DiCharts powers charting for crypto exchanges, brokers, and fintech platforms worldwide. We work directly with engineering teams to deliver custom-built trading interfaces.

- [Brokeret](https://brokeret.com) — White-label broker platform
- [X9 Trader](https://x9trader.com) — Crypto trading terminal

## Links

- **Website:** [dicharts.com](https://dicharts.com)
- **Documentation:** [docs.dicharts.com](https://docs.dicharts.com)
- **Live Examples:** [dicharts.com/examples](https://dicharts.com/examples)
- **Contact:** [dicharts.com/contact](https://dicharts.com/contact)

## License

MIT &copy; [Finmetrik](https://github.com/finmetrik)
