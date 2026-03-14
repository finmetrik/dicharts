// ---------------------------------------------------------------------------
// DiCharts – Bollinger Bands Indicator
// ---------------------------------------------------------------------------
import { computeSMA } from './ma';
/**
 * Compute Bollinger Bands.
 * @param period  SMA period (typically 20).
 * @param stdDev  Standard deviation multiplier (typically 2).
 */
export function computeBollinger(data, period = 20, stdDev = 2) {
    const middle = computeSMA(data, period);
    const upper = [];
    const lower = [];
    // The SMA starts at index `period - 1` of the source data.
    const offset = period - 1;
    for (let i = 0; i < middle.length; i++) {
        const srcStart = i; // index into data[]
        // Compute standard deviation over the window.
        let sumSq = 0;
        const mean = middle[i][1];
        for (let j = srcStart; j < srcStart + period && j < data.length; j++) {
            const diff = data[j][4] - mean; // close - mean
            sumSq += diff * diff;
        }
        const sd = Math.sqrt(sumSq / period);
        const ts = middle[i][0];
        upper.push([ts, mean + stdDev * sd]);
        lower.push([ts, mean - stdDev * sd]);
    }
    return { upper, middle, lower };
}
//# sourceMappingURL=bollinger.js.map