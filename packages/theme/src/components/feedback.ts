import { alpha } from '@mui/material/styles';
import type { Components, Theme } from '@mui/material/styles';
import { softTone } from '../tone';
import type { ThemeCtx } from '../types';

type Severity = 'info' | 'success' | 'warning' | 'error';
const SEVERITIES: readonly Severity[] = ['info', 'success', 'warning', 'error'];

/**
 * Alerts: the severity's soft tint with a matching edge, ink body text and the
 * icon in the severity colour (AA on the tint, see `softTone`).
 */
export const alert = (c: ThemeCtx): Components<Theme>['MuiAlert'] => ({
  styleOverrides: {
    root: {
      borderRadius: c.t.radius.md,
      fontSize: c.t.font.size.body2,
      alignItems: 'flex-start',
    },
    icon: { '& .MuiSvgIcon-root': { fontSize: c.t.size.icon.md + 2 } },
    message: { overflowWrap: 'anywhere' },
  },
  // MUI 9 removed the `standard<Severity>` slots; the same four tints are now
  // keyed off the variant + severity pair the component actually renders with.
  variants: SEVERITIES.map((severity) => {
    const tone = softTone(c, c.semantic[severity]);
    return {
      props: { variant: 'standard' as const, severity },
      style: {
        backgroundColor: tone.bg,
        border: `1px solid ${tone.border}`,
        color: c.ink,
        '& .MuiAlert-icon': { color: tone.fg },
      },
    };
  }),
});

export const alertTitle = (c: ThemeCtx): Components<Theme>['MuiAlertTitle'] => ({
  styleOverrides: {
    root: { fontSize: c.t.font.size.body2, fontWeight: c.t.font.weight.semibold },
  },
});

export const avatar = (c: ThemeCtx): Components<Theme>['MuiAvatar'] => ({
  styleOverrides: { root: { fontWeight: c.t.font.weight.semibold } },
});

export const skeleton = (c: ThemeCtx): Components<Theme>['MuiSkeleton'] => ({
  styleOverrides: {
    root: { backgroundColor: alpha(c.ink, c.t.state.selected) },
    rounded: { borderRadius: c.t.radius.sm },
  },
});

export const linearProgress = (c: ThemeCtx): Components<Theme>['MuiLinearProgress'] => ({
  styleOverrides: {
    root: { borderRadius: c.t.radius.xs, backgroundColor: alpha(c.ink, c.t.state.selected) },
    bar: { borderRadius: c.t.radius.xs },
  },
});
