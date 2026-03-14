import type { OHLCTuple } from '../types';
export interface Tick {
    timestamp: number;
    price: number;
    volume?: number;
}
export interface TickAggregator {
    /**
     * Process a single tick.
     * Returns the completed candle when a new period starts, otherwise `null`.
     */
    processTick(tick: Tick): OHLCTuple | null;
    /** The candle currently being formed. */
    currentCandle(): OHLCTuple | null;
    /** Change the aggregation interval (resets state). */
    setInterval(intervalMs: number): void;
    /** Reset internal state. */
    reset(): void;
}
export declare function createTickAggregator(intervalMs: number): TickAggregator;
//# sourceMappingURL=TickAggregator.d.ts.map