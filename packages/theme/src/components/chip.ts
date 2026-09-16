import { alpha } from '@mui/material/styles';
import type { Components, Theme } from '@mui/material/styles';
import { softTone } from '../tone';
import type { ThemeCtx } from '../types';

type StatusColor = 'secondary' | 'success' | 'warning' | 'error' | 'info';
const STATUS_COLORS: readonly StatusColor[] = ['secondary', 'success', 'warning', 'error', 'info'];

/**
 * Chip — a compact label. A filled STATUS chip is a soft tint with the colour
 * as its text (AA on the tint, see `softTone`), which keeps a table full of
 * statuses calm; the primary filled chip stays the solid accent because it
 * usually marks a selection.
 */
export const chip = (c: ThemeCtx): Components<Theme>['MuiChip'] => {
  const { size, font, radius } = c.t;
  const statusVariants = STATUS_COLORS.map((color) => {
    const tone = softTone(c, c.semantic[color]);
    return {
      props: { variant: 'filled' as const, color },
      style: {
        backgroundColor: tone.bg,
        color: tone.fg,
        '& .MuiChip-icon, & .MuiChip-deleteIcon': { color: tone.fg },
        '&.MuiChip-clickable:hover': { backgroundColor: tone.border },
      },
    };
  });
  return {
    defaultProps: { size: 'small' },
    styleOverrides: {
      root: {
        borderRadius: radius.sm,
        fontWeight: font.weight.medium,
        fontSize: font.size.caption,
        paddingInline: size.chipPadX,
        transition: c.transition(['background-color', 'border-color'], c.t.motion.fast),
      },
      sizeSmall: { height: size.chipHeight },
      sizeMedium: { height: size.controlSm },
      outlined: { borderColor: c.border, backgroundColor: c.surface },
      icon: { fontSize: size.icon.sm },
      deleteIcon: { fontSize: size.icon.sm, color: c.muted, '&:hover': { color: c.ink } },
    },
    // `filledPrimary` is no longer a Chip class in MUI 9 — match on props instead.
    variants: [
      { props: { variant: 'filled', color: 'primary' }, style: { backgroundColor: c.primaryFill, color: c.white } },
      {
        props: { variant: 'filled', color: 'default' },
        style: { backgroundColor: alpha(c.ink, c.t.state.selected + c.t.state.hover), color: c.ink },
      },
      ...statusVariants,
    ],
  };
};
