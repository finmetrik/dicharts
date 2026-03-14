// ---------------------------------------------------------------------------
// DiCharts – OHLC Data Store
// ---------------------------------------------------------------------------
// Maintains the CPU‑side array of candle data.  Provides efficient
// append, update‑last, and trim operations for streaming use.
// ---------------------------------------------------------------------------
function asOHLC(p) {
    if (Array.isArray(p))
        return p;
    const o = p;
    return [o.timestamp, o.open, o.high, o.low, o.close];
}
export function createOHLCStore(initial) {
    let _data = initial ? initial.map(asOHLC) : [];
    return {
        get data() { return _data; },
        get length() { return _data.length; },
        setData(candles) {
            _data = candles.map(asOHLC);
        },
        append(candles) {
            for (const c of candles) {
                _data.push(asOHLC(c));
            }
        },
        updateLast(candle) {
            if (_data.length === 0) {
                _data.push(asOHLC(candle));
            }
            else {
                _data[_data.length - 1] = asOHLC(candle);
            }
        },
        trim(maxCandles) {
            if (_data.length > maxCandles) {
                _data = _data.slice(_data.length - maxCandles);
            }
        },
    };
}
//# sourceMappingURL=OHLCStore.js.map