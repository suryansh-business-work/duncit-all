import type { Components, Theme } from '@mui/material/styles';
import type { ThemeCtx } from '../types';

/**
 * Tooltip. Always uses a surface that contrasts with the page: a dark tooltip
 * in light mode, and a light tooltip in dark mode (otherwise an ink tooltip on
 * an ink page would vanish).
 */
export const tooltip = (c: ThemeCtx): Components<Theme>['MuiTooltip'] => {
  const fill = c.isDark ? c.white : c.ink;
  const text = c.isDark ? c.ink : c.white;
  return {
    styleOverrides: {
      tooltip: {
        backgroundColor: fill,
        color: text,
        border: c.isDark ? `1px solid ${c.border}` : 'none',
        borderRadius: c.t.radius.sm,
        fontSize: c.t.font.size.tooltip,
        fontWeight: c.t.font.weight.medium,
        boxShadow: c.isDark ? '0 4px 12px rgba(0,0,0,0.3)' : 'none',
      },
      arrow: { color: fill },
    },
  };
};
