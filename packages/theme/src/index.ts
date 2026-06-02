/**
 * @duncit/theme — the shared Duncit console design system.
 *
 * Single source of truth for colours, fonts, sizes and every MUI component
 * style. Consumed by every portal (except mWeb + the public websites) so the
 * look stays consistent; only the brand `accent` differs per portal.
 */
export { tokens, type Tokens } from './tokens';
export type { AccentColors, ColorMode, ThemeCtx } from './types';
export { buildThemeCtx } from './context';
export { createDuncitTheme, buildTheme } from './createDuncitTheme';
export { buildComponents, type ComponentExtend } from './components';
export { DuncitThemeProvider, useColorMode } from './DuncitThemeProvider';
