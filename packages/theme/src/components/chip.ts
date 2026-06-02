import type { Components, Theme } from '@mui/material/styles';
import type { ThemeCtx } from '../types';

/** Chip — small by default, accent fill for the primary variant. */
export const chip = (c: ThemeCtx): Components<Theme>['MuiChip'] => ({
  defaultProps: { size: 'small' },
  styleOverrides: {
    root: { borderRadius: c.t.radius.md, fontWeight: c.t.font.weight.medium, height: c.t.size.chipHeight, paddingInline: c.t.size.chipPadX },
    outlined: { borderColor: c.border, backgroundColor: c.surface },
    filledPrimary: { backgroundColor: c.primary, color: c.white },
  },
});
