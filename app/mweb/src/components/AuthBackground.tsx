import { Box, keyframes, useTheme } from '@mui/material';
import { auth } from '@duncit/auth-tokens';
import AuthModeToggle from './AuthModeToggle';
import { useBrandingAssets } from '../hooks/useBrandingAssets';

const gradientShift = keyframes`
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;
interface Props {
  children: React.ReactNode;
}

/** Auth screens scroll inside this fixed frame, so the app-install bar (fixed to
 * the viewport) would cover their last rows without this extra bottom room. */
const BANNER_OFFSET = 'var(--duncit-app-banner-offset, 0px)';

/**
 * The admin-configured backdrop, drawn under the card and over the gradient.
 *
 * Its own component so the gradient frame below stays one Box with one sx: a
 * video and an image need different elements, and branching inside that sx was
 * how the frame would end up rendering neither properly. Muted + playsInline
 * are what let a mobile browser autoplay it at all.
 */
function BrandBackdrop({ videoUrl, imageUrl }: Readonly<{ videoUrl: string; imageUrl: string }>) {
  /*
    Negative z-index rather than a wrapper around the children: a positioned
    element with z-index 0 paints ABOVE the in-flow card, and wrapping the card
    to out-rank it would make it a flex item and lose the centring the frame
    does. Below zero it paints over the frame's gradient and under everything
    in flow, which is exactly the layer a backdrop wants.
  */
  const cover = {
    position: 'absolute' as const,
    inset: 0,
    zIndex: -1,
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
    pointerEvents: 'none' as const,
    // How much of the admin's frame survives under the fog. Shared with native
    // so both apps dim it by the same amount (rule 27).
    opacity: auth.fog.mediaOpacity,
  };
  if (videoUrl) {
    return <Box component="video" src={videoUrl} muted loop autoPlay playsInline sx={cover} />;
  }
  return <Box component="img" src={imageUrl} alt="" sx={cover} />;
}

/**
 * The theme-following haze over the backdrop. Its own component so the numbers
 * are read in one place and the gradient string stays out of the frame's sx.
 */
function FogLayer({ isDark }: Readonly<{ isDark: boolean }>) {
  const fog = isDark ? auth.fog.dark : auth.fog.light;
  const near = `${auth.fog.edgeStop * 100}%`;
  const far = `${(1 - auth.fog.edgeStop) * 100}%`;
  // The four stops as a list rather than one long template: the middle two are
  // the same colour at zero alpha, which is what keeps the centre of the frame
  // clear while the edges thicken.
  const stops = [
    `${fog.edge} 0%`,
    `${fog.clear} ${near}`,
    `${fog.clear} ${far}`,
    `${fog.edge} 100%`,
  ].join(', ');

  return (
    <Box
      data-testid="auth-backdrop-fog"
      sx={{
        position: 'absolute',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
        backgroundColor: fog.veil,
        backgroundImage: `linear-gradient(180deg, ${stops})`,
      }}
    />
  );
}

export default function AuthBackground({ children }: Readonly<Props>) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { loginBackgroundVideoUrl, loginBackgroundImageUrl } = useBrandingAssets();
  const backdrop = loginBackgroundVideoUrl || loginBackgroundImageUrl;

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'safe center',
        py: { xs: 2, sm: 4 },
        pb: {
          xs: `calc(${theme.spacing(2)} + ${BANNER_OFFSET})`,
          sm: `calc(${theme.spacing(4)} + ${BANNER_OFFSET})`,
        },
        px: 2,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        background: isDark
          ? `linear-gradient(120deg, ${auth.bgGradient.dark[0]} 0%, ${auth.bgGradient.dark[1]} 48%, ${auth.bgGradient.dark[2]} 100%)`
          : `linear-gradient(120deg, ${auth.bgGradient.light[0]} 0%, ${auth.bgGradient.light[1]} 46%, ${auth.bgGradient.light[2]} 100%)`,
        backgroundSize: '300% 300%',
        animation: `${gradientShift} 18s ease infinite`,
        '&:before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background:
            isDark
              ? 'linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(0deg, rgba(255,255,255,0.025) 1px, transparent 1px)'
              : 'linear-gradient(90deg, rgba(33,25,18,0.04) 1px, transparent 1px), linear-gradient(0deg, rgba(33,25,18,0.04) 1px, transparent 1px)',
          backgroundSize: '34px 34px',
          pointerEvents: 'none',
        },
      }}
    >
      {backdrop && (
        <BrandBackdrop videoUrl={loginBackgroundVideoUrl} imageUrl={loginBackgroundImageUrl} />
      )}
      {/*
        The fog, only when there is a backdrop to sit on — and it FOLLOWS THE
        THEME, which the flat scrim before it did not. That scrim darkened the
        frame in both modes, so light mode drew near-black headings over a
        darkened photo and the copy was unreadable over anything an admin
        actually picked. Light mode now hazes white and dark mode hazes
        near-black, so the text keeps the contrast its own theme gives it.

        Two layers on one element: `veil` covers the whole frame, and the
        gradient thickens to `edge` at the top and bottom, where the logo, the
        legal line and the version sit. Both numbers are shared with native.
      */}
      {backdrop && <FogLayer isDark={isDark} />}
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
          gap: 2,
        }}
      >
        {children}
        <AuthModeToggle />
      </Box>
    </Box>
  );
}
