import type { OHLCTuple } from '../types';
/**
 * Downsample an array of OHLC candles to approximately `target` entries.
 * Returns the original array if it's already small enough.
 */
export declare function downsampleOHLC(data: OHLCTuple[], target: number): OHLCTuple[];
//# sourceMappingURL=Sampler.d.ts.map