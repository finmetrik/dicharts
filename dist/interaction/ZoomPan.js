// ---------------------------------------------------------------------------
// DiCharts – Zoom & Pan Controller
// ---------------------------------------------------------------------------
// Handles wheel‑zoom and drag‑pan gestures on the chart canvas.
// ---------------------------------------------------------------------------
import { zoom, pan } from '../scene/Viewport';
export function createZoomPan(cb) {
    let canvas = null;
    // Drag state.
    let dragging = false;
    let dragStartX = 0;
    let dragStartVp = null;
    // ---- Wheel handler ----
    function onWheel(e) {
        e.preventDefault();
        const plot = cb.getPlotArea();
        if (!plot)
            return;
        const vp = cb.getViewport();
        const rect = canvas.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        // Is the cursor inside the plot area?
        if (cx < plot.x || cx > plot.x + plot.width)
            return;
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
            // Horizontal scroll → pan.
            const span = vp.end - vp.start;
            const deltaPct = (e.deltaX / plot.width) * span * 0.5;
            cb.setViewport(pan(vp, deltaPct));
        }
        else {
            // Vertical scroll → zoom.
            const capped = Math.max(-200, Math.min(200, e.deltaY));
            const factor = Math.exp(-capped * 0.003);
            // Normalised anchor within the viewport.
            const anchorPct = vp.start + ((cx - plot.x) / plot.width) * (vp.end - vp.start);
            cb.setViewport(zoom(vp, anchorPct, factor));
        }
    }
    // ---- Pointer handlers (drag‑pan) ----
    function onPointerDown(e) {
        // Middle mouse or shift+left.
        if (!(e.button === 1 || (e.button === 0 && e.shiftKey)))
            return;
        const plot = cb.getPlotArea();
        if (!plot)
            return;
        const rect = canvas.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        if (cx < plot.x || cx > plot.x + plot.width)
            return;
        dragging = true;
        dragStartX = e.clientX;
        dragStartVp = { ...cb.getViewport() };
        canvas.setPointerCapture(e.pointerId);
        e.preventDefault();
    }
    function onPointerMove(e) {
        if (!dragging || !dragStartVp)
            return;
        const plot = cb.getPlotArea();
        if (!plot)
            return;
        const dx = e.clientX - dragStartX;
        const span = dragStartVp.end - dragStartVp.start;
        const deltaPct = -(dx / plot.width) * span;
        cb.setViewport(pan(dragStartVp, deltaPct));
    }
    function onPointerUp(e) {
        if (!dragging)
            return;
        dragging = false;
        dragStartVp = null;
        canvas.releasePointerCapture(e.pointerId);
    }
    function attach(c) {
        canvas = c;
        c.addEventListener('wheel', onWheel, { passive: false });
        c.addEventListener('pointerdown', onPointerDown);
        c.addEventListener('pointermove', onPointerMove);
        c.addEventListener('pointerup', onPointerUp);
        c.addEventListener('pointercancel', onPointerUp);
    }
    function detach() {
        if (!canvas)
            return;
        canvas.removeEventListener('wheel', onWheel);
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerup', onPointerUp);
        canvas.removeEventListener('pointercancel', onPointerUp);
        canvas = null;
    }
    return { attach, detach };
}
//# sourceMappingURL=ZoomPan.js.map