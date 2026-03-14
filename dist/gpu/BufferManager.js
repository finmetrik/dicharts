// ---------------------------------------------------------------------------
// DiCharts – GPU Buffer Manager
// ---------------------------------------------------------------------------
// Manages GPU buffers with power‑of‑2 growth so that frequent appends
// don't cause constant re‑allocation.
// ---------------------------------------------------------------------------
/** Round up to the next power of two (min 256 bytes). */
function nextPow2(n) {
    let v = Math.max(256, n);
    v--;
    v |= v >> 1;
    v |= v >> 2;
    v |= v >> 4;
    v |= v >> 8;
    v |= v >> 16;
    v++;
    return v;
}
/** Ensure `n` is a multiple of 4 (WebGPU alignment requirement). */
function align4(n) {
    return (n + 3) & ~3;
}
/**
 * Create or grow a GPU buffer to hold at least `requiredBytes`.
 *
 * If the existing buffer has enough capacity it is returned as‑is.
 * Otherwise a new buffer is allocated (old one destroyed) with
 * power‑of‑2 capacity.
 */
export function ensureBuffer(device, existing, requiredBytes, usage, label) {
    const aligned = align4(Math.max(4, requiredBytes));
    if (existing && existing.capacityBytes >= aligned) {
        return existing;
    }
    // Destroy previous buffer if it exists.
    existing?.buffer.destroy();
    const capacity = nextPow2(aligned);
    const buffer = device.createBuffer({
        label: label ?? 'dicharts-buffer',
        size: capacity,
        usage,
    });
    return { buffer, capacityBytes: capacity, usedBytes: 0 };
}
/**
 * Write a Float32Array into a managed buffer, growing if needed.
 * Returns the (possibly new) ManagedBuffer.
 */
export function uploadFloat32(device, managed, data, usage, label) {
    const byteLen = data.byteLength;
    const buf = ensureBuffer(device, managed, byteLen, usage, label);
    device.queue.writeBuffer(buf.buffer, 0, data.buffer, data.byteOffset, byteLen);
    buf.usedBytes = byteLen;
    return buf;
}
/**
 * Append a Float32Array to the *end* of an existing managed buffer.
 * Grows the buffer (and re‑uploads everything via `fullData`) if needed.
 */
export function appendFloat32(device, managed, fullData, appendOffset, // byte offset where the new data starts
usage, label) {
    const totalBytes = fullData.byteLength;
    if (managed && managed.capacityBytes >= totalBytes) {
        // Fast path – capacity is sufficient; only upload the new portion.
        const newBytes = totalBytes - appendOffset;
        if (newBytes > 0) {
            device.queue.writeBuffer(managed.buffer, appendOffset, fullData.buffer, fullData.byteOffset + appendOffset, newBytes);
        }
        managed.usedBytes = totalBytes;
        return managed;
    }
    // Slow path – need a bigger buffer; upload everything.
    return uploadFloat32(device, managed, fullData, usage, label);
}
//# sourceMappingURL=BufferManager.js.map