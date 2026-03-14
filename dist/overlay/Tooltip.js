// ---------------------------------------------------------------------------
// DiCharts – Tooltip Overlay
// ---------------------------------------------------------------------------
// A floating DOM element that shows OHLC data for the hovered candle.
// ---------------------------------------------------------------------------
export function createTooltip(container) {
    const el = document.createElement('div');
    el.style.cssText = `
    position: absolute;
    display: none;
    padding: 8px 10px;
    border-radius: 4px;
    font-size: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.5;
    pointer-events: none;
    z-index: 10;
    white-space: nowrap;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  `;
    container.appendChild(el);
    function formatPrice(v) {
        return v.toFixed(v >= 100 ? 2 : v >= 1 ? 4 : 6);
    }
    function show(candle, x, y, theme) {
        const [ts, open, high, low, close] = candle;
        const isUp = close >= open;
        const changeColor = isUp ? theme.candleUpColor : theme.candleDownColor;
        const d = new Date(ts);
        const dateStr = d.toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', year: 'numeric',
        });
        const timeStr = d.toLocaleTimeString(undefined, {
            hour: '2-digit', minute: '2-digit',
        });
        el.style.backgroundColor = theme.tooltipBackground;
        el.style.border = `1px solid ${theme.tooltipBorder}`;
        el.style.color = theme.tooltipText;
        el.innerHTML = `
      <div style="margin-bottom:4px;color:${theme.axisTextColor}">${dateStr} ${timeStr}</div>
      <div>O <span style="color:${changeColor}">${formatPrice(open)}</span></div>
      <div>H <span style="color:${changeColor}">${formatPrice(high)}</span></div>
      <div>L <span style="color:${changeColor}">${formatPrice(low)}</span></div>
      <div>C <span style="color:${changeColor}">${formatPrice(close)}</span></div>
    `;
        // Position tooltip to the right of the cursor, flipping if near edge.
        const cw = container.clientWidth;
        const tipW = 160;
        const left = x + 16 + tipW > cw ? x - tipW - 8 : x + 16;
        el.style.left = `${Math.max(4, left)}px`;
        el.style.top = `${Math.max(4, y - 40)}px`;
        el.style.display = '';
    }
    function hide() {
        el.style.display = 'none';
    }
    function dispose() {
        el.remove();
    }
    return { show, hide, dispose };
}
//# sourceMappingURL=Tooltip.js.map