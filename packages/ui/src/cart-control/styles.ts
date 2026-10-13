import { keyframes, type SxProps, type Theme } from '@mui/material/styles';
import { TOUCH_TARGET } from '@duncit/buttons';

/**
 * Outer height per size, and the glyph that fits inside it. `medium` is the
 * 36px round button a product card already carried; `small` is for a dense row
 * (a cart line, a menu dish).
 */
export const CART_CONTROL_SIZES = {
  small: { box: 32, glyph: 18 },
  medium: { box: 36, glyph: 20 },
} as const;

export type CartControlSize = keyof typeof CART_CONTROL_SIZES;

const REDUCED_MOTION = '@media (prefers-reduced-motion: reduce)';

/** The minus and the count arrive rather than pop: the pill grows by their width. */
const appear = keyframes({ from: { opacity: 0 }, to: { opacity: 1 } });

const APPEAR_SX = {
  animation: (theme: Theme) =>
    `${appear} ${theme.transitions.duration.shortest}ms ${theme.transitions.easing.easeOut}`,
  [REDUCED_MOTION]: { animation: 'none' },
} as const;

/**
 * The shell both modes share. It is always there and always the same height, so
 * the "+" keeps its place (and its focus) when the pill opens around it — only
 * the outline, the ground and the width change.
 */
export function shellSx(size: CartControlSize, stepper: boolean): SxProps<Theme> {
  const { box } = CART_CONTROL_SIZES[size];
  return {
    display: 'inline-flex',
    alignItems: 'center',
    flexShrink: 0,
    boxSizing: 'border-box',
    height: box,
    border: 1,
    borderColor: stepper ? 'primary.main' : 'transparent',
    borderRadius: `${box / 2}px`,
    bgcolor: stepper ? 'background.paper' : 'transparent',
    transition: (theme) =>
      theme.transitions.create(['border-color', 'background-color'], {
        duration: theme.transitions.duration.shortest,
      }),
    [REDUCED_MOTION]: { transition: 'none' },
  };
}

/**
 * One round button. `filled` is the lone "+"; inside the pill every button is
 * bare and takes the brand colour as ink.
 *
 * The explicit `minHeight` is what keeps the drawn circle its size on a phone:
 * the themes give every button a 44px minimum under `pointer: coarse`, and a
 * minimum clamps whatever `height` says. The 44px still holds — the `::after`
 * extends the hit area past the circle without moving anything around it.
 */
export function buttonSx(size: CartControlSize, filled: boolean): SxProps<Theme> {
  const { box, glyph } = CART_CONTROL_SIZES[size];
  return {
    width: box,
    height: box,
    minWidth: box,
    minHeight: box,
    // Sits over the shell's 1px outline, so the lone "+" is the full circle.
    m: '-1px',
    color: 'primary.main',
    '& > svg': { fontSize: glyph },
    ...(filled && {
      bgcolor: 'primary.main',
      color: 'primary.contrastText',
      '&:hover': { bgcolor: 'primary.dark' },
      '&.Mui-disabled': { bgcolor: 'action.disabledBackground', color: 'action.disabled' },
    }),
    '&[aria-disabled="true"]': { cursor: 'progress' },
    '@media (pointer: coarse)': {
      '&::after': { content: '""', position: 'absolute', inset: `${(box - TOUCH_TARGET) / 2}px` },
    },
    ...(!filled && APPEAR_SX),
  };
}

export function countSx(size: CartControlSize): SxProps<Theme> {
  const { glyph } = CART_CONTROL_SIZES[size];
  return {
    minWidth: glyph + 6,
    px: 0.5,
    textAlign: 'center',
    fontWeight: 700,
    lineHeight: 1,
    color: 'text.primary',
    fontVariantNumeric: 'tabular-nums',
    userSelect: 'none',
    ...APPEAR_SX,
  };
}

/**
 * The notice over the card's image. `grey.900` under `common.white` is dark in
 * both modes (MUI's grey scale does not flip), which is what a label lying on a
 * photograph needs — and clears AA by a wide margin.
 */
export function noticeSx(shown: boolean): SxProps<Theme> {
  return {
    position: 'absolute',
    top: (theme) => theme.spacing(1),
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1,
    maxWidth: (theme) => `calc(100% - ${theme.spacing(2)})`,
    pointerEvents: 'none',
    bgcolor: 'grey.900',
    color: 'common.white',
    fontWeight: 600,
    opacity: shown ? 1 : 0,
    transition: (theme) =>
      theme.transitions.create('opacity', { duration: theme.transitions.duration.shortest }),
    [REDUCED_MOTION]: { transition: 'none' },
  };
}
