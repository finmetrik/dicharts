import type { CandleDataPoint, CandleHit } from '../types';
import type { LinearScale } from '../scene/Scale';
/**
 * Find the candle at the given CSS pixel position.
 *
 * @param data     Visible data slice.
 * @param offset   Index offset of the visible slice within the full dataset.
 * @param cssX     Pointer X in CSS pixels (canvas‑relative).
 * @param cssY     Pointer Y in CSS pixels (canvas‑relative).
 * @param xScale   Current x (time) scale.
 * @param yScale   Current y (price) scale.
 * @param bodyWidthPx  Body width in CSS pixels.
 */
export declare function findCandleAtPoint(data: CandleDataPoint[], offset: number, cssX: number, cssY: number, xScale: LinearScale, yScale: LinearScale, bodyWidthPx: number): CandleHit | null;
//# sourceMappingURL=HitTest.d.ts.map