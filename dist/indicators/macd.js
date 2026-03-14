// ---------------------------------------------------------------------------
// DiCharts – MACD (Moving Average Convergence Divergence)
// ---------------------------------------------------------------------------
import { computeEMA } from './ma';
/**
 * Compute MACD.
 * @param fastPeriod  Typically 12.
 * @param slowPeriod  Typically 26.
 * @param signalPeriod  Typically 9.
 */
export function computeMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const fastEma = computeEMA(data, fastPeriod);
    const slowEma = computeEMA(data, slowPeriod);
    // Align: both start from different offsets. Align to the later start.
    const fastStart = fastPeriod - 1;
    const slowStart = slowPeriod - 1;
    const alignStart = Math.max(fastStart, slowStart);
    const fastOffset = alignStart - fastStart;
    const slowOffset = alignStart - slowStart;
    const alignLen = Math.min(fastEma.length - fastOffset, slowEma.length - slowOffset);
    // MACD line = fast EMA - slow EMA.
    const macdLine = [];
    for (let i = 0; i < alignLen; i++) {
        const ts = fastEma[i + fastOffset][0];
        const val = fastEma[i + fastOffset][1] - slowEma[i + slowOffset][1];
        macdLine.push([ts, val]);
    }
    // Signal line = EMA of MACD values.
    // We need to wrap macdLine into a "fake" OHLC tuple for computeEMA.
    // Instead, compute EMA manually.
    const signal = [];
    const histogram = [];
    if (macdLine.length >= signalPeriod) {
        const k = 2 / (signalPeriod + 1);
        // Seed with SMA of first signalPeriod MACD values.
        let sum = 0;
        for (let i = 0; i < signalPeriod; i++) {
            sum += macdLine[i][1];
        }
        let sigEma = sum / signalPeriod;
        signal.push([macdLine[signalPeriod - 1][0], sigEma]);
        histogram.push([macdLine[signalPeriod - 1][0], macdLine[signalPeriod - 1][1] - sigEma]);
        for (let i = signalPeriod; i < macdLine.length; i++) {
            sigEma = macdLine[i][1] * k + sigEma * (1 - k);
            signal.push([macdLine[i][0], sigEma]);
            histogram.push([macdLine[i][0], macdLine[i][1] - sigEma]);
        }
    }
    return { macd: macdLine, signal, histogram };
}
//# sourceMappingURL=macd.js.map