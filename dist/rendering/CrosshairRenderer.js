// ---------------------------------------------------------------------------
// DiCharts – Crosshair Renderer
// ---------------------------------------------------------------------------
// Draws horizontal and vertical dashed lines at the current pointer
// position.  Vertices are generated in clip space with a dash pattern
// applied on the CPU.
// ---------------------------------------------------------------------------
import { ensureBuffer } from '../gpu/BufferManager';
import crosshairWGSL from '../shaders/crosshair.wgsl?raw';
export function createCrosshairRenderer(gpu) {
    const { device, format } = gpu;
    const shaderModule = device.createShaderModule({
        label: 'crosshair-shader',
        code: crosshairWGSL,
    });
    const uniformBuf = device.createBuffer({
        label: 'crosshair-uniforms',
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const pipeline = device.createRenderPipeline({
        label: 'crosshair-pipeline',
        layout: 'auto',
        vertex: {
            module: shaderModule,
            entryPoint: 'vs_main',
            buffers: [
                {
                    arrayStride: 8,
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
    function prepare(layout, color, x, y, dashOn = 6, dashOff = 4) {
        device.queue.writeBuffer(uniformBuf, 0, new Float32Array(color));
        if (x === null && y === null) {
            vertexCount = 0;
            return;
        }
        const cW = layout.pixelWidth;
        const cH = layout.pixelHeight;
        const p = layout.plotDevice;
        const clipLeft = (p.x / cW) * 2 - 1;
        const clipRight = ((p.x + p.width) / cW) * 2 - 1;
        const clipTop = 1 - (p.y / cH) * 2;
        const clipBottom = 1 - ((p.y + p.height) / cH) * 2;
        const segments = [];
        // Vertical dashed line at x.
        if (x !== null) {
            const xClip = (x / cW) * 2 - 1;
            const totalLen = p.height; // device pixels
            const dashTotal = dashOn + dashOff;
            let pos = 0;
            while (pos < totalLen) {
                const segEnd = Math.min(pos + dashOn, totalLen);
                const t0 = pos / totalLen;
                const t1 = segEnd / totalLen;
                const y0 = clipTop + t0 * (clipBottom - clipTop);
                const y1 = clipTop + t1 * (clipBottom - clipTop);
                segments.push(xClip, y0, xClip, y1);
                pos += dashTotal;
            }
        }
        // Horizontal dashed line at y.
        if (y !== null) {
            const yClip = 1 - (y / cH) * 2;
            const totalLen = p.width;
            const dashTotal = dashOn + dashOff;
            let pos = 0;
            while (pos < totalLen) {
                const segEnd = Math.min(pos + dashOn, totalLen);
                const t0 = pos / totalLen;
                const t1 = segEnd / totalLen;
                const x0 = clipLeft + t0 * (clipRight - clipLeft);
                const x1 = clipLeft + t1 * (clipRight - clipLeft);
                segments.push(x0, yClip, x1, yClip);
                pos += dashTotal;
            }
        }
        const verts = new Float32Array(segments);
        vertexCount = verts.length / 2;
        const usage = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;
        vertBuf = ensureBuffer(device, vertBuf, verts.byteLength, usage, 'crosshair-verts');
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
//# sourceMappingURL=CrosshairRenderer.js.map