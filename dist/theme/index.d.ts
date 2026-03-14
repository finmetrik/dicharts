import type { ThemeId } from '../types';
import { darkTheme } from './dark';
import { lightTheme } from './light';
export interface ChartTheme {
    background: string;
    gridColor: string;
    axisTextColor: string;
    axisBorderColor: string;
    crosshairColor: string;
    tooltipBackground: string;
    tooltipBorder: string;
    tooltipText: string;
    candleUpColor: string;
    candleDownColor: string;
    candleUpBorderColor: string;
    candleDownBorderColor: string;
    /** Primary text colour (used in sub-pane labels etc.). */
    textColor: string;
    /** Secondary text colour (muted). */
    textSecondary: string;
}
export declare function resolveTheme(id: ThemeId): ChartTheme;
export { darkTheme, lightTheme };
//# sourceMappingURL=index.d.ts.map