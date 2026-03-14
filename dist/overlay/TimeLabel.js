// ---------------------------------------------------------------------------
// DiCharts – Time Label Overlay
// ---------------------------------------------------------------------------
// A small floating label on the time (X) axis that tracks the crosshair
// horizontal position, showing the timestamp at that location.
// ---------------------------------------------------------------------------
export function createTimeLabel(container) {
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
    function show(timestamp, x, axisY, theme) {
        const d = new Date(timestamp);
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        const ss = String(d.getSeconds()).padStart(2, '0');
        const mon = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        el.textContent = `${mon}/${day} ${hh}:${mm}:${ss}`;
        el.style.backgroundColor = theme.crosshairColor;
        el.style.color = theme.tooltipBackground;
        el.style.left = `${x - 40}px`;
        el.style.top = `${axisY}px`;
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
//# sourceMappingURL=TimeLabel.js.map