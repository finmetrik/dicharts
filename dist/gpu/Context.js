// ---------------------------------------------------------------------------
// DiCharts – WebGPU Context
// ---------------------------------------------------------------------------
/**
 * Initialise a WebGPU device and configure the canvas.
 * Throws if WebGPU is not supported or adapter/device creation fails.
 */
export async function createGPUContext(canvas) {
    if (!navigator.gpu) {
        throw new Error('DiCharts: WebGPU is not supported in this browser. ' +
            'Please use Chrome 113+, Edge 113+, or Safari 18+.');
    }
    const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance',
    });
    if (!adapter) {
        throw new Error('DiCharts: Failed to obtain a WebGPU adapter.');
    }
    const device = await adapter.requestDevice();
    const gpuCtx = canvas.getContext('webgpu');
    if (!gpuCtx) {
        throw new Error('DiCharts: Could not get a WebGPU canvas context.');
    }
    const format = navigator.gpu.getPreferredCanvasFormat();
    // Compute device‑pixel dimensions.
    let _dpr = window.devicePixelRatio || 1;
    const maxDim = device.limits.maxTextureDimension2D;
    function applySize() {
        // Re‑read DPR on every resize so multi‑monitor moves are handled.
        _dpr = window.devicePixelRatio || 1;
        const cssW = canvas.clientWidth;
        const cssH = canvas.clientHeight;
        const pw = Math.max(1, Math.min(Math.floor(cssW * _dpr), maxDim));
        const ph = Math.max(1, Math.min(Math.floor(cssH * _dpr), maxDim));
        canvas.width = pw;
        canvas.height = ph;
        return { pw, ph };
    }
    applySize();
    gpuCtx.configure({
        device,
        format,
        alphaMode: 'premultiplied',
    });
    // Device‑lost tracking.
    let _deviceLost = false;
    const _lostCallbacks = [];
    device.lost.then((info) => {
        _deviceLost = true;
        const reason = info.reason === 'destroyed'
            ? 'destroyed'
            : `GPU device lost: ${info.message || 'unknown reason'}`;
        for (const cb of _lostCallbacks) {
            try {
                cb(reason);
            }
            catch { /* consumer callback error – swallow */ }
        }
    });
    const handle = {
        device,
        context: gpuCtx,
        format,
        canvas,
        get pixelWidth() {
            return canvas.width;
        },
        get pixelHeight() {
            return canvas.height;
        },
        get dpr() {
            return _dpr;
        },
        get isDeviceLost() {
            return _deviceLost;
        },
        resize() {
            if (_deviceLost)
                return;
            applySize();
            gpuCtx.configure({ device, format, alphaMode: 'premultiplied' });
        },
        onDeviceLost(cb) {
            _lostCallbacks.push(cb);
            // If already lost, fire immediately.
            if (_deviceLost)
                cb('GPU device was already lost');
        },
        destroy() {
            device.destroy();
        },
    };
    return handle;
}
//# sourceMappingURL=Context.js.map