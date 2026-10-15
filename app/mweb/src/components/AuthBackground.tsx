import { Box, useTheme } from '@mui/material';
import { auth } from '@duncit/auth-tokens';
import AuthModeToggle from './AuthModeToggle';
import { useAuthFit } from '../hooks/useAuthFit';
import { useBrandingAssets } from '../hooks/useBrandingAssets';

interface Props {
  children: React.ReactNode;
}

/** Auth screens scroll inside this fixed frame, so the app-install bar (fixed to
 * the viewport) would cover their last rows without this extra bottom room. */
const BANNER_OFFSET = 'var(--duncit-app-banner-offset, 0px)';

export default function AuthBackground({ children }: Readonly<Props>) {
  const theme = useTheme();
  const { loginBackgroundVideoUrl, loginBackgroundImageUrl } = useBrandingAssets();
  const hasHero = Boolean(loginBackgroundVideoUrl || loginBackgroundImageUrl);
  const { size } = useAuthFit();

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        justifyContent: 'center',
        // With a hero the column starts at the top — AuthHeading draws the
        // hero there, in flow (AuthHero); without one the calm ground keeps
        // the form centred.
        alignItems: hasHero ? 'flex-start' : 'safe center',
        pt: hasHero ? 0 : { xs: 2, sm: 4 },
        pb: {
          xs: `calc(${theme.spacing(2)} + ${BANNER_OFFSET})`,
          sm: `calc(${theme.spacing(4)} + ${BANNER_OFFSET})`,
        },
        px: 2,
        overflowY: 'auto',
        // The hero band is 100vw; a desktop scrollbar must not add a sideways scroll.
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        // The ground: one flat token colour, the same one native paints, and
        // the colour the hero fades into.
        bgcolor: 'background.default',
      }}
    >
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
          gap: `${size(auth.fit.gap)}px`,
        }}
      >
        {children}
        <AuthModeToggle />
      </Box>
    </Box>
  );
}
