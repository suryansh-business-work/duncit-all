import { Box, Stack, Typography } from '@mui/material';
import { auth } from '@duncit/auth-tokens';
import AuthHero from './AuthHero';
import AuthLogo from './AuthLogo';
import AuthPodBanner from './AuthPodBanner';
import TwoToneHeading from './TwoToneHeading';
import { useAuthFit } from '../hooks/useAuthFit';

const FIT = auth.fit;

interface Props {
  title: string;
  /** The second beat — "back!" in "Welcome back!" — on its own line, in the red text accent. */
  accent?: string;
  /** The line under the heading: what the screen is for, or what the person needs to know. */
  subtitle?: string;
}

/**
 * The logo-plus-heading block every auth screen opens with: the square logo
 * tile, then a large left-aligned two-line headline whose second beat is red,
 * on the darkened foot of the Branding hero (AuthHero) when there is one.
 * Sized to the viewport (`useAuthFit`), so a short phone gets a smaller
 * headline instead of a scroll.
 *
 * Sign-in, signup, recovery and the referral step all render it, because a
 * heading that drifts is two auth screens that no longer look like the same
 * product. Native's equivalent: AuthScaffold's AuthHeading.
 */
export default function AuthHeading({ title, accent, subtitle }: Readonly<Props>) {
  const { size } = useAuthFit();
  const gap = size(FIT.gap);
  return (
    <>
      <AuthHero room={size(FIT.heroRoom)} gap={gap}>
        <Stack data-testid="auth-heading" sx={{ alignItems: 'flex-start', gap: `${size(FIT.gap / 2)}px` }}>
          <AuthLogo size={size(FIT.logoSize)} square />
          {/* TwoToneHeading has no size prop; the hero size is set here, once. */}
          <Box
            sx={{
              width: '100%',
              '& .MuiTypography-root': {
                fontSize: `${size(FIT.titleSize, FIT.titleMinSize)}px`,
                fontWeight: 800,
              },
            }}
          >
            <TwoToneHeading lead={title} trail={accent} trailTone="accent" stacked align="left" />
          </Box>
          {subtitle && (
            <Typography
              data-testid="auth-heading-subtitle"
              variant="body1"
              sx={{
                color: 'text.secondary',
                maxWidth: 360,
                fontSize: `${size(FIT.subtitleSize, FIT.subtitleMinSize)}px`,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Stack>
      </AuthHero>
      {/* The pod a signed-out visitor tapped — under the hero, so the hero stays
        flush with the top of the screen. */}
      <AuthPodBanner />
    </>
  );
}
