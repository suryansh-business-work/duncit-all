/**
 * Theme — delegated to the shared @duncit/theme design system with Admin's blue
 * brand accent. All colours, fonts, sizes and component styles live in
 * @duncit/theme.
 */
import type { PaletteMode } from '@mui/material';
import { createDuncitTheme, tokens, type AccentColors } from '@duncit/theme';

export { tokens };

const ADMIN_ACCENT: AccentColors = { light: '#60a5fa', main: '#2563eb', hover: '#1d4ed8', active: '#1e40af' };

export const buildTheme = (mode: PaletteMode = 'light') => createDuncitTheme(mode, ADMIN_ACCENT);
