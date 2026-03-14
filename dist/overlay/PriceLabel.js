// ---------------------------------------------------------------------------
// DiCharts – Price Label Overlay
// ---------------------------------------------------------------------------
// A small floating label on the price (Y) axis that tracks the crosshair
// vertical position, showing the price at that level.
// ---------------------------------------------------------------------------
export function createPriceLabel(container) {
    const el = document.createElement('div');
    el.style.cssText = `
    position: absolute;
    display: none;
    padding: 2px 6px;
    font-size: 11px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    pointer-events: none;
    z-index: 9;
    white-space: nowrap;
    border-radius: 2px;
  `;
    container.appendChild(el);
    function formatPrice(v) {
        return v.toFixed(v >= 100 ? 2 : v >= 1 ? 4 : 6);
    }
    function show(price, y, axisX, theme) {
        el.textContent = formatPrice(price);
        el.style.backgroundColor = theme.crosshairColor;
        el.style.color = theme.tooltipBackground;
        el.style.left = `${axisX}px`;
        el.style.top = `${y - 9}px`;
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
//# sourceMappingURL=PriceLabel.js.map