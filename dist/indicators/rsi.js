// ---------------------------------------------------------------------------
// DiCharts – RSI (Relative Strength Index)
// ---------------------------------------------------------------------------
/**
 * Compute RSI using the Wilder smoothing method.
 * Returns an array of [timestamp, rsi] pairs.
 * @param period Typically 14.
 */
export function computeRSI(data, period = 14) {
    const result = [];
    if (data.length < period + 1)
        return result;
    // Calculate price changes.
    const changes = [];
    for (let i = 1; i < data.length; i++) {
        changes.push(data[i][4] - data[i - 1][4]); // close - prev close
    }
    // Initial average gain/loss over first `period` changes.
    let avgGain = 0;
    let avgLoss = 0;
    for (let i = 0; i < period; i++) {
        if (changes[i] > 0)
            avgGain += changes[i];
        else
            avgLoss -= changes[i]; // make positive
    }
    avgGain /= period;
    avgLoss /= period;
    // First RSI value.
    let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    let rsi = 100 - 100 / (1 + rs);
    result.push([data[period][0], rsi]);
    // Subsequent values using Wilder smoothing.
    for (let i = period; i < changes.length; i++) {
        const gain = changes[i] > 0 ? changes[i] : 0;
        const loss = changes[i] < 0 ? -changes[i] : 0;
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
        rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsi = 100 - 100 / (1 + rs);
        result.push([data[i + 1][0], rsi]);
    }
    return result;
}
//# sourceMappingURL=rsi.js.map