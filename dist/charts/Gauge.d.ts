export interface GaugeOptions {
    /** Current value. */
    value?: number;
    /** Minimum value (default 0). */
    min?: number;
    /** Maximum value (default 100). */
    max?: number;
    /** Main label displayed in center (e.g. "Fear & Greed"). */
    label?: string;
    /** Value label format function. Default shows the number. */
    formatValue?: (v: number) => string;
    /** Colour segments from left to right. */
    segments?: {
        color: string;
        from: number;
        to: number;
    }[];
    /** Track (unfilled) colour. Default dark grey. */
    trackColor?: string;
    /** Needle colour. Default white. */
    needleColor?: string;
    background?: string;
    textColor?: string;
    /** Arc thickness as fraction of radius (0–1, default 0.18). */
    thickness?: number;
}
export interface GaugeInstance {
    /** Set the current value and redraw. */
    setValue(value: number): void;
    setOptions(opts: Partial<GaugeOptions>): void;
    redraw(): void;
    resize(): void;
    dispose(): void;
}
export declare function createGauge(container: HTMLElement, options?: GaugeOptions): GaugeInstance;
//# sourceMappingURL=Gauge.d.ts.map