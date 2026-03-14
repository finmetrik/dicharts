// ---------------------------------------------------------------------------
// DiCharts – Volume Bar Renderer
// ---------------------------------------------------------------------------
// Renders volume bars at the bottom ~20% of the plot area. Each bar is
// coloured green/red based on the candle direction. Uses instanced rendering.
// ---------------------------------------------------------------------------
import { toClipX } from '../scene/Scale';
import { ensureBuffer } from '../gpu/BufferManager';
import volumeWGSL from '../shaders/volume.wgsl?raw';
// Per-instance: x, top, bottom, halfW, r, g, b, a  (8 floats)
const FLOATS_PER_INSTANCE = 8;
const VERTICES_PER_BAR = 6;
function parseHex(hex) {
    let h = hex.replace('#', '');
    if (h.length === 3)
        h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    return [(n >> 16) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255, 1];
}
export function createVolumeRenderer(gpu) {
    const { device, format } = gpu;
    const shaderModule = device.createShaderModule({
        label: 'volume-shader',
        code: volumeWGSL,
    });
    const pipeline = device.createRenderPipeline({
        label: 'volume-pipeline',
        layout: 'auto',
        vertex: {
            module: shaderModule,
            entryPoint: 'vs_main',
            buffers: [{
                    arrayStride: FLOATS_PER_INSTANCE * 4,
                    stepMode: 'instance',
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: 'float32' }, // xClip
                        { shaderLocation: 1, offset: 4, format: 'float32' }, // topClip
                        { shaderLocation: 2, offset: 8, format: 'float32' }, // bottomClip
                        { shaderLocation: 3, offset: 12, format: 'float32' }, // halfWidth
                        { shaderLocation: 4, offset: 16, format: 'float32x4' }, // color
                    ],
                }],
        },
        fragment: {
            module: shaderModule,
            entryPoint: 'fs_main',
            targets: [{
                    format,
                    blend: {
                        color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha' },
                        alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' },
                    },
                }],
        },
        primitive: { topology: 'triangle-list' },
    });
    let instanceBuf = null;
    let instanceCount = 0;
    let staging = new Float32Array(0);
    function prepare(data, volumes, xScale, layout, theme, upColor, downColor) {
        const n = Math.min(data.length, volumes.length);
        instanceCount = 0;
        if (n === 0)
            return;
        const cW = layout.pixelWidth;
        const cH = layout.pixelHeight;
        const plot = layout.plotDevice;
        const clipPerDevPx = 2 / cW;
        const clipPerCssPx = clipPerDevPx * layout.dpr;
        // Volume occupies bottom 20% of the plot.
        const volBottomDev = plot.y + plot.height;
        const volTopDev = plot.y + plot.height * 0.8;
        const volBottomClip = 1 - (volBottomDev / cH) * 2;
        const volHeightClip = Math.abs((1 - (volTopDev / cH) * 2) - volBottomClip);
        // Find max volume for scaling.
        let maxVol = 0;
        for (let i = 0; i < n; i++) {
            if (volumes[i] > maxVol)
                maxVol = volumes[i];
        }
        if (maxVol === 0)
            maxVol = 1;
        // Compute bar half-width (same logic as candle body: 70% of spacing).
        let spacingClip = 0;
        if (n > 1) {
            spacingClip = Math.abs(toClipX(xScale, data[n - 1][0], cW) - toClipX(xScale, data[0][0], cW)) / (n - 1);
        }
        else {
            spacingClip = 8 * clipPerCssPx;
        }
        const halfW = (spacingClip * 0.7) / 2;
        const upCol = parseHex(upColor);
        const downCol = parseHex(downColor);
        // Semi-transparent.
        upCol[3] = 0.35;
        downCol[3] = 0.35;
        const needed = n * FLOATS_PER_INSTANCE;
        if (staging.length < needed)
            staging = new Float32Array(needed);
        let idx = 0;
        for (let i = 0; i < n; i++) {
            const c = data[i];
            const vol = volumes[i];
            if (!isFinite(vol) || vol <= 0)
                continue;
            const xC = toClipX(xScale, c[0], cW);
            const barH = (vol / maxVol) * volHeightClip;
            const topC = volBottomClip + barH;
            const isUp = c[4] >= c[1]; // close >= open
            staging[idx++] = xC;
            staging[idx++] = topC;
            staging[idx++] = volBottomClip;
            staging[idx++] = halfW;
            const col = isUp ? upCol : downCol;
            staging[idx++] = col[0];
            staging[idx++] = col[1];
            staging[idx++] = col[2];
            staging[idx++] = col[3];
            instanceCount++;
        }
        const usage = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;
        const slice = staging.subarray(0, instanceCount * FLOATS_PER_INSTANCE);
        instanceBuf = ensureBuffer(device, instanceBuf, slice.byteLength, usage, 'volume-instances');
        device.queue.writeBuffer(instanceBuf.buffer, 0, slice.buffer, slice.byteOffset, slice.byteLength);
    }
    function render(pass) {
        if (instanceCount === 0 || !instanceBuf)
            return;
        pass.setPipeline(pipeline);
        pass.setVertexBuffer(0, instanceBuf.buffer);
        pass.draw(VERTICES_PER_BAR, instanceCount);
    }
    function dispose() {
        instanceBuf?.buffer.destroy();
        instanceBuf = null;
    }
    return { prepare, render, dispose };
}
//# sourceMappingURL=VolumeRenderer.js.map