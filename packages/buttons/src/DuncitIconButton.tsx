import IconButton, { type IconButtonProps } from '@mui/material/IconButton';
import { styled } from '@mui/material/styles';
import { pressFor, restStatesCss } from './state-css';
import { useAsyncClick } from './useAsyncClick';

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

/**
 * An icon button needs the waiting state more than any other control: it is the
 * refresh, the retry and the row-level delete, and it carries no label that
 * could have said "…ing" instead. See `useAsyncClick`.
 */
function AsyncIconButton({ onClick, loading, ...rest }: Readonly<IconButtonProps>) {
  const asyncClick = useAsyncClick(onClick, loading);
  return <Styled {...rest} onClick={asyncClick.onClick} loading={asyncClick.loading} />;
}

/** See `DuncitButton` — the cast keeps the polymorphic `component` prop. */
export const DuncitIconButton = AsyncIconButton as unknown as typeof IconButton;
