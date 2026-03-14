// ---------------------------------------------------------------------------
// DiCharts – Tick Aggregator
// ---------------------------------------------------------------------------
// Converts a stream of price ticks into OHLC candles at a configurable
// interval.  Each tick updates the "forming" candle; when the interval
// boundary is crossed a completed candle is emitted.
// ---------------------------------------------------------------------------
export function createTickAggregator(intervalMs) {
    let _interval = intervalMs;
    let _candleStart = 0;
    let _open = 0;
    let _high = -Infinity;
    let _low = Infinity;
    let _close = 0;
    let _active = false;
    function bucketStart(ts) {
        return Math.floor(ts / _interval) * _interval;
    }
    function currentAsTuple() {
        return [_candleStart, _open, _high, _low, _close];
    }
    function processTick(tick) {
        const ts = tick.timestamp;
        const price = tick.price;
        const bucket = bucketStart(ts);
        if (!_active) {
            // First tick ever.
            _candleStart = bucket;
            _open = price;
            _high = price;
            _low = price;
            _close = price;
            _active = true;
            return null;
        }
        if (bucket > _candleStart) {
            // New period – emit completed candle and start fresh.
            const completed = currentAsTuple();
            _candleStart = bucket;
            _open = price;
            _high = price;
            _low = price;
            _close = price;
            return completed;
        }
        // Same period – update OHLC.
        if (price > _high)
            _high = price;
        if (price < _low)
            _low = price;
        _close = price;
        return null;
    }
    function currentCandle() {
        if (!_active)
            return null;
        return currentAsTuple();
    }
    function setInterval(ms) {
        _interval = ms;
        reset();
    }
    function reset() {
        _active = false;
        _candleStart = 0;
        _open = 0;
        _high = -Infinity;
        _low = Infinity;
        _close = 0;
    }
    return { processTick, currentCandle, setInterval, reset };
}
//# sourceMappingURL=TickAggregator.js.map