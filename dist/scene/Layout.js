// ---------------------------------------------------------------------------
// DiCharts – Chart Layout
// ---------------------------------------------------------------------------
// Computes the rectangular areas for the plot, axes, and margins based on
// the canvas CSS size and which axes are enabled.
// ---------------------------------------------------------------------------
const PRICE_AXIS_WIDTH = 70; // CSS px
const TIME_AXIS_HEIGHT = 28; // CSS px
const PADDING_TOP = 10;
const PADDING_LEFT = 4;
export function computeLayout(cssWidth, cssHeight, dpr, options) {
    const top = PADDING_TOP;
    const bottom = options.timeAxis.visible ? TIME_AXIS_HEIGHT : 4;
    const left = options.priceAxis.position === 'left' && options.priceAxis.visible
        ? PRICE_AXIS_WIDTH
        : PADDING_LEFT;
    const right = options.priceAxis.position === 'right' && options.priceAxis.visible
        ? PRICE_AXIS_WIDTH
        : 4;
    const margins = { top, right, bottom, left };
    const plotW = Math.max(1, cssWidth - left - right);
    const plotH = Math.max(1, cssHeight - top - bottom);
    const plot = { x: left, y: top, width: plotW, height: plotH };
    const plotDevice = {
        x: Math.round(left * dpr),
        y: Math.round(top * dpr),
        width: Math.round(plotW * dpr),
        height: Math.round(plotH * dpr),
    };
    return {
        cssWidth,
        cssHeight,
        pixelWidth: Math.round(cssWidth * dpr),
        pixelHeight: Math.round(cssHeight * dpr),
        dpr,
        margins,
        plot,
        plotDevice,
    };
}
//# sourceMappingURL=Layout.js.map