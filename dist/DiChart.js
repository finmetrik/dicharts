// ---------------------------------------------------------------------------
// DiCharts – Main Entry Point
// ---------------------------------------------------------------------------
// DiChart.create(container, options) is the only way consumers interact
// with the library.  It returns a DiChartInstance with methods for
// data streaming, option updates, event handling, and cleanup.
// ---------------------------------------------------------------------------
import { createGPUContext } from './gpu/Context';
import { createScheduler } from './scene/Scheduler';
import { createCoordinator } from './scene/Coordinator';
import { createViewport, scrollToEnd } from './scene/Viewport';
import { createZoomPan } from './interaction/ZoomPan';
import { createCrosshairController } from './interaction/Crosshair';
import { findCandleAtPoint } from './interaction/HitTest';
import { createTooltip } from './overlay/Tooltip';
import { createPriceLabel } from './overlay/PriceLabel';
import { createTimeLabel } from './overlay/TimeLabel';
import { createOHLCStore } from './data/OHLCStore';
import { resolveTheme } from './theme';
import { toDomain, toRange } from './scene/Scale';
// ---------------------------------------------------------------------------
// Option resolution (fill defaults)
// ---------------------------------------------------------------------------
function resolveOptions(opts) {
    const theme = opts.theme ?? 'dark';
    const t = resolveTheme(theme);
    return {
        theme,
        candles: {
            data: opts.candles?.data ?? [],
            style: opts.candles?.style ?? 'classic',
            upColor: opts.candles?.upColor ?? t.candleUpColor,
            downColor: opts.candles?.downColor ?? t.candleDownColor,
            upBorderColor: opts.candles?.upBorderColor ?? t.candleUpBorderColor,
            downBorderColor: opts.candles?.downBorderColor ?? t.candleDownBorderColor,
            bodyWidth: opts.candles?.bodyWidth ?? '70%',
            lineColor: opts.candles?.lineColor ?? t.candleUpColor,
            baselinePrice: opts.candles?.baselinePrice ?? null,
        },
        volume: {
            enabled: opts.volume?.enabled ?? false,
            data: opts.volume?.data ?? [],
            heightRatio: opts.volume?.heightRatio ?? 0.2,
        },
        timeAxis: {
            visible: opts.timeAxis?.visible ?? true,
        },
        priceAxis: {
            visible: opts.priceAxis?.visible ?? true,
            position: opts.priceAxis?.position ?? 'right',
        },
        crosshair: {
            enabled: opts.crosshair?.enabled ?? true,
            lineColor: opts.crosshair?.lineColor ?? t.crosshairColor,
            lineWidth: opts.crosshair?.lineWidth ?? 1,
            dashPattern: opts.crosshair?.dashPattern ?? [6, 4],
        },
        dataZoom: {
            enabled: opts.dataZoom?.enabled ?? true,
            initialRange: opts.dataZoom?.initialRange ?? [0, 1],
        },
        overlays: opts.overlays ?? [],
        orderLines: opts.orderLines ?? [],
        subPanes: opts.subPanes ?? [],
        autoScroll: opts.autoScroll ?? true,
        animation: opts.animation ?? false,
    };
}
// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------
export class DiChart {
    /**
     * Create a new DiChart instance.
     *
     * ```ts
     * const chart = await DiChart.create(container, { theme: 'dark', candles: { data } });
     * ```
     */
    static async create(container, options = {}) {
        // Set up the container as a flex column so sub-panes can be
        // appended as children below the main chart area.
        const cs = getComputedStyle(container);
        if (cs.position === 'static') {
            container.style.position = 'relative';
        }
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.overflow = 'hidden';
        // Inner wrapper for canvas + DOM overlays (axis, tooltip, etc.).
        const mainArea = document.createElement('div');
        mainArea.style.cssText = 'position:relative;flex:1;min-height:0;overflow:hidden;';
        container.appendChild(mainArea);
        // Create canvas.
        const canvas = document.createElement('canvas');
        canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:block;';
        mainArea.appendChild(canvas);
        // Init WebGPU.
        const gpu = await createGPUContext(canvas);
        let resolved = resolveOptions(options);
        let rawOptions = { ...options };
        // Data store.
        const store = createOHLCStore(resolved.candles.data);
        // Viewport.  Allow 25% overscroll so the newest candle isn't at the edge.
        let viewport = createViewport(resolved.dataZoom.initialRange[0], resolved.dataZoom.initialRange[1], 0.25);
        // Scene: overlays go in mainArea, sub-panes go in the outer container.
        const coordinator = createCoordinator(gpu, mainArea, container);
        const scheduler = createScheduler(doRender);
        // Interaction.
        let crosshairPos = null;
        const zoomPan = createZoomPan({
            getViewport: () => viewport,
            getPlotArea: () => coordinator.lastLayout?.plot ?? null,
            setViewport(vp) {
                viewport = vp;
                scheduler.requestRender();
            },
        });
        const crosshairCtrl = createCrosshairController({
            getPlotArea: () => coordinator.lastLayout?.plot ?? null,
            onMove(pos) {
                crosshairPos = pos;
                scheduler.requestRender();
                // Fire crosshairMove event.
                if (pos && coordinator.lastXScale && coordinator.lastYScale) {
                    const hit = doHitTest(pos.x, pos.y);
                    emit('crosshairMove', { x: pos.x, y: pos.y, candle: hit });
                }
                else {
                    emit('crosshairMove', { x: 0, y: 0, candle: null });
                }
            },
        });
        // Overlays (inside mainArea so they align with the canvas, not sub-panes).
        const tooltip = createTooltip(mainArea);
        const priceLabel = createPriceLabel(mainArea);
        const timeLabel = createTimeLabel(mainArea);
        const listeners = {};
        function emit(event, payload) {
            for (const fn of listeners[event] ?? [])
                fn(payload);
        }
        // Click handler.
        canvas.addEventListener('click', (e) => {
            const rect = canvas.getBoundingClientRect();
            const cx = e.clientX - rect.left;
            const cy = e.clientY - rect.top;
            const hit = doHitTest(cx, cy);
            emit('click', { candle: hit, x: cx, y: cy });
        });
        // Resize observer.
        const resizeObserver = new ResizeObserver(() => {
            gpu.resize();
            scheduler.requestRender();
        });
        resizeObserver.observe(mainArea);
        // Attach interaction.
        if (resolved.dataZoom.enabled)
            zoomPan.attach(canvas);
        if (resolved.crosshair.enabled)
            crosshairCtrl.attach(canvas);
        // Device‑lost handler: notify consumers and stop rendering.
        gpu.onDeviceLost((reason) => {
            emit('deviceLost', { reason });
            scheduler.stop();
        });
        // Start rendering.
        scheduler.start();
        // ----- Render callback -----
        function doRender() {
            if (gpu.isDeviceLost)
                return;
            try {
                coordinator.render(store.data, resolved, viewport, crosshairPos);
                // Update overlays based on crosshair.
                updateOverlays();
            }
            catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                emit('error', { message });
                // Stop scheduler to prevent repeated error spam.
                scheduler.stop();
            }
        }
        function updateOverlays() {
            if (!crosshairPos || !resolved.crosshair.enabled) {
                tooltip.hide();
                priceLabel.hide();
                timeLabel.hide();
                return;
            }
            const layout = coordinator.lastLayout;
            const xScale = coordinator.lastXScale;
            const yScale = coordinator.lastYScale;
            if (!layout || !xScale || !yScale)
                return;
            const theme = resolveTheme(resolved.theme);
            // Price label on Y axis.
            const price = toDomain(yScale, crosshairPos.y * layout.dpr);
            if (resolved.priceAxis.visible) {
                const axisX = resolved.priceAxis.position === 'right'
                    ? layout.plot.x + layout.plot.width + 2
                    : 0;
                priceLabel.show(price, crosshairPos.y, axisX, theme);
            }
            // Time label on X axis.
            const timestamp = toDomain(xScale, crosshairPos.x * layout.dpr);
            if (resolved.timeAxis.visible) {
                timeLabel.show(timestamp, crosshairPos.x, layout.plot.y + layout.plot.height + 2, theme);
            }
            // Tooltip for hovered candle.
            const hit = doHitTest(crosshairPos.x, crosshairPos.y);
            if (hit) {
                tooltip.show(hit.candle, crosshairPos.x, crosshairPos.y, theme);
            }
            else {
                tooltip.hide();
            }
        }
        function doHitTest(cx, cy) {
            const xScale = coordinator.lastXScale;
            const yScale = coordinator.lastYScale;
            if (!xScale || !yScale)
                return null;
            const visible = coordinator.visibleData;
            if (visible.length === 0)
                return null;
            // Estimate body width in CSS pixels.
            const layout = coordinator.lastLayout;
            const bodyWidthPx = visible.length > 1
                ? Math.abs(toRange(xScale, visible[1][0]) - toRange(xScale, visible[0][0])) / layout.dpr * 0.8
                : 8;
            return findCandleAtPoint(visible, coordinator.visibleStartIndex, cx * layout.dpr, // convert to device pixels to match scale
            cy * layout.dpr, xScale, yScale, bodyWidthPx * layout.dpr);
        }
        // ----- Mutable state for new features -----
        let volumeData = resolved.volume.data.slice();
        let overlayConfigs = resolved.overlays.slice();
        let orderLineConfigs = resolved.orderLines.slice();
        let subPaneConfigs = resolved.subPanes.slice();
        // ----- Public API -----
        const instance = {
            setOptions(opts) {
                // Deep-merge nested option objects so partial updates
                // (e.g. { candles: { style: 'hollow' } }) don't wipe sibling properties.
                rawOptions = {
                    ...rawOptions,
                    ...opts,
                    candles: { ...rawOptions.candles, ...opts.candles },
                    volume: { ...rawOptions.volume, ...opts.volume },
                    timeAxis: { ...rawOptions.timeAxis, ...opts.timeAxis },
                    priceAxis: { ...rawOptions.priceAxis, ...opts.priceAxis },
                    crosshair: { ...rawOptions.crosshair, ...opts.crosshair },
                    dataZoom: { ...rawOptions.dataZoom, ...opts.dataZoom },
                };
                resolved = resolveOptions(rawOptions);
                if (opts.candles?.data)
                    store.setData(opts.candles.data);
                if (opts.volume?.data)
                    volumeData = opts.volume.data.slice();
                if (opts.overlays)
                    overlayConfigs = opts.overlays.slice();
                if (opts.orderLines)
                    orderLineConfigs = opts.orderLines.slice();
                if (opts.subPanes)
                    subPaneConfigs = opts.subPanes.slice();
                scheduler.requestRender();
            },
            appendCandles(candles) {
                store.append(candles);
                if (resolved.autoScroll) {
                    viewport = scrollToEnd(viewport);
                }
                scheduler.requestRender();
            },
            updateLastCandle(candle) {
                store.updateLast(candle);
                if (resolved.autoScroll) {
                    viewport = scrollToEnd(viewport);
                }
                scheduler.requestRender();
            },
            setData(candles) {
                store.setData(candles);
                scheduler.requestRender();
            },
            setZoomRange(start, end) {
                viewport = createViewport(start, end, viewport.rightPadding);
                scheduler.requestRender();
            },
            // --- Volume ---
            setVolumes(volumes) {
                volumeData = volumes.slice();
                rawOptions.volume = { ...rawOptions.volume, enabled: true, data: volumeData };
                resolved.volume.enabled = true;
                resolved.volume.data = volumeData;
                scheduler.requestRender();
            },
            appendVolumes(volumes) {
                volumeData.push(...volumes);
                rawOptions.volume = { ...rawOptions.volume, data: volumeData };
                resolved.volume.data = volumeData;
                scheduler.requestRender();
            },
            // --- Overlays ---
            addOverlay(config) {
                const idx = overlayConfigs.findIndex(o => o.id === config.id);
                if (idx >= 0)
                    overlayConfigs[idx] = config;
                else
                    overlayConfigs.push(config);
                rawOptions.overlays = overlayConfigs;
                resolved.overlays = overlayConfigs;
                scheduler.requestRender();
            },
            removeOverlay(id) {
                overlayConfigs = overlayConfigs.filter(o => o.id !== id);
                rawOptions.overlays = overlayConfigs;
                resolved.overlays = overlayConfigs;
                scheduler.requestRender();
            },
            // --- Order lines ---
            addOrderLine(config) {
                const idx = orderLineConfigs.findIndex(o => o.id === config.id);
                if (idx >= 0)
                    orderLineConfigs[idx] = config;
                else
                    orderLineConfigs.push(config);
                rawOptions.orderLines = orderLineConfigs;
                resolved.orderLines = orderLineConfigs;
                scheduler.requestRender();
            },
            removeOrderLine(id) {
                orderLineConfigs = orderLineConfigs.filter(o => o.id !== id);
                rawOptions.orderLines = orderLineConfigs;
                resolved.orderLines = orderLineConfigs;
                scheduler.requestRender();
            },
            clearOrderLines() {
                orderLineConfigs = [];
                rawOptions.orderLines = orderLineConfigs;
                resolved.orderLines = orderLineConfigs;
                scheduler.requestRender();
            },
            // --- Sub-panes ---
            addSubPane(config) {
                const idx = subPaneConfigs.findIndex(p => p.id === config.id);
                if (idx >= 0)
                    subPaneConfigs[idx] = config;
                else
                    subPaneConfigs.push(config);
                rawOptions.subPanes = subPaneConfigs;
                resolved.subPanes = subPaneConfigs;
                scheduler.requestRender();
            },
            removeSubPane(id) {
                subPaneConfigs = subPaneConfigs.filter(p => p.id !== id);
                rawOptions.subPanes = subPaneConfigs;
                resolved.subPanes = subPaneConfigs;
                scheduler.requestRender();
            },
            // --- Events ---
            on(event, handler) {
                (listeners[event] ??= []).push(handler);
            },
            off(event, handler) {
                const list = listeners[event];
                if (list) {
                    const idx = list.indexOf(handler);
                    if (idx >= 0)
                        list.splice(idx, 1);
                }
            },
            get fps() { return scheduler.fps; },
            get candleCount() { return store.length; },
            resize() {
                gpu.resize();
                scheduler.requestRender();
            },
            dispose() {
                scheduler.stop();
                resizeObserver.disconnect();
                zoomPan.detach();
                crosshairCtrl.detach();
                coordinator.dispose();
                tooltip.dispose();
                priceLabel.dispose();
                timeLabel.dispose();
                gpu.destroy();
                mainArea.remove();
            },
        };
        return instance;
    }
}
//# sourceMappingURL=DiChart.js.map