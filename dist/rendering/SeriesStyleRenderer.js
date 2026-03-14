// ---------------------------------------------------------------------------
// DiCharts – Series Style Renderer
// ---------------------------------------------------------------------------
// Handles rendering for non-candlestick chart styles:
//   - bar     (OHLC bars: vertical stem + open/close ticks)
//   - line    (close-price polyline)
//   - area    (close-price line + gradient fill to bottom)
//   - baseline (close-price line, green above / red below a baseline price)
// ---------------------------------------------------------------------------
import { toClipX, toClipY } from '../scene/Scale';
import { ensureBuffer } from '../gpu/BufferManager';
import barWGSL from '../shaders/bar.wgsl?raw';
import lineWGSL from '../shaders/line.wgsl?raw';
import areaWGSL from '../shaders/area.wgsl?raw';
// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------
function parseHex(hex) {
    let h = hex.replace('#', '');
    if (h.length === 3)
        h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    return [(n >> 16) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255, 1];
}
// Per-instance for bar: same layout as candlestick (x, open, close, high, low, halfW, r, g, b, a)
const BAR_FLOATS = 10;
const BAR_VERTS = 18;
// Per-vertex for line/area: x, y, r, g, b, a = 6 floats
const LINE_FLOATS = 6;
export function createSeriesStyleRenderer(gpu) {
    const { device, format } = gpu;
    // ========= BAR pipeline =========
    const barShader = device.createShaderModule({ label: 'bar-shader', code: barWGSL });
    const barUniformBuf = device.createBuffer({
        label: 'bar-uniforms',
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const barPipeline = device.createRenderPipeline({
        label: 'bar-pipeline',
        layout: 'auto',
        vertex: {
            module: barShader,
            entryPoint: 'vs_main',
            buffers: [{
                    arrayStride: BAR_FLOATS * 4,
                    stepMode: 'instance',
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: 'float32' },
                        { shaderLocation: 1, offset: 4, format: 'float32' },
                        { shaderLocation: 2, offset: 8, format: 'float32' },
                        { shaderLocation: 3, offset: 12, format: 'float32' },
                        { shaderLocation: 4, offset: 16, format: 'float32' },
                        { shaderLocation: 5, offset: 20, format: 'float32' },
                        { shaderLocation: 6, offset: 24, format: 'float32x4' },
                    ],
                }],
        },
        fragment: {
            module: barShader,
            entryPoint: 'fs_main',
            targets: [{ format }],
        },
        primitive: { topology: 'triangle-list' },
    });
    const barBindGroup = device.createBindGroup({
        layout: barPipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: barUniformBuf } }],
    });
    // ========= LINE pipeline (line-strip) =========
    const lineShader = device.createShaderModule({ label: 'series-line-shader', code: lineWGSL });
    const linePipeline = device.createRenderPipeline({
        label: 'series-line-pipeline',
        layout: 'auto',
        vertex: {
            module: lineShader,
            entryPoint: 'vs_main',
            buffers: [{
                    arrayStride: LINE_FLOATS * 4,
                    stepMode: 'vertex',
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: 'float32x2' },
                        { shaderLocation: 1, offset: 8, format: 'float32x4' },
                    ],
                }],
        },
        fragment: {
            module: lineShader,
            entryPoint: 'fs_main',
            targets: [{
                    format,
                    blend: {
                        color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha' },
                        alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' },
                    },
                }],
        },
        primitive: { topology: 'line-strip' },
    });
    // ========= AREA pipeline (triangle-list for fill) =========
    const areaShader = device.createShaderModule({ label: 'area-shader', code: areaWGSL });
    const areaPipeline = device.createRenderPipeline({
        label: 'area-pipeline',
        layout: 'auto',
        vertex: {
            module: areaShader,
            entryPoint: 'vs_main',
            buffers: [{
                    arrayStride: LINE_FLOATS * 4,
                    stepMode: 'vertex',
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: 'float32x2' },
                        { shaderLocation: 1, offset: 8, format: 'float32x4' },
                    ],
                }],
        },
        fragment: {
            module: areaShader,
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
    // ========= Buffers =========
    let barBuf = null;
    let barCount = 0;
    let lineBuf = null;
    let lineVertCount = 0;
    let fillBuf = null;
    let fillVertCount = 0;
    let activeStyle = '';
    // Scissor
    let sX = 0, sY = 0, sW = 1, sH = 1;
    // ========= Prepare =========
    function prepare(data, opts, xScale, yScale, layout, theme) {
        const n = data.length;
        barCount = 0;
        lineVertCount = 0;
        fillVertCount = 0;
        activeStyle = opts.style;
        if (n === 0)
            return;
        sX = layout.plotDevice.x;
        sY = layout.plotDevice.y;
        sW = layout.plotDevice.width;
        sH = layout.plotDevice.height;
        const cW = layout.pixelWidth;
        const cH = layout.pixelHeight;
        if (opts.style === 'bar') {
            prepareBar(data, opts, xScale, yScale, layout, theme, cW, cH);
        }
        else if (opts.style === 'line') {
            prepareLine(data, opts, xScale, yScale, cW, cH);
        }
        else if (opts.style === 'area') {
            prepareLine(data, opts, xScale, yScale, cW, cH);
            prepareAreaFill(data, opts, xScale, yScale, layout, cW, cH, null);
        }
        else if (opts.style === 'baseline') {
            const basePrice = opts.baselinePrice ?? data[0][4];
            prepareBaseline(data, opts, xScale, yScale, layout, cW, cH, basePrice);
        }
    }
    // ---- Bar ----
    function prepareBar(data, opts, xScale, yScale, layout, theme, cW, cH) {
        const n = data.length;
        const clipPerDevPx = 2 / cW;
        const clipPerCssPx = clipPerDevPx * layout.dpr;
        const wickHalfClip = clipPerCssPx / 2;
        // Tick length = half of body width percentage of spacing.
        let tickLen;
        if (n > 1) {
            const spacingClip = Math.abs(toClipX(xScale, data[n - 1][0], cW) - toClipX(xScale, data[0][0], cW)) / (n - 1);
            tickLen = spacingClip * 0.35; // 35% of spacing on each side
        }
        else {
            tickLen = 8 * clipPerCssPx;
        }
        const uniData = new Float32Array([wickHalfClip, tickLen, 0, 0]);
        device.queue.writeBuffer(barUniformBuf, 0, uniData);
        const upCol = parseHex(opts.upColor);
        const downCol = parseHex(opts.downColor);
        const staging = new Float32Array(n * BAR_FLOATS);
        let idx = 0;
        for (let i = 0; i < n; i++) {
            const [ts, open, high, low, close] = data[i];
            if (!isFinite(open))
                continue;
            const xC = toClipX(xScale, ts, cW);
            const oC = toClipY(yScale, open, cH);
            const cC = toClipY(yScale, close, cH);
            const hC = toClipY(yScale, high, cH);
            const lC = toClipY(yScale, low, cH);
            const isUp = close >= open;
            const col = isUp ? upCol : downCol;
            staging[idx++] = xC;
            staging[idx++] = oC;
            staging[idx++] = cC;
            staging[idx++] = hC;
            staging[idx++] = lC;
            staging[idx++] = tickLen;
            staging[idx++] = col[0];
            staging[idx++] = col[1];
            staging[idx++] = col[2];
            staging[idx++] = col[3];
            barCount++;
        }
        const usage = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;
        const slice = staging.subarray(0, barCount * BAR_FLOATS);
        barBuf = ensureBuffer(device, barBuf, slice.byteLength, usage, 'bar-instances');
        device.queue.writeBuffer(barBuf.buffer, 0, slice.buffer, slice.byteOffset, slice.byteLength);
    }
    // ---- Line (shared for line & area styles) ----
    function prepareLine(data, opts, xScale, yScale, cW, cH) {
        const n = data.length;
        const col = parseHex(opts.lineColor);
        const staging = new Float32Array(n * LINE_FLOATS);
        let idx = 0;
        for (let i = 0; i < n; i++) {
            const [ts, , , , close] = data[i];
            staging[idx++] = toClipX(xScale, ts, cW);
            staging[idx++] = toClipY(yScale, close, cH);
            staging[idx++] = col[0];
            staging[idx++] = col[1];
            staging[idx++] = col[2];
            staging[idx++] = col[3];
        }
        lineVertCount = n;
        const usage = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;
        lineBuf = ensureBuffer(device, lineBuf, staging.byteLength, usage, 'series-line');
        device.queue.writeBuffer(lineBuf.buffer, 0, staging);
    }
    // ---- Area fill (triangle strip from line to bottom) ----
    function prepareAreaFill(data, opts, xScale, yScale, layout, cW, cH, baselineClipY) {
        const n = data.length;
        if (n < 2)
            return;
        const col = parseHex(opts.lineColor);
        const topAlpha = 0.35;
        const botAlpha = 0.02;
        // Bottom of the plot in clip space.
        const plotBottom = baselineClipY ?? toClipY(yScale, yScale.domainMin, cH);
        // 2 triangles per segment = 6 verts per segment.
        const segCount = n - 1;
        const staging = new Float32Array(segCount * 6 * LINE_FLOATS);
        let idx = 0;
        for (let i = 0; i < segCount; i++) {
            const x0 = toClipX(xScale, data[i][0], cW);
            const y0 = toClipY(yScale, data[i][4], cH);
            const x1 = toClipX(xScale, data[i + 1][0], cW);
            const y1 = toClipY(yScale, data[i + 1][4], cH);
            // Triangle 1: top-left, top-right, bottom-left
            staging[idx++] = x0;
            staging[idx++] = y0;
            staging[idx++] = col[0];
            staging[idx++] = col[1];
            staging[idx++] = col[2];
            staging[idx++] = topAlpha;
            staging[idx++] = x1;
            staging[idx++] = y1;
            staging[idx++] = col[0];
            staging[idx++] = col[1];
            staging[idx++] = col[2];
            staging[idx++] = topAlpha;
            staging[idx++] = x0;
            staging[idx++] = plotBottom;
            staging[idx++] = col[0];
            staging[idx++] = col[1];
            staging[idx++] = col[2];
            staging[idx++] = botAlpha;
            // Triangle 2: top-right, bottom-right, bottom-left
            staging[idx++] = x1;
            staging[idx++] = y1;
            staging[idx++] = col[0];
            staging[idx++] = col[1];
            staging[idx++] = col[2];
            staging[idx++] = topAlpha;
            staging[idx++] = x1;
            staging[idx++] = plotBottom;
            staging[idx++] = col[0];
            staging[idx++] = col[1];
            staging[idx++] = col[2];
            staging[idx++] = botAlpha;
            staging[idx++] = x0;
            staging[idx++] = plotBottom;
            staging[idx++] = col[0];
            staging[idx++] = col[1];
            staging[idx++] = col[2];
            staging[idx++] = botAlpha;
        }
        fillVertCount = segCount * 6;
        const usage = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;
        fillBuf = ensureBuffer(device, fillBuf, staging.byteLength, usage, 'area-fill');
        device.queue.writeBuffer(fillBuf.buffer, 0, staging.buffer, staging.byteOffset, staging.byteLength);
    }
    // ---- Baseline ----
    function prepareBaseline(data, opts, xScale, yScale, layout, cW, cH, baselinePrice) {
        const n = data.length;
        if (n < 2)
            return;
        const upCol = parseHex(opts.upColor);
        const downCol = parseHex(opts.downColor);
        const baseClipY = toClipY(yScale, baselinePrice, cH);
        // Line: color segments green above baseline, red below.
        const lineStaging = new Float32Array(n * LINE_FLOATS);
        let idx = 0;
        for (let i = 0; i < n; i++) {
            const [ts, , , , close] = data[i];
            const xC = toClipX(xScale, ts, cW);
            const yC = toClipY(yScale, close, cH);
            const isAbove = close >= baselinePrice;
            const col = isAbove ? upCol : downCol;
            lineStaging[idx++] = xC;
            lineStaging[idx++] = yC;
            lineStaging[idx++] = col[0];
            lineStaging[idx++] = col[1];
            lineStaging[idx++] = col[2];
            lineStaging[idx++] = 1;
        }
        lineVertCount = n;
        const usage = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;
        lineBuf = ensureBuffer(device, lineBuf, lineStaging.byteLength, usage, 'baseline-line');
        device.queue.writeBuffer(lineBuf.buffer, 0, lineStaging);
        // Fill: triangles from line to baseline, green above / red below.
        const segCount = n - 1;
        const fillStaging = new Float32Array(segCount * 6 * LINE_FLOATS);
        let fIdx = 0;
        const topAlpha = 0.2;
        const botAlpha = 0.02;
        for (let i = 0; i < segCount; i++) {
            const x0 = toClipX(xScale, data[i][0], cW);
            const y0 = toClipY(yScale, data[i][4], cH);
            const x1 = toClipX(xScale, data[i + 1][0], cW);
            const y1 = toClipY(yScale, data[i + 1][4], cH);
            const midClose = (data[i][4] + data[i + 1][4]) / 2;
            const isAbove = midClose >= baselinePrice;
            const col = isAbove ? upCol : downCol;
            // Triangle 1: line-point → line-point → baseline
            fillStaging[fIdx++] = x0;
            fillStaging[fIdx++] = y0;
            fillStaging[fIdx++] = col[0];
            fillStaging[fIdx++] = col[1];
            fillStaging[fIdx++] = col[2];
            fillStaging[fIdx++] = topAlpha;
            fillStaging[fIdx++] = x1;
            fillStaging[fIdx++] = y1;
            fillStaging[fIdx++] = col[0];
            fillStaging[fIdx++] = col[1];
            fillStaging[fIdx++] = col[2];
            fillStaging[fIdx++] = topAlpha;
            fillStaging[fIdx++] = x0;
            fillStaging[fIdx++] = baseClipY;
            fillStaging[fIdx++] = col[0];
            fillStaging[fIdx++] = col[1];
            fillStaging[fIdx++] = col[2];
            fillStaging[fIdx++] = botAlpha;
            // Triangle 2
            fillStaging[fIdx++] = x1;
            fillStaging[fIdx++] = y1;
            fillStaging[fIdx++] = col[0];
            fillStaging[fIdx++] = col[1];
            fillStaging[fIdx++] = col[2];
            fillStaging[fIdx++] = topAlpha;
            fillStaging[fIdx++] = x1;
            fillStaging[fIdx++] = baseClipY;
            fillStaging[fIdx++] = col[0];
            fillStaging[fIdx++] = col[1];
            fillStaging[fIdx++] = col[2];
            fillStaging[fIdx++] = botAlpha;
            fillStaging[fIdx++] = x0;
            fillStaging[fIdx++] = baseClipY;
            fillStaging[fIdx++] = col[0];
            fillStaging[fIdx++] = col[1];
            fillStaging[fIdx++] = col[2];
            fillStaging[fIdx++] = botAlpha;
        }
        fillVertCount = segCount * 6;
        fillBuf = ensureBuffer(device, fillBuf, fillStaging.byteLength, usage, 'baseline-fill');
        device.queue.writeBuffer(fillBuf.buffer, 0, fillStaging.buffer, fillStaging.byteOffset, fillStaging.byteLength);
    }
    // ========= Render =========
    function render(pass) {
        pass.setScissorRect(sX, sY, sW, sH);
        if (activeStyle === 'bar' && barCount > 0 && barBuf) {
            pass.setPipeline(barPipeline);
            pass.setBindGroup(0, barBindGroup);
            pass.setVertexBuffer(0, barBuf.buffer);
            pass.draw(BAR_VERTS, barCount);
        }
        if ((activeStyle === 'area' || activeStyle === 'baseline') && fillVertCount > 0 && fillBuf) {
            pass.setPipeline(areaPipeline);
            pass.setVertexBuffer(0, fillBuf.buffer);
            pass.draw(fillVertCount);
        }
        if ((activeStyle === 'line' || activeStyle === 'area' || activeStyle === 'baseline') && lineVertCount > 1 && lineBuf) {
            pass.setPipeline(linePipeline);
            pass.setVertexBuffer(0, lineBuf.buffer);
            pass.draw(lineVertCount);
        }
        pass.setScissorRect(0, 0, gpu.pixelWidth, gpu.pixelHeight);
    }
    // ========= Dispose =========
    function dispose() {
        barBuf?.buffer.destroy();
        lineBuf?.buffer.destroy();
        fillBuf?.buffer.destroy();
        barUniformBuf.destroy();
        barBuf = null;
        lineBuf = null;
        fillBuf = null;
    }
    return { prepare, render, dispose };
}
//# sourceMappingURL=SeriesStyleRenderer.js.map