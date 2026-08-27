import IconButton, { type IconButtonProps } from '@mui/material/IconButton';
import { styled } from '@mui/material/styles';
import { pressFor, restStatesCss } from './state-css';

/**
 * Every icon button in mWeb and the portals — the same swap as `DuncitButton`,
 * with `IconButtonProps` forwarded unchanged.
 *
 * This is the case a pressed state matters most for: an icon button carries no
 * label, no fill and often no border, so the only thing confirming a tap landed
 * was a ripple that starts slower than a finger lifts. It presses harder than a
 * full button (`ghost`, not `control`) because a 40px target needs a larger
 * proportional move to read at all.
 */
export type DuncitIconButtonProps = IconButtonProps;

const Styled = styled(IconButton, { name: 'DuncitIconButton' })(({ theme }) => ({
  ...restStatesCss(theme),
  ...pressFor(theme, 'ghost', { tint: 'ink' }),
}));

/** See `DuncitButton` — the cast keeps the polymorphic `component` prop. */
export const DuncitIconButton = Styled as typeof IconButton;
