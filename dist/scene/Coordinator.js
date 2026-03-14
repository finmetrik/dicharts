// ---------------------------------------------------------------------------
// DiCharts – Scene Coordinator
// ---------------------------------------------------------------------------
// Orchestrates the full render cycle:
//   1.  Compute layout (margins, plot area)
//   2.  Compute visible data range from viewport
//   3.  Build x/y scales
//   4.  Prepare renderers (grid → volume → candles → overlays → crosshair → axes)
//   5.  Encode a single GPU render pass and submit
// ---------------------------------------------------------------------------
import { computeLayout } from './Layout';
import { createScale } from './Scale';
import { resolveTheme } from '../theme';
import { createCandlestickRenderer } from '../rendering/CandlestickRenderer';
import { createGridRenderer } from '../rendering/GridRenderer';
import { createCrosshairRenderer } from '../rendering/CrosshairRenderer';
import { createAxisRenderer } from '../rendering/AxisRenderer';
import { createVolumeRenderer } from '../rendering/VolumeRenderer';
import { createLineOverlayRenderer } from '../rendering/LineOverlayRenderer';
import { createSeriesStyleRenderer } from '../rendering/SeriesStyleRenderer';
import { toHeikinAshi } from '../data/HeikinAshi';
import { toRenko } from '../data/Renko';
import { computeSMA, computeEMA } from '../indicators/ma';
import { computeBollinger } from '../indicators/bollinger';
import { computeRSI } from '../indicators/rsi';
import { computeMACD } from '../indicators/macd';
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function parseHexToVec4(hex) {
    let h = hex.replace('#', '');
    if (h.length === 3)
        h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    return [(n >> 16) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255, 1];
}
function parseRgbaToVec4(css) {
    const m = css.match(/rgba?\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
    if (m) {
        return [
            parseFloat(m[1]) / 255,
            parseFloat(m[2]) / 255,
            parseFloat(m[3]) / 255,
            m[4] !== undefined ? parseFloat(m[4]) : 1,
        ];
    }
    return parseHexToVec4(css);
}
// Default overlay indicator colours.
const DEFAULT_OVERLAY_COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#A78BFA', '#F472B6'];
export function createCoordinator(gpu, overlayContainer, subPaneContainer) {
    const candleRenderer = createCandlestickRenderer(gpu);
    const gridRenderer = createGridRenderer(gpu);
    const crosshairRenderer = createCrosshairRenderer(gpu);
    const axisRenderer = createAxisRenderer(overlayContainer);
    const volumeRenderer = createVolumeRenderer(gpu);
    const lineOverlayRenderer = createLineOverlayRenderer(gpu);
    const seriesStyleRenderer = createSeriesStyleRenderer(gpu);
    // Sub-pane line overlay renderers (one per sub-pane).
    let subPaneRenderers = new Map();
    // Sub-pane DOM containers.
    let subPaneContainers = new Map();
    let _layout = null;
    let _xScale = null;
    let _yScale = null;
    let _visibleData = [];
    let _visibleStart = 0;
    // Indicator computation cache – avoids recomputing on zoom/pan/crosshair frames.
    let _cacheDataId = '';
    let _cachedOverlayKey = '';
    let _cachedOverlayLines = [];
    let _rsiCache = new Map();
    let _macdCache = new Map();
    /** Build a short identity string for data change detection. */
    function getDataId(data) {
        if (data.length === 0)
            return '0';
        const first = data[0];
        const last = data[data.length - 1];
        return `${data.length}:${first[0]}:${last[0]}:${last[4]}`;
    }
    // ---------------------------------------------------------------------------
    function render(data, options, viewport, crosshairPos) {
        const theme = resolveTheme(options.theme);
        const dpr = gpu.dpr;
        const cssW = gpu.canvas.clientWidth;
        const cssH = gpu.canvas.clientHeight;
        // 1. Layout.
        const layout = computeLayout(cssW, cssH, dpr, options);
        _layout = layout;
        // 2. Visible slice via viewport.
        const totalCandles = data.length;
        const startIdx = Math.max(0, Math.floor(viewport.start * totalCandles));
        const endIdx = Math.min(totalCandles, Math.ceil(Math.min(viewport.end, 1) * totalCandles));
        const visible = data.slice(startIdx, endIdx);
        _visibleData = visible;
        _visibleStart = startIdx;
        if (visible.length === 0) {
            // Nothing to draw – just clear.
            submitClearPass(gpu, theme);
            axisRenderer.update(layout, createScale(0, 1, 0, 1), createScale(0, 1, 0, 1), options, theme);
            return;
        }
        // OHLCStore already normalises to tuples, so no conversion needed.
        let visibleTuples = visible;
        // Apply data transforms for special styles.
        const style = options.candles.style;
        if (style === 'heikin-ashi') {
            visibleTuples = toHeikinAshi(visibleTuples);
        }
        else if (style === 'renko') {
            visibleTuples = toRenko(visibleTuples);
        }
        // 3. Compute domains.
        let tMin = Infinity, tMax = -Infinity;
        let pMin = Infinity, pMax = -Infinity;
        for (const c of visibleTuples) {
            const ts = c[0], high = c[2], low = c[3];
            if (ts < tMin)
                tMin = ts;
            if (ts > tMax)
                tMax = ts;
            if (low < pMin)
                pMin = low;
            if (high > pMax)
                pMax = high;
        }
        // Add a small padding to price domain so candles don't touch edges.
        const pRange = pMax - pMin || 1;
        pMin -= pRange * 0.05;
        pMax += pRange * 0.05;
        // Compute average candle step for spacing.
        const avgStep = visibleTuples.length > 1
            ? (tMax - tMin) / (visibleTuples.length - 1)
            : 1;
        // Add half-candle padding to the left of time domain.
        tMin -= avgStep * 0.5;
        // Right side: if viewport extends beyond the data (overscroll for
        // streaming), extend the time axis to create empty space.
        if (viewport.end > 1.0 && totalCandles > 1) {
            const overscrollCandles = (viewport.end - 1.0) * totalCandles;
            tMax += avgStep * (0.5 + overscrollCandles);
        }
        else {
            tMax += avgStep * 0.5;
        }
        // Scales: x maps time → device pixels, y maps price → device pixels.
        const plot = layout.plotDevice;
        const xScale = createScale(tMin, tMax, plot.x, plot.x + plot.width);
        const yScale = createScale(pMin, pMax, plot.y + plot.height, plot.y); // y inverted
        _xScale = xScale;
        _yScale = yScale;
        // 4. Prepare renderers.
        gridRenderer.prepare(layout, theme, 6, 8);
        // Volume bars.
        if (options.volume.enabled && options.volume.data.length > 0) {
            const visVolumes = options.volume.data.slice(startIdx, endIdx);
            volumeRenderer.prepare(visibleTuples, visVolumes, xScale, layout, theme, options.candles.upColor, options.candles.downColor);
        }
        // Dispatch to the appropriate renderer based on style.
        const isCandleStyle = style === 'classic' || style === 'hollow' || style === 'heikin-ashi' || style === 'renko';
        if (isCandleStyle) {
            // Heikin-Ashi and Renko use the candlestick renderer with transformed data.
            const renderData = (style === 'heikin-ashi' || style === 'renko') ? visibleTuples : visible;
            candleRenderer.prepare(renderData, options.candles, xScale, yScale, layout, theme);
        }
        else {
            // bar / line / area / baseline
            seriesStyleRenderer.prepare(visibleTuples, options.candles, xScale, yScale, layout, theme);
        }
        // ---- Compute overlays (indicators) ----
        // Cache allTuples conversion and indicator results to avoid
        // recomputing on every zoom/pan/crosshair frame.
        const dataId = getDataId(data);
        if (dataId !== _cacheDataId) {
            _cacheDataId = dataId;
            // Data changed — clear indicator caches.
            _rsiCache.clear();
            _macdCache.clear();
        }
        const allTuples = data;
        const overlayConfigKey = options.overlays
            .map(c => `${c.type}:${c.period ?? ''}:${c.stdDev ?? ''}:${c.visible}:${c.color ?? ''}:${c.bandColor ?? ''}`)
            .join('|');
        const overlayKey = `${dataId}|${overlayConfigKey}`;
        let overlayLines;
        if (overlayKey === _cachedOverlayKey) {
            overlayLines = _cachedOverlayLines;
        }
        else {
            overlayLines = [];
            for (let oi = 0; oi < options.overlays.length; oi++) {
                const cfg = options.overlays[oi];
                if (cfg.visible === false)
                    continue;
                const color = cfg.color ?? DEFAULT_OVERLAY_COLORS[oi % DEFAULT_OVERLAY_COLORS.length];
                if (cfg.type === 'sma') {
                    const pts = computeSMA(allTuples, cfg.period ?? 20);
                    overlayLines.push({ points: pts, color });
                }
                else if (cfg.type === 'ema') {
                    const pts = computeEMA(allTuples, cfg.period ?? 20);
                    overlayLines.push({ points: pts, color });
                }
                else if (cfg.type === 'bollinger') {
                    const bb = computeBollinger(allTuples, cfg.period ?? 20, cfg.stdDev ?? 2);
                    overlayLines.push({ points: bb.middle, color });
                    const bandColor = cfg.bandColor ?? '#8888FF';
                    overlayLines.push({ points: bb.upper, color: bandColor, opacity: 0.6 });
                    overlayLines.push({ points: bb.lower, color: bandColor, opacity: 0.6 });
                }
            }
            _cachedOverlayLines = overlayLines;
            _cachedOverlayKey = overlayKey;
        }
        const horizontalLines = [];
        // Current price line (latest close).
        if (allTuples.length > 0) {
            const lastCandle = allTuples[allTuples.length - 1];
            const lastClose = lastCandle[4];
            const isUp = lastClose >= lastCandle[1];
            horizontalLines.push({
                price: lastClose,
                color: isUp ? options.candles.upColor : options.candles.downColor,
                dashed: true,
                opacity: 0.8,
            });
        }
        // Order / position lines.
        for (const ol of options.orderLines) {
            horizontalLines.push({
                price: ol.price,
                color: ol.color ?? '#FFD700',
                dashed: ol.style === 'dashed',
                opacity: 1,
            });
        }
        lineOverlayRenderer.prepare(overlayLines, horizontalLines, xScale, yScale, layout);
        // Crosshair (convert CSS position to device pixels).
        if (crosshairPos) {
            crosshairRenderer.prepare(layout, parseRgbaToVec4(theme.crosshairColor), crosshairPos.x * dpr, crosshairPos.y * dpr);
        }
        else {
            crosshairRenderer.prepare(layout, [0, 0, 0, 0], null, null);
        }
        // Axis labels (DOM).
        axisRenderer.update(layout, xScale, yScale, options, theme);
        // ---- Sub-panes (RSI / MACD / Volume) ----
        renderSubPanes(allTuples, visibleTuples, startIdx, endIdx, options, layout, xScale, theme, dpr);
        // 5. Encode GPU commands.
        const { device, context } = gpu;
        const textureView = context.getCurrentTexture().createView();
        const bgColor = parseHexToVec4(theme.background);
        const encoder = device.createCommandEncoder({ label: 'dicharts-frame' });
        const pass = encoder.beginRenderPass({
            colorAttachments: [
                {
                    view: textureView,
                    clearValue: { r: bgColor[0], g: bgColor[1], b: bgColor[2], a: bgColor[3] },
                    loadOp: 'clear',
                    storeOp: 'store',
                },
            ],
        });
        // Draw order: grid (back) → volume → series/candles → overlays → crosshair (front).
        gridRenderer.render(pass);
        if (options.volume.enabled)
            volumeRenderer.render(pass);
        if (isCandleStyle) {
            candleRenderer.render(pass);
        }
        else {
            seriesStyleRenderer.render(pass);
        }
        lineOverlayRenderer.render(pass);
        crosshairRenderer.render(pass);
        pass.end();
        device.queue.submit([encoder.finish()]);
    }
    // ---------------------------------------------------------------------------
    // Sub-pane rendering (DOM-based canvas overlays below main chart).
    // ---------------------------------------------------------------------------
    function renderSubPanes(allTuples, _visibleTuples, startIdx, endIdx, options, layout, xScale, theme, dpr) {
        const activeIds = new Set(options.subPanes.filter(p => p.visible !== false).map(p => p.id));
        // Remove stale sub-pane containers.
        for (const [id, el] of subPaneContainers) {
            if (!activeIds.has(id)) {
                el.remove();
                subPaneContainers.delete(id);
                const r = subPaneRenderers.get(id);
                if (r) {
                    r.dispose();
                    subPaneRenderers.delete(id);
                }
            }
        }
        // Position sub-panes below the main canvas.
        let yOffset = 0;
        for (const cfg of options.subPanes) {
            if (cfg.visible === false)
                continue;
            const height = cfg.height ?? 100;
            // Get or create container.
            let paneEl = subPaneContainers.get(cfg.id);
            if (!paneEl) {
                paneEl = document.createElement('div');
                paneEl.className = 'dicharts-subpane';
                paneEl.style.cssText = `position:relative;width:100%;overflow:hidden;border-top:1px solid ${theme.gridColor};`;
                subPaneContainer.appendChild(paneEl);
                subPaneContainers.set(cfg.id, paneEl);
            }
            paneEl.style.height = `${height}px`;
            // Get or create canvas for the sub-pane.
            let paneCanvas = paneEl.querySelector('canvas');
            if (!paneCanvas) {
                paneCanvas = document.createElement('canvas');
                paneCanvas.style.cssText = 'width:100%;height:100%;display:block;';
                paneEl.appendChild(paneCanvas);
            }
            // Size the canvas.
            const cW = paneEl.clientWidth;
            const cH = height;
            paneCanvas.width = Math.round(cW * dpr);
            paneCanvas.height = Math.round(cH * dpr);
            // Draw using Canvas2D for sub-panes (simpler than a second WebGPU context).
            const ctx2d = paneCanvas.getContext('2d');
            if (!ctx2d)
                continue;
            ctx2d.clearRect(0, 0, paneCanvas.width, paneCanvas.height);
            // Background.
            ctx2d.fillStyle = theme.background;
            ctx2d.fillRect(0, 0, paneCanvas.width, paneCanvas.height);
            // Separator line at top.
            ctx2d.strokeStyle = theme.gridColor;
            ctx2d.lineWidth = dpr;
            ctx2d.beginPath();
            ctx2d.moveTo(0, 0);
            ctx2d.lineTo(paneCanvas.width, 0);
            ctx2d.stroke();
            const plotLeft = layout.plotDevice.x;
            const plotRight = layout.plotDevice.x + layout.plotDevice.width;
            const plotWidthDev = layout.plotDevice.width;
            const paneH = paneCanvas.height;
            const padding = 0.1; // 10% vertical padding
            if (cfg.type === 'rsi') {
                renderRSIPane(ctx2d, allTuples, startIdx, endIdx, xScale, cfg, plotLeft, plotWidthDev, paneH, dpr, theme, padding);
            }
            else if (cfg.type === 'macd') {
                renderMACDPane(ctx2d, allTuples, startIdx, endIdx, xScale, cfg, plotLeft, plotWidthDev, paneH, dpr, theme, padding);
            }
            else if (cfg.type === 'volume') {
                renderVolSubPane(ctx2d, allTuples, startIdx, endIdx, xScale, options, plotLeft, plotWidthDev, paneH, dpr, theme);
            }
            // Label.
            ctx2d.fillStyle = theme.textColor;
            ctx2d.font = `${11 * dpr}px sans-serif`;
            ctx2d.fillText(cfg.type.toUpperCase() + (cfg.period ? `(${cfg.period})` : ''), plotLeft + 4 * dpr, 14 * dpr);
            yOffset += height;
        }
    }
    // ---------------------------------------------------------------------------
    // RSI sub-pane
    // ---------------------------------------------------------------------------
    function renderRSIPane(ctx, allTuples, startIdx, endIdx, xScale, cfg, plotLeft, plotWidth, paneH, dpr, theme, padding) {
        const rsiPeriod = cfg.period ?? 14;
        const rsiCacheKey = `rsi:${rsiPeriod}`;
        let rsiData = _rsiCache.get(rsiCacheKey);
        if (!rsiData) {
            rsiData = computeRSI(allTuples, rsiPeriod);
            _rsiCache.set(rsiCacheKey, rsiData);
        }
        if (rsiData.length === 0)
            return;
        const padPx = paneH * padding;
        const drawH = paneH - padPx * 2;
        // RSI is always 0-100, so fixed scale.
        const yScale = (val) => padPx + (1 - val / 100) * drawH;
        // Map timestamps to x-positions using the same xScale.
        const cW = ctx.canvas.width;
        const toX = (ts) => {
            const span = xScale.domainMax - xScale.domainMin;
            if (span === 0)
                return plotLeft;
            const t = (ts - xScale.domainMin) / span;
            return plotLeft + t * plotWidth;
        };
        // Reference lines at 30, 50, 70.
        ctx.strokeStyle = theme.gridColor;
        ctx.lineWidth = dpr * 0.5;
        ctx.setLineDash([4 * dpr, 3 * dpr]);
        for (const level of [30, 50, 70]) {
            const y = yScale(level);
            ctx.beginPath();
            ctx.moveTo(plotLeft, y);
            ctx.lineTo(plotLeft + plotWidth, y);
            ctx.stroke();
            // Label.
            ctx.fillStyle = theme.textSecondary;
            ctx.font = `${9 * dpr}px sans-serif`;
            ctx.fillText(String(level), plotLeft + plotWidth + 4 * dpr, y + 3 * dpr);
        }
        ctx.setLineDash([]);
        // Draw RSI line.
        ctx.strokeStyle = '#A78BFA';
        ctx.lineWidth = 1.5 * dpr;
        ctx.beginPath();
        let started = false;
        for (const [ts, val] of rsiData) {
            const x = toX(ts);
            const y = yScale(val);
            if (!started) {
                ctx.moveTo(x, y);
                started = true;
            }
            else
                ctx.lineTo(x, y);
        }
        ctx.stroke();
        // Overbought/oversold fill regions.
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = '#FF6B6B';
        ctx.fillRect(plotLeft, yScale(100), plotWidth, yScale(70) - yScale(100));
        ctx.fillStyle = '#4ECDC4';
        ctx.fillRect(plotLeft, yScale(30), plotWidth, yScale(0) - yScale(30));
        ctx.globalAlpha = 1;
    }
    // ---------------------------------------------------------------------------
    // MACD sub-pane
    // ---------------------------------------------------------------------------
    function renderMACDPane(ctx, allTuples, startIdx, endIdx, xScale, cfg, plotLeft, plotWidth, paneH, dpr, theme, padding) {
        const fast = cfg.fastPeriod ?? 12;
        const slow = cfg.slowPeriod ?? 26;
        const sig = cfg.signalPeriod ?? 9;
        const macdCacheKey = `macd:${fast}:${slow}:${sig}`;
        let macdResult = _macdCache.get(macdCacheKey);
        if (!macdResult) {
            macdResult = computeMACD(allTuples, fast, slow, sig);
            _macdCache.set(macdCacheKey, macdResult);
        }
        if (macdResult.macd.length === 0)
            return;
        const padPx = paneH * padding;
        const drawH = paneH - padPx * 2;
        const midY = padPx + drawH / 2;
        // Auto-fit Y scale to visible range.
        let yMin = Infinity, yMax = -Infinity;
        for (const [, v] of macdResult.macd) {
            if (v < yMin)
                yMin = v;
            if (v > yMax)
                yMax = v;
        }
        for (const [, v] of macdResult.signal) {
            if (v < yMin)
                yMin = v;
            if (v > yMax)
                yMax = v;
        }
        for (const [, v] of macdResult.histogram) {
            if (v < yMin)
                yMin = v;
            if (v > yMax)
                yMax = v;
        }
        const absMax = Math.max(Math.abs(yMin), Math.abs(yMax)) || 1;
        const toY = (val) => midY - (val / absMax) * (drawH / 2);
        const toX = (ts) => {
            const span = xScale.domainMax - xScale.domainMin;
            if (span === 0)
                return plotLeft;
            const t = (ts - xScale.domainMin) / span;
            return plotLeft + t * plotWidth;
        };
        // Zero line.
        ctx.strokeStyle = theme.gridColor;
        ctx.lineWidth = dpr * 0.5;
        ctx.setLineDash([4 * dpr, 3 * dpr]);
        ctx.beginPath();
        ctx.moveTo(plotLeft, midY);
        ctx.lineTo(plotLeft + plotWidth, midY);
        ctx.stroke();
        ctx.setLineDash([]);
        // Histogram bars.
        const barW = Math.max(1 * dpr, plotWidth / (macdResult.histogram.length || 1) * 0.6);
        for (const [ts, val] of macdResult.histogram) {
            const x = toX(ts);
            const y = toY(val);
            ctx.fillStyle = val >= 0 ? '#4ECDC480' : '#FF6B6B80';
            const h = Math.abs(midY - y);
            if (val >= 0) {
                ctx.fillRect(x - barW / 2, y, barW, h);
            }
            else {
                ctx.fillRect(x - barW / 2, midY, barW, h);
            }
        }
        // MACD line.
        ctx.strokeStyle = '#4ECDC4';
        ctx.lineWidth = 1.5 * dpr;
        ctx.beginPath();
        let started = false;
        for (const [ts, val] of macdResult.macd) {
            const x = toX(ts);
            const y = toY(val);
            if (!started) {
                ctx.moveTo(x, y);
                started = true;
            }
            else
                ctx.lineTo(x, y);
        }
        ctx.stroke();
        // Signal line.
        ctx.strokeStyle = '#FF6B6B';
        ctx.lineWidth = 1.5 * dpr;
        ctx.beginPath();
        started = false;
        for (const [ts, val] of macdResult.signal) {
            const x = toX(ts);
            const y = toY(val);
            if (!started) {
                ctx.moveTo(x, y);
                started = true;
            }
            else
                ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    // ---------------------------------------------------------------------------
    // Volume sub-pane
    // ---------------------------------------------------------------------------
    function renderVolSubPane(ctx, allTuples, startIdx, endIdx, xScale, options, plotLeft, plotWidth, paneH, dpr, theme) {
        const vols = options.volume.data;
        if (vols.length === 0)
            return;
        const visVols = vols.slice(startIdx, endIdx);
        const visTuples = allTuples.slice(startIdx, endIdx);
        let maxVol = 0;
        for (const v of visVols)
            if (v > maxVol)
                maxVol = v;
        if (maxVol === 0)
            maxVol = 1;
        const padTop = paneH * 0.05;
        const drawH = paneH - padTop;
        const toX = (ts) => {
            const span = xScale.domainMax - xScale.domainMin;
            if (span === 0)
                return plotLeft;
            const t = (ts - xScale.domainMin) / span;
            return plotLeft + t * plotWidth;
        };
        const barW = Math.max(1 * dpr, plotWidth / (visVols.length || 1) * 0.6);
        for (let i = 0; i < visVols.length && i < visTuples.length; i++) {
            const vol = visVols[i];
            if (!vol || vol <= 0)
                continue;
            const c = visTuples[i];
            const x = toX(c[0]);
            const h = (vol / maxVol) * drawH;
            const isUp = c[4] >= c[1];
            ctx.fillStyle = isUp ? options.candles.upColor + '80' : options.candles.downColor + '80';
            ctx.fillRect(x - barW / 2, paneH - h, barW, h);
        }
    }
    // ---------------------------------------------------------------------------
    function dispose() {
        candleRenderer.dispose();
        gridRenderer.dispose();
        crosshairRenderer.dispose();
        axisRenderer.dispose();
        volumeRenderer.dispose();
        lineOverlayRenderer.dispose();
        seriesStyleRenderer.dispose();
        for (const r of subPaneRenderers.values())
            r.dispose();
        for (const el of subPaneContainers.values())
            el.remove();
    }
    return {
        render,
        get lastLayout() { return _layout; },
        get lastXScale() { return _xScale; },
        get lastYScale() { return _yScale; },
        get visibleData() { return _visibleData; },
        get visibleStartIndex() { return _visibleStart; },
        dispose,
    };
}
// ---------------------------------------------------------------------------
// Minimal clear pass when there's no data.
// ---------------------------------------------------------------------------
function submitClearPass(gpu, theme) {
    const bgColor = parseHexToVec4(theme.background);
    const encoder = gpu.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
        colorAttachments: [
            {
                view: gpu.context.getCurrentTexture().createView(),
                clearValue: { r: bgColor[0], g: bgColor[1], b: bgColor[2], a: bgColor[3] },
                loadOp: 'clear',
                storeOp: 'store',
            },
        ],
    });
    pass.end();
    gpu.device.queue.submit([encoder.finish()]);
}
//# sourceMappingURL=Coordinator.js.map