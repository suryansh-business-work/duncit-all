/**
 * Theme — delegated to the shared @duncit/theme design system with the Partners
 * App's red brand accent. All colours, fonts, sizes and component styles live
 * in @duncit/theme.
 */
import type { PaletteMode } from '@mui/material';
import { createDuncitTheme, tokens, type AccentColors } from '@duncit/theme';

export { tokens };

const PARTNERS_ACCENT: AccentColors = { light: '#ff7575', main: '#ff5757', hover: '#f03e3e', active: '#d92d2d' };

export const buildTheme = (mode: PaletteMode = 'light') => createDuncitTheme(mode, PARTNERS_ACCENT);
