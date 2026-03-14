export interface GPUContextHandle {
    readonly device: GPUDevice;
    readonly context: GPUCanvasContext;
    readonly format: GPUTextureFormat;
    readonly canvas: HTMLCanvasElement;
    /** Device‑pixel width of the backing framebuffer. */
    readonly pixelWidth: number;
    /** Device‑pixel height of the backing framebuffer. */
    readonly pixelHeight: number;
    /** Current device‑pixel ratio (re‑read on each resize). */
    readonly dpr: number;
    /** Whether the GPU device has been lost. */
    readonly isDeviceLost: boolean;
    /** Reconfigure the canvas after a resize. */
    resize(): void;
    /** Register a callback for when the GPU device is lost. */
    onDeviceLost(cb: (reason: string) => void): void;
    /** Release GPU resources. */
    destroy(): void;
}
/**
 * Initialise a WebGPU device and configure the canvas.
 * Throws if WebGPU is not supported or adapter/device creation fails.
 */
export declare function createGPUContext(canvas: HTMLCanvasElement): Promise<GPUContextHandle>;
//# sourceMappingURL=Context.d.ts.map