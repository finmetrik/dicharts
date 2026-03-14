import type { CandleDataPoint, OHLCTuple } from '../types';
export interface OHLCStore {
    /** All candle data. */
    readonly data: OHLCTuple[];
    /** Replace all data. */
    setData(candles: CandleDataPoint[]): void;
    /** Append new candles to the end. */
    append(candles: CandleDataPoint[]): void;
    /** Update (replace) the last candle – used for the "forming" candle. */
    updateLast(candle: CandleDataPoint): void;
    /** Trim the store so it holds at most `maxCandles` entries (removes oldest). */
    trim(maxCandles: number): void;
    /** Number of candles. */
    readonly length: number;
}
export declare function createOHLCStore(initial?: CandleDataPoint[]): OHLCStore;
//# sourceMappingURL=OHLCStore.d.ts.map