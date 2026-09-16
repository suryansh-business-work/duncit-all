import type { Components, Theme } from '@mui/material/styles';
import type { ThemeCtx } from '../types';

/**
 * Tooltip. Always uses a surface that contrasts with the page: a dark tooltip
 * in light mode, and a light tooltip in dark mode (otherwise an ink tooltip on
 * an ink page would vanish). Small, tight and on the overlay shadow.
 */
export const tooltip = (c: ThemeCtx): Components<Theme>['MuiTooltip'] => {
  const fill = c.isDark ? c.white : c.ink;
  const onFill = c.isDark ? c.t.neutral[900] : c.white;
  return {
    styleOverrides: {
      tooltip: ({ theme }) => ({
        backgroundColor: fill,
        color: onFill,
        borderRadius: c.t.radius.sm,
        fontSize: c.t.font.size.tooltip,
        fontWeight: c.t.font.weight.medium,
        lineHeight: 1.4,
        padding: theme.spacing(0.5, 1),
        boxShadow: c.shadow.overlay,
      }),
      arrow: { color: fill },
    },
  };
};
