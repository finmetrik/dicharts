// ---------------------------------------------------------------------------
// DiCharts – Crosshair Controller
// ---------------------------------------------------------------------------
// Tracks pointer movement over the canvas and provides the current
// crosshair position (CSS pixels relative to the canvas).
// ---------------------------------------------------------------------------
export function createCrosshairController(cb) {
    let canvas = null;
    let pos = null;
    function onPointerMove(e) {
        const plot = cb.getPlotArea();
        if (!plot)
            return;
        const rect = canvas.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        // Only show crosshair when inside the plot area.
        if (cx >= plot.x &&
            cx <= plot.x + plot.width &&
            cy >= plot.y &&
            cy <= plot.y + plot.height) {
            pos = { x: cx, y: cy };
        }
        else {
            pos = null;
        }
        cb.onMove(pos);
    }
    function onPointerLeave() {
        pos = null;
        cb.onMove(null);
    }
    function attach(c) {
        canvas = c;
        c.addEventListener('pointermove', onPointerMove);
        c.addEventListener('pointerleave', onPointerLeave);
    }
    function detach() {
        if (!canvas)
            return;
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerleave', onPointerLeave);
        canvas = null;
    }
    return {
        attach,
        detach,
        get position() { return pos; },
    };
}
//# sourceMappingURL=Crosshair.js.map