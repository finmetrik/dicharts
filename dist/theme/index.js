import { darkTheme } from './dark';
import { lightTheme } from './light';
const themes = {
    dark: darkTheme,
    light: lightTheme,
};
export function resolveTheme(id) {
    return themes[id];
}
export { darkTheme, lightTheme };
//# sourceMappingURL=index.js.map