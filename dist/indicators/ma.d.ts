import type { OHLCTuple } from '../types';
/**
 * Simple Moving Average.
 * Returns an array of [timestamp, sma] pairs.
 * The first `period - 1` entries are omitted (not enough data).
 */
export declare function computeSMA(data: OHLCTuple[], period: number, source?: 'close' | 'open' | 'high' | 'low'): [number, number][];
/**
 * Exponential Moving Average.
 * Returns an array of [timestamp, ema] pairs.
 */
export declare function computeEMA(data: OHLCTuple[], period: number, source?: 'close' | 'open' | 'high' | 'low'): [number, number][];
//# sourceMappingURL=ma.d.ts.map