import type { OHLCTuple } from '../types';
export interface MACDResult {
    /** MACD line = EMA(fast) - EMA(slow). */
    macd: [number, number][];
    /** Signal line = EMA of MACD. */
    signal: [number, number][];
    /** Histogram = MACD - Signal. */
    histogram: [number, number][];
}
/**
 * Compute MACD.
 * @param fastPeriod  Typically 12.
 * @param slowPeriod  Typically 26.
 * @param signalPeriod  Typically 9.
 */
export declare function computeMACD(data: OHLCTuple[], fastPeriod?: number, slowPeriod?: number, signalPeriod?: number): MACDResult;
//# sourceMappingURL=macd.d.ts.map