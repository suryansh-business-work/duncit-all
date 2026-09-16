import { alpha } from '@mui/material/styles';
import type { Components, Theme } from '@mui/material/styles';
import type { ThemeCtx } from '../types';

/** Text fields, the outlined input shell, labels and helper text. */
export const textField = (): Components<Theme>['MuiTextField'] => ({
  defaultProps: { variant: 'outlined', size: 'small' },
});

export const select = (c: ThemeCtx): Components<Theme>['MuiSelect'] => ({
  defaultProps: { size: 'small' },
  styleOverrides: { icon: { color: c.muted } },
});

/**
 * Paints the `required` asterisk in the danger colour so every required field
 * carries a clear red `Label *` marker (parity with the mobile app + mWeb).
 */
export const formLabel = (c: ThemeCtx): Components<Theme>['MuiFormLabel'] => ({
  styleOverrides: {
    root: { color: c.muted },
    asterisk: { color: c.semantic.error },
  },
});

export const formHelperText = (c: ThemeCtx): Components<Theme>['MuiFormHelperText'] => ({
  styleOverrides: {
    root: {
      marginTop: c.t.size.helperGap,
      fontSize: c.t.font.size.caption,
      lineHeight: 1.35,
      minHeight: '1.35em',
      overflowWrap: 'anywhere',
    },
  },
});

/**
 * Placeholder text is still text: MUI draws it at 42% of the input colour,
 * which is under 4.5:1 — it is painted in `muted` at full opacity instead.
 */
export const inputBase = (c: ThemeCtx): Components<Theme>['MuiInputBase'] => ({
  styleOverrides: {
    input: {
      '&::placeholder': { color: c.muted, opacity: 1 },
    },
  },
});

/**
 * The field outline is `inputBorder` (3:1, WCAG 1.4.11) rather than the hairline
 * divider colour. Hover strengthens it to `muted`; focus draws the accent edge
 * plus a soft ring outside it, so the focused field is findable at a glance.
 */
export const outlinedInput = (c: ThemeCtx): Components<Theme>['MuiOutlinedInput'] => {
  const ring = (color: string) => `0 0 0 3px ${alpha(color, c.t.state.ring)}`;
  return {
    styleOverrides: {
      root: {
        borderRadius: c.t.radius.sm,
        backgroundColor: c.surface,
        transition: c.transition(['box-shadow', 'background-color'], c.t.motion.fast),
        '& fieldset': {
          borderColor: c.inputBorder,
          transition: c.transition(['border-color'], c.t.motion.fast),
        },
        '&:hover fieldset': { borderColor: c.muted },
        '&.Mui-focused': { boxShadow: ring(c.primary) },
        '&.Mui-focused fieldset': { borderColor: c.primary, borderWidth: 1 },
        '&.Mui-error.Mui-focused': { boxShadow: ring(c.semantic.error) },
        '&.Mui-disabled': { backgroundColor: c.soft },
      },
    },
  };
};

/** Compact pill toggles, sized from the switch tokens. */
export const switchControl = (c: ThemeCtx): Components<Theme>['MuiSwitch'] => {
  const { md, sm, pad, inset } = c.t.size.switch;
  const geometry = (track: Readonly<{ width: number; height: number; thumb: number }>) => ({
    width: track.width + pad * 2,
    height: track.height + pad * 2,
    padding: pad,
    '& .MuiSwitch-switchBase': {
      padding: pad + inset,
      '&.Mui-checked': { transform: `translateX(${track.width - track.thumb - inset * 2}px)` },
    },
    '& .MuiSwitch-thumb': { width: track.thumb, height: track.thumb },
    '& .MuiSwitch-track': { borderRadius: track.height / 2 },
  });
  return {
    styleOverrides: {
      root: geometry(md),
      sizeSmall: geometry(sm),
      switchBase: {
        color: c.white,
        '&.Mui-checked': { color: c.white },
        '&.Mui-checked + .MuiSwitch-track': { backgroundColor: c.primaryFill, opacity: 1 },
        '&.Mui-disabled + .MuiSwitch-track': { opacity: 0.4 },
      },
      thumb: { boxShadow: c.shadow.raised },
      // The off track is the field outline colour: 3:1 against the page and
      // against the white thumb, so "off" is a visible state, not an absence.
      track: {
        backgroundColor: c.inputBorder,
        opacity: 1,
        transition: c.transition(['background-color'], c.t.motion.fast),
      },
    },
  };
};
