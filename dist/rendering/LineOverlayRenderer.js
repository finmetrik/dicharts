// ---------------------------------------------------------------------------
// DiCharts – Line Overlay Renderer
// ---------------------------------------------------------------------------
// Renders multiple polyline overlays (for indicators like MA, EMA,
// Bollinger Bands, price lines, order lines). Each overlay is a colored
// line-strip rendered via the line shader.
// ---------------------------------------------------------------------------
import { toClipX, toClipY } from '../scene/Scale';
import { ensureBuffer } from '../gpu/BufferManager';
import lineWGSL from '../shaders/line.wgsl?raw';
function parseHex(hex) {
    let h = hex.replace('#', '');
    if (h.length === 3)
        h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    return [(n >> 16) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255, 1];
}
// 6 floats per vertex: x, y, r, g, b, a
const FLOATS_PER_VERT = 6;
export function createLineOverlayRenderer(gpu) {
    const { device, format } = gpu;
    const shaderModule = device.createShaderModule({
        label: 'line-overlay-shader',
        code: lineWGSL,
    });
    const pipeline = device.createRenderPipeline({
        label: 'line-overlay-pipeline',
        layout: 'auto',
        vertex: {
            module: shaderModule,
            entryPoint: 'vs_main',
            buffers: [{
                    arrayStride: FLOATS_PER_VERT * 4,
                    stepMode: 'vertex',
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: 'float32x2' }, // position
                        { shaderLocation: 1, offset: 8, format: 'float32x4' }, // color
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
        primitive: { topology: 'line-strip' },
    });
    // Separate pipeline for line-list (horizontals, dashed lines).
    const listPipeline = device.createRenderPipeline({
        label: 'line-list-pipeline',
        layout: 'auto',
        vertex: {
            module: shaderModule,
            entryPoint: 'vs_main',
            buffers: [{
                    arrayStride: FLOATS_PER_VERT * 4,
                    stepMode: 'vertex',
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: 'float32x2' },
                        { shaderLocation: 1, offset: 8, format: 'float32x4' },
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
        primitive: { topology: 'line-list' },
    });
    // Strip segments: each overlay gets its own buffer + vertex count.
    let stripBufs = [];
    let stripCounts = [];
    let listBuf = null;
    let listVertCount = 0;
    // Scissor
    let scissorX = 0, scissorY = 0, scissorW = 1, scissorH = 1;
    function prepare(overlays, horizontals, xScale, yScale, layout) {
        const cW = layout.pixelWidth;
        const cH = layout.pixelHeight;
        const p = layout.plotDevice;
        scissorX = p.x;
        scissorY = p.y;
        scissorW = p.width;
        scissorH = p.height;
        const clipLeft = (p.x / cW) * 2 - 1;
        const clipRight = ((p.x + p.width) / cW) * 2 - 1;
        // --- Line-strip overlays (MA, EMA, Bollinger lines) ---
        // Dispose old strip buffers beyond what we need.
        while (stripBufs.length > overlays.length) {
            stripBufs.pop()?.buffer.destroy();
            stripCounts.pop();
        }
        for (let oi = 0; oi < overlays.length; oi++) {
            const ov = overlays[oi];
            const pts = ov.points;
            const col = parseHex(ov.color);
            col[3] = ov.opacity ?? 1;
            const verts = new Float32Array(pts.length * FLOATS_PER_VERT);
            let idx = 0;
            for (const [ts, val] of pts) {
                verts[idx++] = toClipX(xScale, ts, cW);
                verts[idx++] = toClipY(yScale, val, cH);
                verts[idx++] = col[0];
                verts[idx++] = col[1];
                verts[idx++] = col[2];
                verts[idx++] = col[3];
            }
            const usage = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;
            const existing = oi < stripBufs.length ? stripBufs[oi] : null;
            const buf = ensureBuffer(device, existing, verts.byteLength, usage, `overlay-strip-${oi}`);
            device.queue.writeBuffer(buf.buffer, 0, verts);
            if (oi < stripBufs.length) {
                stripBufs[oi] = buf;
                stripCounts[oi] = pts.length;
            }
            else {
                stripBufs.push(buf);
                stripCounts.push(pts.length);
            }
        }
        // --- Horizontal lines (order lines, price line) as line-list ---
        const dashOn = 6;
        const dashOff = 4;
        const segments = [];
        for (const hl of horizontals) {
            const yC = toClipY(yScale, hl.price, cH);
            const col = parseHex(hl.color);
            col[3] = hl.opacity ?? 1;
            if (hl.dashed) {
                const totalLen = p.width;
                const dashTotal = dashOn + dashOff;
                let pos = 0;
                while (pos < totalLen) {
                    const segEnd = Math.min(pos + dashOn, totalLen);
                    const t0 = pos / totalLen;
                    const t1 = segEnd / totalLen;
                    const x0 = clipLeft + t0 * (clipRight - clipLeft);
                    const x1 = clipLeft + t1 * (clipRight - clipLeft);
                    segments.push(x0, yC, col[0], col[1], col[2], col[3]);
                    segments.push(x1, yC, col[0], col[1], col[2], col[3]);
                    pos += dashTotal;
                }
            }
            else {
                segments.push(clipLeft, yC, col[0], col[1], col[2], col[3]);
                segments.push(clipRight, yC, col[0], col[1], col[2], col[3]);
            }
        }
        const listVerts = new Float32Array(segments);
        listVertCount = listVerts.length / FLOATS_PER_VERT;
        if (listVertCount > 0) {
            const usage = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;
            listBuf = ensureBuffer(device, listBuf, listVerts.byteLength, usage, 'overlay-list');
            device.queue.writeBuffer(listBuf.buffer, 0, listVerts);
        }
    }
    function render(pass) {
        pass.setScissorRect(scissorX, scissorY, scissorW, scissorH);
        // Draw strip overlays.
        if (stripBufs.length > 0) {
            pass.setPipeline(pipeline);
            for (let i = 0; i < stripBufs.length; i++) {
                if (stripCounts[i] < 2)
                    continue;
                pass.setVertexBuffer(0, stripBufs[i].buffer);
                pass.draw(stripCounts[i]);
            }
        }
        // Draw horizontal lines.
        if (listVertCount > 0 && listBuf) {
            pass.setPipeline(listPipeline);
            pass.setVertexBuffer(0, listBuf.buffer);
            pass.draw(listVertCount);
        }
        pass.setScissorRect(0, 0, gpu.pixelWidth, gpu.pixelHeight);
    }
    function dispose() {
        for (const b of stripBufs)
            b.buffer.destroy();
        stripBufs = [];
        stripCounts = [];
        listBuf?.buffer.destroy();
        listBuf = null;
    }
    return { prepare, render, dispose };
}
//# sourceMappingURL=LineOverlayRenderer.js.map