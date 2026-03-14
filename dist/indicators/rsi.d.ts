import type { OHLCTuple } from '../types';
/**
 * Compute RSI using the Wilder smoothing method.
 * Returns an array of [timestamp, rsi] pairs.
 * @param period Typically 14.
 */
export declare function computeRSI(data: OHLCTuple[], period?: number): [number, number][];
//# sourceMappingURL=rsi.d.ts.map