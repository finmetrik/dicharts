// ---------------------------------------------------------------------------
// DiCharts – OHLC‑Aware Downsampler
// ---------------------------------------------------------------------------
// Reduces the number of candles while preserving OHLC semantics:
//   - Open  = first candle's open in the bucket
//   - Close = last candle's close in the bucket
//   - High  = max of all highs
//   - Low   = min of all lows
// Preserves the first and last candles exactly.
// ---------------------------------------------------------------------------
/**
 * Downsample an array of OHLC candles to approximately `target` entries.
 * Returns the original array if it's already small enough.
 */
export function downsampleOHLC(data, target) {
    const n = data.length;
    if (n <= target || target < 2)
        return data;
    const result = [];
    // Always include the first candle.
    result.push(data[0]);
    const bucketSize = (n - 1) / (target - 1);
    for (let i = 1; i < target - 1; i++) {
        const start = Math.round(i * bucketSize);
        const end = Math.min(Math.round((i + 1) * bucketSize), n);
        let open = data[start][1];
        let high = -Infinity;
        let low = Infinity;
        let close = data[start][4];
        let ts = data[start][0];
        for (let j = start; j < end; j++) {
            const c = data[j];
            if (c[2] > high)
                high = c[2];
            if (c[3] < low)
                low = c[3];
            close = c[4]; // last close in bucket
        }
        result.push([ts, open, high, low, close]);
    }
    // Always include the last candle.
    result.push(data[n - 1]);
    return result;
}
//# sourceMappingURL=Sampler.js.map