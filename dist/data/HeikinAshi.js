// ---------------------------------------------------------------------------
// DiCharts – Heikin-Ashi Transform
// ---------------------------------------------------------------------------
// Converts standard OHLC candles to Heikin-Ashi candles.
// HA candles smooth price action and make trends easier to spot.
// ---------------------------------------------------------------------------
/**
 * Convert standard OHLC data to Heikin-Ashi candles.
 *
 * HA formulas:
 *   HA_Close = (O + H + L + C) / 4
 *   HA_Open  = (prev_HA_Open + prev_HA_Close) / 2  (first: (O + C) / 2)
 *   HA_High  = max(H, HA_Open, HA_Close)
 *   HA_Low   = min(L, HA_Open, HA_Close)
 */
export function toHeikinAshi(data) {
    if (data.length === 0)
        return [];
    const result = [];
    let prevHaOpen;
    let prevHaClose;
    // First candle.
    const [ts0, o0, h0, l0, c0] = data[0];
    prevHaClose = (o0 + h0 + l0 + c0) / 4;
    prevHaOpen = (o0 + c0) / 2;
    const haH0 = Math.max(h0, prevHaOpen, prevHaClose);
    const haL0 = Math.min(l0, prevHaOpen, prevHaClose);
    result.push([ts0, prevHaOpen, haH0, haL0, prevHaClose]);
    // Subsequent candles.
    for (let i = 1; i < data.length; i++) {
        const [ts, o, h, l, c] = data[i];
        const haClose = (o + h + l + c) / 4;
        const haOpen = (prevHaOpen + prevHaClose) / 2;
        const haHigh = Math.max(h, haOpen, haClose);
        const haLow = Math.min(l, haOpen, haClose);
        result.push([ts, haOpen, haHigh, haLow, haClose]);
        prevHaOpen = haOpen;
        prevHaClose = haClose;
    }
    return result;
}
//# sourceMappingURL=HeikinAshi.js.map