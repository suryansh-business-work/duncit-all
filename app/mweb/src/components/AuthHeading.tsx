import { Box, Stack, Typography } from '@mui/material';
import { auth } from '@duncit/auth-tokens';
import AuthLogo from './AuthLogo';

interface Props {
  title: string;
  /** The accent-coloured trailing word — "back." in "Welcome back.". */
  accent: string;
  /** Optional; steps whose own copy explains them pass nothing. */
  subtitle?: string;
  /** Optional line under the subtitle, e.g. "Step 2 of 3". */
  caption?: string;
}

/**
 * The logo-plus-heading block every auth screen opens with.
 *
 * Sign-in and password recovery were rendering the same eight lines of MUI, and
 * a heading that drifts is two auth screens that no longer look like the same
 * product. Native's equivalent is baked into `AuthScaffold`, which is why this
 * one is mWeb-only.
 */
export default function AuthHeading({ title, accent, subtitle, caption }: Readonly<Props>) {
  return (
    <Stack spacing={1.2} sx={{ alignItems: 'center' }}>
      <AuthLogo />
      <Typography
        variant="h4"
        sx={{ fontWeight: 700, textAlign: 'center', color: 'text.primary' }}
      >
        {title}{' '}
        <Box component="span" sx={{ color: auth.accent }}>
          {accent}
        </Box>
      </Typography>
      {subtitle && (
        <Typography
          variant="body2"
          sx={{ textAlign: 'center', color: 'text.secondary', maxWidth: 320 }}
        >
          {subtitle}
        </Typography>
      )}
      {caption && (
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          {caption}
        </Typography>
      )}
    </Stack>
  );
}
