import type { Components, Theme } from '@mui/material/styles';
import type { ThemeCtx } from '../types';

/** Text fields, the outlined input shell and helper text. */
export const textField = (): Components<Theme>['MuiTextField'] => ({
  defaultProps: { variant: 'outlined', size: 'small' },
});

export const select = (): Components<Theme>['MuiSelect'] => ({
  defaultProps: { size: 'small' },
});

/**
 * Paints the `required` asterisk in the danger colour so every required field
 * carries a clear red `Label *` marker (parity with the mobile app + mWeb).
 */
export const formLabel = (c: ThemeCtx): Components<Theme>['MuiFormLabel'] => ({
  styleOverrides: { asterisk: { color: c.semantic.error } },
});

export const formHelperText = (c: ThemeCtx): Components<Theme>['MuiFormHelperText'] => ({
  styleOverrides: {
    root: { marginTop: c.t.size.helperGap, lineHeight: 1.35, minHeight: '1.35em', overflowWrap: 'anywhere' },
  },
});

/**
 * The field outline is `inputBorder` (3:1, WCAG 1.4.11) rather than the hairline
 * divider colour, and hover strengthens it to ink instead of fading it.
 */
export const outlinedInput = (c: ThemeCtx): Components<Theme>['MuiOutlinedInput'] => ({
  styleOverrides: {
    root: {
      borderRadius: c.t.radius.sm,
      backgroundColor: c.surface,
      '& fieldset': { borderColor: c.inputBorder },
      '&:hover fieldset': { borderColor: c.ink },
      '&.Mui-focused fieldset': { borderColor: c.primary, borderWidth: 1.5 },
    },
  },
});
