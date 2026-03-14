// ---------------------------------------------------------------------------
// DiCharts – Renko Transform
// ---------------------------------------------------------------------------
// Converts standard OHLC candles to Renko bricks. Renko charts only create
// a new brick when price moves by a fixed "brick size". Time is ignored;
// each brick gets a sequential pseudo-timestamp for rendering.
// ---------------------------------------------------------------------------
/**
 * Convert standard OHLC data to Renko bricks.
 *
 * @param data      Source OHLC candles.
 * @param brickSize Fixed price movement per brick. If not provided, auto-
 *                  calculated as ~1/20 of the price range.
 * @returns Array of OHLCTuple where each tuple is one Renko brick.
 *          Open/Close define the brick body; High = Close, Low = Open for
 *          up bricks (and vice-versa for down bricks). No wicks.
 */
export function toRenko(data, brickSize) {
    if (data.length === 0)
        return [];
    // Auto brick size: ~1/20 of price range.
    if (!brickSize) {
        let pMin = Infinity, pMax = -Infinity;
        for (const c of data) {
            if (c[4] < pMin)
                pMin = c[4]; // close
            if (c[4] > pMax)
                pMax = c[4];
        }
        brickSize = Math.max((pMax - pMin) / 20, 0.01);
    }
    const bricks = [];
    // Start from first close, rounded to brick grid.
    let basePrice = Math.round(data[0][4] / brickSize) * brickSize;
    let lastDir = 0; // 1 = up, -1 = down
    // Use sequential timestamps so bricks are evenly spaced.
    const startTs = data[0][0];
    const stepTs = data.length > 1 ? (data[data.length - 1][0] - data[0][0]) / data.length : 1000;
    let brickIdx = 0;
    for (const candle of data) {
        const close = candle[4];
        // How many bricks up or down?
        while (close >= basePrice + brickSize) {
            // Up brick.
            const open = basePrice;
            basePrice += brickSize;
            const bClose = basePrice;
            bricks.push([
                startTs + brickIdx * stepTs,
                open,
                bClose, // high = close for up brick
                open, // low = open for up brick
                bClose,
            ]);
            lastDir = 1;
            brickIdx++;
        }
        while (close <= basePrice - brickSize) {
            // Down brick.
            const open = basePrice;
            basePrice -= brickSize;
            const bClose = basePrice;
            bricks.push([
                startTs + brickIdx * stepTs,
                open,
                open, // high = open for down brick
                bClose, // low = close for down brick
                bClose,
            ]);
            lastDir = -1;
            brickIdx++;
        }
    }
    return bricks;
}
//# sourceMappingURL=Renko.js.map