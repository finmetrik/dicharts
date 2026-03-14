import type { PlotArea, ResolvedChartOptions } from '../types';
/** Margin around the plot area in CSS pixels. */
export interface ChartMargins {
    top: number;
    right: number;
    bottom: number;
    left: number;
}
export interface ChartLayout {
    /** Total canvas size in CSS pixels. */
    cssWidth: number;
    cssHeight: number;
    /** Device‑pixel size. */
    pixelWidth: number;
    pixelHeight: number;
    /** DPR used. */
    dpr: number;
    /** Margins. */
    margins: ChartMargins;
    /** Plot area in CSS pixels. */
    plot: PlotArea;
    /** Plot area in device pixels (for scissor rects). */
    plotDevice: PlotArea;
}
export declare function computeLayout(cssWidth: number, cssHeight: number, dpr: number, options: ResolvedChartOptions): ChartLayout;
//# sourceMappingURL=Layout.d.ts.map