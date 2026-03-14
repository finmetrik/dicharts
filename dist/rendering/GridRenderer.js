// ---------------------------------------------------------------------------
// DiCharts – Grid Renderer
// ---------------------------------------------------------------------------
// Draws horizontal and vertical grid lines inside the plot area.
// Vertices are pre‑computed in clip space and rendered as line‑list.
// ---------------------------------------------------------------------------
import { ensureBuffer } from '../gpu/BufferManager';
import gridWGSL from '../shaders/grid.wgsl?raw';
function parseRgba(css) {
    // Supports "rgba(r, g, b, a)" and hex colours.
    const m = css.match(/rgba?\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
    if (m) {
        return [
            parseFloat(m[1]) / 255,
            parseFloat(m[2]) / 255,
            parseFloat(m[3]) / 255,
            m[4] !== undefined ? parseFloat(m[4]) : 1,
        ];
    }
    // Hex fallback.
    let h = css.replace('#', '');
    if (h.length === 3)
        h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    return [(n >> 16) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255, 1];
}
export function createGridRenderer(gpu) {
    const { device, format } = gpu;
    const shaderModule = device.createShaderModule({
        label: 'grid-shader',
        code: gridWGSL,
    });
    const uniformBuf = device.createBuffer({
        label: 'grid-uniforms',
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const pipeline = device.createRenderPipeline({
        label: 'grid-pipeline',
        layout: 'auto',
        vertex: {
            module: shaderModule,
            entryPoint: 'vs_main',
            buffers: [
                {
                    arrayStride: 8, // vec2<f32>
                    stepMode: 'vertex',
                    attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x2' }],
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
        primitive: { topology: 'line-list' },
    });
    const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: uniformBuf } }],
    });
    let vertBuf = null;
    let vertexCount = 0;
    function prepare(layout, theme, hLines, vLines) {
        const col = parseRgba(theme.gridColor);
        device.queue.writeBuffer(uniformBuf, 0, new Float32Array(col));
        const cW = layout.pixelWidth;
        const cH = layout.pixelHeight;
        const p = layout.plotDevice;
        // Convert plot‑device rect to clip space.
        const clipLeft = (p.x / cW) * 2 - 1;
        const clipRight = ((p.x + p.width) / cW) * 2 - 1;
        const clipTop = 1 - (p.y / cH) * 2;
        const clipBottom = 1 - ((p.y + p.height) / cH) * 2;
        const totalLines = hLines + vLines;
        const floatsNeeded = totalLines * 4; // 2 verts × 2 floats per line
        const verts = new Float32Array(floatsNeeded);
        let idx = 0;
        // Horizontal lines (evenly spaced).
        for (let i = 0; i < hLines; i++) {
            const t = hLines === 1 ? 0.5 : i / (hLines - 1);
            const y = clipTop + t * (clipBottom - clipTop);
            verts[idx++] = clipLeft;
            verts[idx++] = y;
            verts[idx++] = clipRight;
            verts[idx++] = y;
        }
        // Vertical lines.
        for (let i = 0; i < vLines; i++) {
            const t = vLines === 1 ? 0.5 : i / (vLines - 1);
            const x = clipLeft + t * (clipRight - clipLeft);
            verts[idx++] = x;
            verts[idx++] = clipTop;
            verts[idx++] = x;
            verts[idx++] = clipBottom;
        }
        vertexCount = totalLines * 2;
        const usage = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;
        vertBuf = ensureBuffer(device, vertBuf, verts.byteLength, usage, 'grid-verts');
        device.queue.writeBuffer(vertBuf.buffer, 0, verts);
    }
    function render(pass) {
        if (vertexCount === 0 || !vertBuf)
            return;
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.setVertexBuffer(0, vertBuf.buffer);
        pass.draw(vertexCount);
    }
    function dispose() {
        vertBuf?.buffer.destroy();
        uniformBuf.destroy();
        vertBuf = null;
    }
    return { prepare, render, dispose };
}
//# sourceMappingURL=GridRenderer.js.map