import { Box, Stack, Typography } from '@mui/material';
import AuthLogo from './AuthLogo';
import TwoToneHeading from './TwoToneHeading';

interface Props {
  title: string;
  /** The softer second beat — "back." in "Welcome back." — drawn muted. */
  accent?: string;
  /**
   * Only for a line that carries something the person needs ("we sent a code
   * to…", "you've been signed out everywhere"); decorative taglines are gone.
   */
  subtitle?: string;
}

/**
 * The logo-plus-heading block every auth screen opens with: the admin logo,
 * then one calm two-tone headline at 28px.
 *
 * Sign-in, signup, recovery and the referral step all render it, because a
 * heading that drifts is two auth screens that no longer look like the same
 * product. Native's equivalent is baked into `AuthScaffold`.
 */
export default function AuthHeading({ title, accent, subtitle }: Readonly<Props>) {
  return (
    <Stack spacing={1} sx={{ alignItems: 'center' }}>
      <AuthLogo />
      {/* TwoToneHeading has no size prop; the hero size is set here, once. */}
      <Box sx={{ width: '100%', '& .MuiTypography-root': { fontSize: '1.75rem' } }}>
        <TwoToneHeading lead={title} trail={accent} align="center" />
      </Box>
      {subtitle && (
        <Typography
          variant="body2"
          sx={{ textAlign: 'center', color: 'text.secondary', maxWidth: 320 }}
        >
          {subtitle}
        </Typography>
      )}
    </Stack>
  );
}
