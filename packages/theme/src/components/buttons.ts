import { alpha } from '@mui/material/styles';
import type { Components, Theme } from '@mui/material/styles';
import type { ThemeCtx } from '../types';

/**
 * Button + IconButton.
 *
 * Three weights, as a workspace uses them:
 * - `contained` primary is THE action — the AA accent fill under white.
 * - `outlined` is the secondary action — neutral ink on the surface with a
 *   quiet edge, so a row of buttons has one colour in it, not three.
 * - `text` is the tertiary / inline action.
 *
 * Heights come from the control scale (28 / 32 / 40), so a button, a select
 * and a chip in one toolbar line up.
 */
export const button = (c: ThemeCtx): Components<Theme>['MuiButton'] => {
  const { size, font, radius } = c.t;
  const edge = alpha(c.ink, c.t.state.outline);
  return {
    defaultProps: { disableElevation: true },
    styleOverrides: {
      root: {
        borderRadius: radius.sm,
        minHeight: size.controlMd,
        paddingInline: size.buttonPadX,
        paddingBlock: size.buttonPadY,
        fontWeight: font.weight.medium,
        lineHeight: 1.2,
        minWidth: 0,
        whiteSpace: 'nowrap',
      },
      sizeSmall: {
        minHeight: size.controlSm,
        paddingInline: size.buttonPadX - 2,
        paddingBlock: size.buttonPadY - 2,
        fontSize: font.size.caption,
      },
      sizeLarge: {
        minHeight: size.controlLg,
        paddingInline: size.buttonLgPadX,
        paddingBlock: size.buttonLgPadY,
        fontSize: font.size.buttonLg,
      },
      startIcon: { '& > *:nth-of-type(1)': { fontSize: size.icon.sm } },
      endIcon: { '& > *:nth-of-type(1)': { fontSize: size.icon.sm } },
    },
    // MUI 9 dropped the `<variant><Color>` style slots (containedPrimary and
    // friends) from the class list, so the same rules are expressed as variants
    // matched on props. Same output, and it no longer hard-codes a class name.
    variants: [
      {
        props: { variant: 'contained', color: 'primary' },
        style: {
          backgroundColor: c.primaryFill,
          color: c.white,
          boxShadow: c.shadow.raised,
          '&:hover': { backgroundColor: c.primaryHover, boxShadow: c.shadow.raised },
          '&:active': { backgroundColor: c.primaryActive },
        },
      },
      {
        props: { variant: 'outlined', color: 'primary' },
        style: {
          borderColor: edge,
          color: c.ink,
          backgroundColor: c.surface,
          boxShadow: c.shadow.raised,
          '&:hover': { borderColor: alpha(c.ink, c.t.state.outline * 2), backgroundColor: c.soft },
        },
      },
      {
        props: { variant: 'text', color: 'primary' },
        style: { '&:hover': { backgroundColor: alpha(c.primary, c.t.state.selected) } },
      },
    ],
  };
};

/** Icon buttons are quiet until pointed at: muted glyph, ink + tint on hover. */
export const iconButton = (c: ThemeCtx): Components<Theme>['MuiIconButton'] => ({
  styleOverrides: {
    root: { borderRadius: c.t.radius.sm },
    sizeSmall: ({ theme }) => ({ padding: theme.spacing(0.5) }),
    sizeMedium: ({ theme }) => ({ padding: theme.spacing(0.75) }),
  },
  variants: [
    {
      props: { color: 'default' },
      style: { color: c.muted, '&:hover': { color: c.ink, backgroundColor: c.hover } },
    },
  ],
});
