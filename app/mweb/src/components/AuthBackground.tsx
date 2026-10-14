import { Box, useMediaQuery, useTheme } from '@mui/material';
import { auth } from '@duncit/auth-tokens';
import AuthModeToggle from './AuthModeToggle';
import { useBrandingAssets } from '../hooks/useBrandingAssets';

interface Props {
  children: React.ReactNode;
}

/** Auth screens scroll inside this fixed frame, so the app-install bar (fixed to
 * the viewport) would cover their last rows without this extra bottom room. */
const BANNER_OFFSET = 'var(--duncit-app-banner-offset, 0px)';

const HERO_HEIGHT = auth.hero.height;
/** Where the logo and heading start: over the hero's lower half. */
const CONTENT_START = Math.round(HERO_HEIGHT * auth.hero.contentStart);

/**
 * The admin-configured login image or video (Branding > Login background),
 * drawn as a hero across the top that fades into the page ground.
 *
 * Its own component so the frame below stays one Box with one sx: a video and
 * an image need different elements. Muted + playsInline are what let a mobile
 * browser autoplay it at all; a visitor who asked for reduced motion gets the
 * video held still (WCAG 2.2.2), the same rule native follows.
 */
function AuthHero({ videoUrl, imageUrl }: Readonly<{ videoUrl: string; imageUrl: string }>) {
  const theme = useTheme();
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const fade = theme.palette.mode === 'dark' ? auth.hero.dark : auth.hero.light;
  const media = {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
    display: 'block',
  };

  /*
    Negative z-index rather than a wrapper around the children: a positioned
    element with z-index 0 paints ABOVE the in-flow content. Below zero it
    paints over the frame's ground and under everything in flow.
  */
  return (
    <Box
      data-testid="auth-hero"
      aria-hidden
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: HERO_HEIGHT,
        zIndex: -1,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {videoUrl ? (
        <Box
          component="video"
          data-testid="auth-backdrop-video"
          src={videoUrl}
          muted
          loop
          autoPlay={!reduceMotion}
          playsInline
          sx={media}
        />
      ) : (
        <Box component="img" data-testid="auth-backdrop-image" src={imageUrl} alt="" sx={media} />
      )}
      <Box
        data-testid="auth-hero-fade"
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `linear-gradient(180deg, ${fade.clear} 0%, ${fade.clear} ${auth.hero.fadeStart * 100}%, ${fade.ground} 100%)`,
        }}
      />
    </Box>
  );
}

export default function AuthBackground({ children }: Readonly<Props>) {
  const theme = useTheme();
  const { loginBackgroundVideoUrl, loginBackgroundImageUrl } = useBrandingAssets();
  const hasHero = Boolean(loginBackgroundVideoUrl || loginBackgroundImageUrl);

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        justifyContent: 'center',
        // With a hero the column starts over its lower half; without one the
        // calm ground keeps the form centred.
        alignItems: hasHero ? 'flex-start' : 'safe center',
        pt: hasHero ? `${CONTENT_START}px` : { xs: 2, sm: 4 },
        pb: {
          xs: `calc(${theme.spacing(2)} + ${BANNER_OFFSET})`,
          sm: `calc(${theme.spacing(4)} + ${BANNER_OFFSET})`,
        },
        px: 2,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        // The ground: one flat token colour, the same one native paints, and
        // the colour the hero fades into.
        bgcolor: 'background.default',
      }}
    >
      {hasHero && <AuthHero videoUrl={loginBackgroundVideoUrl} imageUrl={loginBackgroundImageUrl} />}
      {/*
        The card and the light/dark switch stack; the frame outside stays a row
        so its centring is untouched. The switch is the last thing on the page
        because a signed-out person has no sidebar to reach the other one.
      */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
        }}
      >
        {children}
        <AuthModeToggle />
      </Box>
    </Box>
  );
}
