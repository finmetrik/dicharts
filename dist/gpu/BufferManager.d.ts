export interface ManagedBuffer {
    /** The underlying GPU buffer. */
    buffer: GPUBuffer;
    /** Allocated capacity in bytes (always power‑of‑2, >= 256). */
    capacityBytes: number;
    /** How many bytes are currently in use. */
    usedBytes: number;
}
/**
 * Create or grow a GPU buffer to hold at least `requiredBytes`.
 *
 * If the existing buffer has enough capacity it is returned as‑is.
 * Otherwise a new buffer is allocated (old one destroyed) with
 * power‑of‑2 capacity.
 */
export declare function ensureBuffer(device: GPUDevice, existing: ManagedBuffer | null, requiredBytes: number, usage: GPUBufferUsageFlags, label?: string): ManagedBuffer;
/**
 * Write a Float32Array into a managed buffer, growing if needed.
 * Returns the (possibly new) ManagedBuffer.
 */
export declare function uploadFloat32(device: GPUDevice, managed: ManagedBuffer | null, data: Float32Array, usage: GPUBufferUsageFlags, label?: string): ManagedBuffer;
/**
 * Append a Float32Array to the *end* of an existing managed buffer.
 * Grows the buffer (and re‑uploads everything via `fullData`) if needed.
 */
export declare function appendFloat32(device: GPUDevice, managed: ManagedBuffer | null, fullData: Float32Array, appendOffset: number, // byte offset where the new data starts
usage: GPUBufferUsageFlags, label?: string): ManagedBuffer;
//# sourceMappingURL=BufferManager.d.ts.map