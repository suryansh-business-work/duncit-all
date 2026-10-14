import { Box, Stack, Typography } from '@mui/material';
import AuthLogo from './AuthLogo';
import TwoToneHeading from './TwoToneHeading';

interface Props {
  title: string;
  /** The second beat — "back!" in "Welcome back!" — on its own line, in the red text accent. */
  accent?: string;
  /** The line under the heading: what the screen is for, or what the person needs to know. */
  subtitle?: string;
}

/**
 * The logo-plus-heading block every auth screen opens with: the admin logo,
 * then a large left-aligned two-line headline whose second beat is red, sitting
 * over the lower half of the Branding hero.
 *
 * Sign-in, signup, recovery and the referral step all render it, because a
 * heading that drifts is two auth screens that no longer look like the same
 * product. Native's equivalent is baked into `AuthScaffold`.
 */
export default function AuthHeading({ title, accent, subtitle }: Readonly<Props>) {
  return (
    <Stack data-testid="auth-heading" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
      <AuthLogo />
      {/* TwoToneHeading has no size prop; the hero size is set here, once. */}
      <Box sx={{ width: '100%', '& .MuiTypography-root': { fontSize: '2.5rem', fontWeight: 800 } }}>
        <TwoToneHeading lead={title} trail={accent} trailTone="accent" stacked align="left" />
      </Box>
      {subtitle && (
        <Typography
          data-testid="auth-heading-subtitle"
          variant="body1"
          sx={{ color: 'text.secondary', maxWidth: 360 }}
        >
          {subtitle}
        </Typography>
      )}
    </Stack>
  );
}
