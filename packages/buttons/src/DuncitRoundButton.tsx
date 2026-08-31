import { alpha, styled, type CSSObject, type Theme } from '@mui/material/styles';
import type { IconButtonProps } from '@mui/material/IconButton';
import { DuncitIconButton } from './DuncitIconButton';

/**
 * The background a round button sits on. `plain` is the bare button; the other
 * three are the three surfaces a close button actually lands on in mWeb — a
 * sheet header, a badge pinned to a thumbnail corner, and a photo.
 */
export type RoundButtonTone = 'plain' | 'surface' | 'paper' | 'overlay';

export interface DuncitRoundButtonProps extends IconButtonProps {
  tone?: RoundButtonTone;
}

/**
 * Outer diameter per MUI size, and the glyph that fits inside it. The pairs
 * match what the call sites already rendered — a 24px badge with a 14px cross,
 * a 36px header button with a 20px one — so adopting this changes the shape,
 * never the scale.
 */
const BOX = { small: 24, medium: 36, large: 44 } as const;
const GLYPH = { small: 14, medium: 20, large: 24 } as const;

type RoundSize = keyof typeof BOX;

const TONES: Record<RoundButtonTone, (theme: Theme) => CSSObject> = {
  plain: () => ({}),
  surface: (theme) => ({
    backgroundColor: theme.palette.action.hover,
    '&:hover': { backgroundColor: theme.palette.action.selected },
  }),
  paper: (theme) => ({
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
  }),
  overlay: (theme) => ({
    backgroundColor: alpha(theme.palette.common.black, 0.55),
    color: theme.palette.common.white,
    '&:hover': { backgroundColor: alpha(theme.palette.common.black, 0.75) },
  }),
};

/**
 * A round icon button that is round whatever it is put next to — the shape mWeb
 * uses for every close/dismiss control that carries a background.
 *
 * `DuncitIconButton` already draws a circle when nothing disturbs it, and three
 * things routinely do. Its padding is added to the glyph, so a call site that
 * also pinned a width (a 24px badge over a thumbnail) left the icon with less
 * room than it needs — an SVG is a flex item, so it squashed on the main axis
 * and spilled over the top and bottom of the circle it was meant to sit inside.
 * A theme that rounds icon buttons by radius rather than by `50%` only draws a
 * circle while the box happens to be square. And a button in a flex row can be
 * squeezed narrower than it is tall.
 *
 * So the box is fixed square at the size, the padding is gone, the radius is
 * `50%` rather than a large number, the glyph is sized to fit inside, and
 * neither the button nor the icon may shrink. There is nothing left for a call
 * site's `sx` (position, offsets, colour) to disturb.
 */
export const DuncitRoundButton = styled(DuncitIconButton, {
  name: 'DuncitRoundButton',
  shouldForwardProp: (prop) => prop !== 'tone',
})<DuncitRoundButtonProps>(({ theme, size, tone }) => {
  const key = (size ?? 'medium') as RoundSize;
  const box = BOX[key];
  return {
    boxSizing: 'border-box',
    flexShrink: 0,
    padding: 0,
    width: box,
    height: box,
    minWidth: box,
    minHeight: box,
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    '& > svg': { fontSize: GLYPH[key], flexShrink: 0 },
    ...TONES[tone ?? 'plain'](theme),
  };
});
