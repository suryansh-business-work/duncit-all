import { alpha } from '@mui/material/styles';
import type { Components, Theme } from '@mui/material/styles';
import type { ThemeCtx } from '../types';

/**
 * Tooltip. Always uses a surface that contrasts with the page: a dark tooltip
 * in light mode, and a light tooltip in dark mode (otherwise an ink tooltip on
 * an ink page would vanish).
 */
export const tooltip = (c: ThemeCtx): Components<Theme>['MuiTooltip'] => {
  const fill = c.isDark ? c.white : c.ink;
  const onFill = c.isDark ? c.t.neutral[900] : c.white;
  return {
    styleOverrides: {
      tooltip: {
        backgroundColor: fill,
        color: onFill,
        borderRadius: c.t.radius.sm,
        fontSize: c.t.font.size.tooltip,
        fontWeight: c.t.font.weight.medium,
        boxShadow: `0 4px 12px ${alpha(c.t.common.black, c.isDark ? 0.4 : 0.18)}`,
      },
      arrow: { color: fill },
    },
  };
};
