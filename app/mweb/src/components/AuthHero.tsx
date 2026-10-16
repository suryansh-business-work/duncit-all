import { useMemo, type ReactNode } from 'react';
import { Box, useMediaQuery } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { auth, radii } from '@duncit/auth-tokens';
import { useBrandingAssets } from '../hooks/useBrandingAssets';
import { useThemeTokens } from '../hooks/useThemeTokens';
import { buildTheme } from '../theme';

const { scrim } = auth.hero;
/** The ground's rounded lip that rises over the photo's darkened foot. */
const LIP = radii.xl;

const MEDIA_SX = {
  width: '100%',
  height: '100%',
  objectFit: 'cover' as const,
  display: 'block',
};

interface Props {
  /** The photo's clear height above the heading, in px. */
  room: number;
  /** The space under the heading before the ground's lip, in px. */
  gap: number;
  children: ReactNode;
}

/**
 * The admin-configured login image or video (Branding > Login background),
 * drawn full-bleed across the top with the auth heading ON it.
 *
 * In flow, not pinned behind the page: the band is as tall as the photo room
 * plus whatever the heading needs, so the heading can never slide off the
 * darkened part. The photo shows clear across `room`, darkens to
 * `auth.hero.scrim`, and the heading sits on that scrim drawn in the DARK
 * theme in both modes — which is what keeps "Welcome back!" and its subtitle
 * at AA over any photo (worked in the auth-tokens docs). Then the page ground
 * rises over the photo with rounded top corners.
 *
 * Muted + playsInline are what let a mobile browser autoplay the video at all;
 * a visitor who asked for reduced motion gets it held still (WCAG 2.2.2), the
 * same rule native follows. With both switches off the heading renders on the
 * flat ground in the active theme. Native twin: components/AuthBackground/AuthHero.
 */
export default function AuthHero({ room, gap, children }: Readonly<Props>) {
  const { loginBackgroundVideoUrl: videoUrl, loginBackgroundImageUrl: imageUrl } =
    useBrandingAssets();
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const palettes = useThemeTokens();
  const onPhoto = useMemo(() => buildTheme('dark', palettes.dark), [palettes]);

  if (!videoUrl && !imageUrl) return <>{children}</>;

  return (
    <Box
      data-testid="auth-hero"
      sx={{
        position: 'relative',
        // Full-bleed out of the centred auth column. Shifted with `left`, not a
        // margin: every auth screen renders this inside a MUI Stack, whose
        // `& > :not(style)` rule resets child margins to 0 and would leave the
        // band starting at the column's left edge.
        width: '100vw',
        left: 'calc(50% - 50vw)',
        overflow: 'hidden',
      }}
    >
      <Box aria-hidden sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {videoUrl ? (
          <Box
            component="video"
            data-testid="auth-backdrop-video"
            src={videoUrl}
            muted
            loop
            autoPlay={!reduceMotion}
            playsInline
            sx={MEDIA_SX}
          />
        ) : (
          <Box component="img" data-testid="auth-backdrop-image" src={imageUrl} alt="" sx={MEDIA_SX} />
        )}
      </Box>
      <Box
        aria-hidden
        data-testid="auth-hero-fade"
        sx={{
          position: 'relative',
          height: room,
          backgroundImage: `linear-gradient(180deg, ${scrim.clear} 0%, ${scrim.ground} 100%)`,
        }}
      />
      <ThemeProvider theme={onPhoto}>
        <Box sx={{ position: 'relative', bgcolor: scrim.ground, px: 2, pb: `${gap + LIP}px` }}>
          <Box sx={{ width: '100%', maxWidth: 420, mx: 'auto', px: 1 }}>{children}</Box>
        </Box>
      </ThemeProvider>
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: LIP,
          bgcolor: 'background.default',
          borderTopLeftRadius: `${LIP}px`,
          borderTopRightRadius: `${LIP}px`,
        }}
      />
    </Box>
  );
}
