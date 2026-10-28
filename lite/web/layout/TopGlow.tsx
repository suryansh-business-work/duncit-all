import { Box } from '@mui/material';
import { tint } from '../../shared/theme';
import { LITE_SCHEMES } from '../../shared/tokens';

const glow = (strength: number) => `radial-gradient(80% 100% at 50% 0%, ${tint(LITE_SCHEMES.dark.glow, strength)}, transparent 70%)`;

/**
 * The soft violet glow behind the header that the whole app sits under, from
 * the scheme's `glow` token — fainter on the light page. Purely decorative.
 */
export function TopGlow() {
  return (
    <Box
      aria-hidden
      sx={(theme) => ({
        position: 'absolute',
        insetInline: 0,
        top: 0,
        height: 320,
        pointerEvents: 'none',
        zIndex: 0,
        background: glow(0.22),
        ...theme.applyStyles('light', { background: glow(0.1) }),
      })}
    />
  );
}
