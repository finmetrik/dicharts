import type { OHLCTuple } from '../types';
/**
 * Convert standard OHLC data to Heikin-Ashi candles.
 *
 * HA formulas:
 *   HA_Close = (O + H + L + C) / 4
 *   HA_Open  = (prev_HA_Open + prev_HA_Close) / 2  (first: (O + C) / 2)
 *   HA_High  = max(H, HA_Open, HA_Close)
 *   HA_Low   = min(L, HA_Open, HA_Close)
 */
export declare function toHeikinAshi(data: OHLCTuple[]): OHLCTuple[];
//# sourceMappingURL=HeikinAshi.d.ts.map