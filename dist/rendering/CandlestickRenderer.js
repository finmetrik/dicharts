// ---------------------------------------------------------------------------
// DiCharts – Candlestick Renderer
// ---------------------------------------------------------------------------
// Converts OHLC data into per‑instance GPU buffers and issues instanced
// draw calls.  Supports both "classic" (filled) and "hollow" styles.
// ---------------------------------------------------------------------------
import { toClipX, toClipY } from '../scene/Scale';
import { ensureBuffer } from '../gpu/BufferManager';
import candlestickWGSL from '../shaders/candlestick.wgsl?raw';
// Floats per instance:  x, open, close, high, low, bodyHalfW, r, g, b, a
const FLOATS_PER_INSTANCE = 10;
const BYTES_PER_INSTANCE = FLOATS_PER_INSTANCE * 4; // 40 bytes
const VERTICES_PER_CANDLE = 18; // body(6) + upper wick(6) + lower wick(6)
const VERTICES_BODY_ONLY = 6;
// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------
function parseHexColor(hex) {
    let h = hex.replace('#', '');
    if (h.length === 3)
        h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    return [(n >> 16) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255, 1];
}
// ---------------------------------------------------------------------------
// OHLC accessor – normalise tuple / object into a consistent tuple.
// ---------------------------------------------------------------------------
function asOHLC(p) {
    if (Array.isArray(p))
        return p;
    const o = p;
    return [o.timestamp, o.open, o.high, o.low, o.close];
}
export function createCandlestickRenderer(gpu) {
    const { device, format } = gpu;
    // --- Uniform buffer (wick width) ---
    const uniformBuf = device.createBuffer({
        label: 'candle-uniforms',
        size: 16, // vec4 aligned
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    // --- Shader module ---
    const shaderModule = device.createShaderModule({
        label: 'candle-shader',
        code: candlestickWGSL,
    });
    // --- Pipeline ---
    const pipeline = device.createRenderPipeline({
        label: 'candle-pipeline',
        layout: 'auto',
        vertex: {
            module: shaderModule,
            entryPoint: 'vs_main',
            buffers: [
                {
                    arrayStride: BYTES_PER_INSTANCE,
                    stepMode: 'instance',
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: 'float32' }, // xClip
                        { shaderLocation: 1, offset: 4, format: 'float32' }, // openClip
                        { shaderLocation: 2, offset: 8, format: 'float32' }, // closeClip
                        { shaderLocation: 3, offset: 12, format: 'float32' }, // highClip
                        { shaderLocation: 4, offset: 16, format: 'float32' }, // lowClip
                        { shaderLocation: 5, offset: 20, format: 'float32' }, // bodyHalfW
                        { shaderLocation: 6, offset: 24, format: 'float32x4' }, // color
                    ],
                },
            ],
        },
        fragment: {
            module: shaderModule,
            entryPoint: 'fs_main',
            targets: [
                {
                    format,
                    blend: {
                        color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha' },
                        alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' },
                    },
                },
            ],
        },
        primitive: { topology: 'triangle-list' },
    });
    const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: uniformBuf } }],
    });
    // --- Instance buffers (filled per frame) ---
    let mainBuf = null;
    let hollowBuf = null;
    let instanceCount = 0;
    let hollowCount = 0;
    let isHollow = false;
    // Scissor rect for the plot area (device pixels).
    let scissorX = 0;
    let scissorY = 0;
    let scissorW = 1;
    let scissorH = 1;
    // CPU staging arrays – we reuse the typed array when capacity allows.
    let mainStaging = new Float32Array(0);
    let hollowStaging = new Float32Array(0);
    // ---------------------------------------------------------------------------
    function prepare(data, opts, xScale, yScale, layout, theme) {
        const n = data.length;
        instanceCount = 0;
        hollowCount = 0;
        isHollow = opts.style === 'hollow';
        if (n === 0)
            return;
        // Resolve colours.
        const upCol = parseHexColor(opts.upColor || theme.candleUpColor);
        const downCol = parseHexColor(opts.downColor || theme.candleDownColor);
        const upBorder = parseHexColor(opts.upBorderColor || theme.candleUpBorderColor);
        const downBorder = parseHexColor(opts.downBorderColor || theme.candleDownBorderColor);
        const bgCol = parseHexColor(theme.background);
        // Body width calculation – everything computed directly in clip space
        // to avoid DPR conversion errors.
        const cW = layout.pixelWidth; // device pixels
        const cH = layout.pixelHeight;
        const clipPerDevPx = 2 / cW; // 1 device pixel in clip-space units
        // 1 CSS pixel in clip-space units.
        const clipPerCssPx = clipPerDevPx * layout.dpr;
        let bodyHalfWClip;
        if (typeof opts.bodyWidth === 'string' && opts.bodyWidth.endsWith('%')) {
            const pct = parseFloat(opts.bodyWidth) / 100;
            // Average spacing between adjacent candles in clip-space units.
            let spacingClip;
            if (n > 1) {
                const firstTs = asOHLC(data[0])[0];
                const lastTs = asOHLC(data[n - 1])[0];
                spacingClip = Math.abs(toClipX(xScale, lastTs, cW) - toClipX(xScale, firstTs, cW)) / (n - 1);
            }
            else {
                spacingClip = 8 * clipPerCssPx; // fallback: 8 CSS px
            }
            bodyHalfWClip = (spacingClip * pct) / 2;
        }
        else {
            // Absolute value in CSS pixels.
            const cssPx = typeof opts.bodyWidth === 'number' ? opts.bodyWidth : 8;
            bodyHalfWClip = (cssPx * clipPerCssPx) / 2;
        }
        // Clamp: at least 1 CSS pixel wide, at most 1/4 clip width.
        bodyHalfWClip = Math.max(clipPerCssPx * 0.5, Math.min(bodyHalfWClip, 0.5));
        // Wick width – 1 CSS pixel (so it's visible on Retina displays).
        const wickHalfClip = clipPerCssPx / 2;
        // Upload wick width uniform.
        const uniData = new Float32Array([wickHalfClip, 0, 0, 0]);
        device.queue.writeBuffer(uniformBuf, 0, uniData);
        // Build instance data.
        const mainFloats = n * FLOATS_PER_INSTANCE;
        if (mainStaging.length < mainFloats) {
            mainStaging = new Float32Array(mainFloats);
        }
        let hollowUpCount = 0;
        // First pass – count hollow up‑candles if needed.
        // Tuple format: [timestamp, open, high, low, close] → close is index 4.
        if (isHollow) {
            for (let i = 0; i < n; i++) {
                const c = asOHLC(data[i]);
                if (c[4] >= c[1])
                    hollowUpCount++; // close >= open
            }
        }
        const hollowFloats = hollowUpCount * FLOATS_PER_INSTANCE;
        if (hollowStaging.length < hollowFloats) {
            hollowStaging = new Float32Array(Math.max(hollowFloats, 64));
        }
        let mIdx = 0;
        let hIdx = 0;
        for (let i = 0; i < n; i++) {
            const c = asOHLC(data[i]);
            const [ts, open, high, low, close] = c;
            if (!isFinite(open) || !isFinite(high) || !isFinite(low) || !isFinite(close))
                continue;
            const xC = toClipX(xScale, ts, cW);
            const oC = toClipY(yScale, open, cH);
            const cC = toClipY(yScale, close, cH);
            const hC = toClipY(yScale, high, cH);
            const lC = toClipY(yScale, low, cH);
            const isUp = close >= open;
            // Choose colour based on style.
            let col;
            if (isHollow) {
                col = isUp ? upBorder : downBorder;
            }
            else {
                col = isUp ? upCol : downCol;
            }
            mainStaging[mIdx++] = xC;
            mainStaging[mIdx++] = oC;
            mainStaging[mIdx++] = cC;
            mainStaging[mIdx++] = hC;
            mainStaging[mIdx++] = lC;
            mainStaging[mIdx++] = bodyHalfWClip;
            mainStaging[mIdx++] = col[0];
            mainStaging[mIdx++] = col[1];
            mainStaging[mIdx++] = col[2];
            mainStaging[mIdx++] = col[3];
            instanceCount++;
            // Hollow mode: up‑candles get a second pass that punches out the body
            // interior by drawing an inset rectangle with the background colour,
            // leaving only a 1–2 CSS pixel border visible.
            if (isHollow && isUp) {
                // Inset by ~1.5 CSS pixels on each side for a clear border.
                const borderThickness = clipPerCssPx * 1.5;
                const innerHalfW = Math.max(0, bodyHalfWClip - borderThickness);
                // Only punch out if there's interior space.
                if (innerHalfW > 0) {
                    hollowStaging[hIdx++] = xC;
                    hollowStaging[hIdx++] = oC;
                    hollowStaging[hIdx++] = cC;
                    hollowStaging[hIdx++] = hC;
                    hollowStaging[hIdx++] = lC;
                    hollowStaging[hIdx++] = innerHalfW;
                    hollowStaging[hIdx++] = bgCol[0];
                    hollowStaging[hIdx++] = bgCol[1];
                    hollowStaging[hIdx++] = bgCol[2];
                    hollowStaging[hIdx++] = bgCol[3];
                    hollowCount++;
                }
            }
        }
        // Upload instance data.
        const usage = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;
        const mainSlice = mainStaging.subarray(0, instanceCount * FLOATS_PER_INSTANCE);
        mainBuf = ensureBuffer(device, mainBuf, mainSlice.byteLength, usage, 'candle-instances');
        device.queue.writeBuffer(mainBuf.buffer, 0, mainSlice.buffer, mainSlice.byteOffset, mainSlice.byteLength);
        if (isHollow && hollowCount > 0) {
            const hollowSlice = hollowStaging.subarray(0, hollowCount * FLOATS_PER_INSTANCE);
            hollowBuf = ensureBuffer(device, hollowBuf, hollowSlice.byteLength, usage, 'candle-hollow');
            device.queue.writeBuffer(hollowBuf.buffer, 0, hollowSlice.buffer, hollowSlice.byteOffset, hollowSlice.byteLength);
        }
        // Store scissor.
        scissorX = layout.plotDevice.x;
        scissorY = layout.plotDevice.y;
        scissorW = layout.plotDevice.width;
        scissorH = layout.plotDevice.height;
    }
    // ---------------------------------------------------------------------------
    function render(pass) {
        if (instanceCount === 0 || !mainBuf)
            return;
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.setScissorRect(scissorX, scissorY, scissorW, scissorH);
        // Pass 1 – all candles.
        pass.setVertexBuffer(0, mainBuf.buffer);
        pass.draw(VERTICES_PER_CANDLE, instanceCount);
        // Pass 2 – hollow punch‑out (body only, 6 vertices).
        if (isHollow && hollowCount > 0 && hollowBuf) {
            pass.setVertexBuffer(0, hollowBuf.buffer);
            pass.draw(VERTICES_BODY_ONLY, hollowCount);
        }
        // Reset scissor to full canvas.
        pass.setScissorRect(0, 0, gpu.pixelWidth, gpu.pixelHeight);
    }
    // ---------------------------------------------------------------------------
    function dispose() {
        mainBuf?.buffer.destroy();
        hollowBuf?.buffer.destroy();
        uniformBuf.destroy();
        mainBuf = null;
        hollowBuf = null;
    }
    return { prepare, render, dispose };
}
//# sourceMappingURL=CandlestickRenderer.js.map