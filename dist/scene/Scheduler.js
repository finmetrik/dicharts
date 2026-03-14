// ---------------------------------------------------------------------------
// DiCharts – Render Scheduler
// ---------------------------------------------------------------------------
// Drives the render loop using requestAnimationFrame.  Only performs a
// render when the dirty flag is set, so idle charts consume no GPU time.
// ---------------------------------------------------------------------------
export function createScheduler(callback) {
    let rafId = null;
    let dirty = false;
    let running = false;
    let lastTime = 0;
    // FPS measurement
    const frameTimes = [];
    let measuredFps = 0;
    let fpsAccum = 0;
    let fpsFrames = 0;
    function frame(now) {
        rafId = requestAnimationFrame(frame);
        // Delta time in seconds, capped to avoid large jumps after tab switch.
        const dt = lastTime === 0 ? 0.016 : Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;
        // FPS tracking
        fpsAccum += dt;
        fpsFrames++;
        if (fpsAccum >= 0.5) {
            measuredFps = Math.round(fpsFrames / fpsAccum);
            fpsAccum = 0;
            fpsFrames = 0;
        }
        if (!dirty)
            return;
        dirty = false;
        callback(dt);
        // If callback set dirty again (e.g. animation), the next frame will render.
    }
    const scheduler = {
        requestRender() {
            dirty = true;
            // If we're running but the loop isn't scheduled, kick it.
            if (running && rafId === null) {
                lastTime = 0;
                rafId = requestAnimationFrame(frame);
            }
        },
        start() {
            if (running)
                return;
            running = true;
            dirty = true;
            lastTime = 0;
            rafId = requestAnimationFrame(frame);
        },
        stop() {
            running = false;
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
        },
        get running() {
            return running;
        },
        get fps() {
            return measuredFps;
        },
    };
    return scheduler;
}
//# sourceMappingURL=Scheduler.js.map