import type { OHLCTuple } from '../types';
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
export declare function toRenko(data: OHLCTuple[], brickSize?: number): OHLCTuple[];
//# sourceMappingURL=Renko.d.ts.map