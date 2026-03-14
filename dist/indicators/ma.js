// ---------------------------------------------------------------------------
// DiCharts – Moving Average Indicators (SMA & EMA)
// ---------------------------------------------------------------------------
/**
 * Simple Moving Average.
 * Returns an array of [timestamp, sma] pairs.
 * The first `period - 1` entries are omitted (not enough data).
 */
export function computeSMA(data, period, source = 'close') {
    const srcIdx = source === 'open' ? 1 : source === 'high' ? 2 : source === 'low' ? 3 : 4;
    const result = [];
    if (data.length < period)
        return result;
    let sum = 0;
    for (let i = 0; i < period; i++) {
        sum += data[i][srcIdx];
    }
    result.push([data[period - 1][0], sum / period]);
    for (let i = period; i < data.length; i++) {
        sum += data[i][srcIdx] - data[i - period][srcIdx];
        result.push([data[i][0], sum / period]);
    }
    return result;
}
/**
 * Exponential Moving Average.
 * Returns an array of [timestamp, ema] pairs.
 */
export function computeEMA(data, period, source = 'close') {
    const srcIdx = source === 'open' ? 1 : source === 'high' ? 2 : source === 'low' ? 3 : 4;
    const result = [];
    if (data.length === 0)
        return result;
    const k = 2 / (period + 1);
    // Seed with SMA of first `period` values.
    let ema;
    if (data.length >= period) {
        let sum = 0;
        for (let i = 0; i < period; i++) {
            sum += data[i][srcIdx];
        }
        ema = sum / period;
        result.push([data[period - 1][0], ema]);
        for (let i = period; i < data.length; i++) {
            ema = data[i][srcIdx] * k + ema * (1 - k);
            result.push([data[i][0], ema]);
        }
    }
    else {
        // Not enough data for full period, just use raw values.
        ema = data[0][srcIdx];
        result.push([data[0][0], ema]);
        for (let i = 1; i < data.length; i++) {
            ema = data[i][srcIdx] * k + ema * (1 - k);
            result.push([data[i][0], ema]);
        }
    }
    return result;
}
//# sourceMappingURL=ma.js.map