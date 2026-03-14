export interface RenderScheduler {
    /** Mark the chart as needing a re‑render on the next frame. */
    requestRender(): void;
    /** Start the RAF loop. */
    start(): void;
    /** Stop the RAF loop. */
    stop(): void;
    /** Whether the loop is currently running. */
    readonly running: boolean;
    /** Measured FPS (updated every ~500 ms). */
    readonly fps: number;
}
export declare function createScheduler(callback: (dt: number) => void): RenderScheduler;
//# sourceMappingURL=Scheduler.d.ts.map