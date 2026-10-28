import { Box, Portal } from '@mui/material';
import type { LiteEventThemeKey, LiteThemeAccent } from '../../../shared/graphql/documents';
import { tint } from '../../../shared/theme';
import { ACCENT_COLORS, BADGE_TINTS, LITE_SCHEMES } from '../../../shared/tokens';

/** The CSS background each theme paints, from the accent and the scheme's glow. Pure, so it is easy to test. */
export function themeBackground(key: LiteEventThemeKey, accent: LiteThemeAccent): string {
  const color = ACCENT_COLORS[accent];
  const glow = LITE_SCHEMES.dark.glow;
  switch (key) {
    case 'GRADIENT':
      return `linear-gradient(160deg, ${tint(color, 0.38)} 0%, ${tint(glow, 0.22)} 45%, transparent 85%)`;
    case 'AMBIENT':
      return [
        `radial-gradient(circle at 12% 22%, ${tint(color, 0.32)} 0, transparent 18%)`,
        `radial-gradient(circle at 78% 14%, ${tint(color, 0.26)} 0, transparent 22%)`,
        `radial-gradient(circle at 62% 64%, ${tint(color, 0.2)} 0, transparent 20%)`,
        `radial-gradient(circle at 24% 78%, ${tint(glow, 0.22)} 0, transparent 24%)`,
      ].join(', ');
    case 'PATTERN':
      return `radial-gradient(${tint(color, 0.28)} 1.5px, transparent 1.6px) 0 0 / 22px 22px, linear-gradient(180deg, ${tint(color, 0.14)}, transparent 70%)`;
    case 'CONFETTI':
      return BADGE_TINTS.map((c, i) => `radial-gradient(circle at ${(i * 37) % 100}% ${(i * 53) % 100}%, ${tint(c, 0.45)} 0 3px, transparent 4px)`)
        .concat(`linear-gradient(180deg, ${tint(color, 0.16)}, transparent 75%)`)
        .join(', ');
    default:
      return `linear-gradient(180deg, ${tint(color, 0.16)}, transparent 60%)`;
  }
}

/**
 * The page behind an event (and behind the create form, as a live preview):
 * fixed to the viewport, behind everything, decorative only. AMBIENT drifts
 * slowly; reduced motion holds it still.
 *
 * Portalled to <body>: the page container keeps a transform from its entrance
 * animation, and a transformed ancestor becomes the box a fixed element is
 * placed in, which clipped the theme to the 1040px column.
 */
export function EventThemeBackdrop({ themeKey, accent }: Readonly<{ themeKey: LiteEventThemeKey; accent: LiteThemeAccent }>) {
  return (
    <Portal>
      <Box
        aria-hidden
        data-lite-animate
        data-testid="event-theme-backdrop"
        data-theme-key={themeKey}
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: -1,
          pointerEvents: 'none',
          background: themeBackground(themeKey, accent),
          filter: themeKey === 'AMBIENT' ? 'blur(12px)' : undefined,
          animation: themeKey === 'AMBIENT' ? 'lite-float 14s ease-in-out infinite' : undefined,
          transition: 'background 400ms ease',
        }}
      />
    </Portal>
  );
}
