import type { OHLCTuple } from '../types';
export interface BollingerResult {
    upper: [number, number][];
    middle: [number, number][];
    lower: [number, number][];
}
/**
 * Compute Bollinger Bands.
 * @param period  SMA period (typically 20).
 * @param stdDev  Standard deviation multiplier (typically 2).
 */
export declare function computeBollinger(data: OHLCTuple[], period?: number, stdDev?: number): BollingerResult;
//# sourceMappingURL=bollinger.d.ts.map