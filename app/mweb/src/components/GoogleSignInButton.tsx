import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { GoogleLogin, useGoogleOAuth } from '@react-oauth/google';
import { BUTTON_SIZES } from '@duncit/buttons';
import { useTranslation } from '../i18n/useTranslation';

/** Our round provider buttons (Apple's too) are the large button's height. */
const ROUND_SIZE = BUTTON_SIZES.lg.height;
/** The visible disk of Google's own round `icon` button at size="large" (its
 * largest; GIS takes no other size): 40px outlined on light, but the dark theme
 * rings it inside that box, leaving 36px of disk. */
const GOOGLE_DISK = { light: 40, dark: 36 } as const;

interface Props {
  onCredential: (idToken: string) => void;
  loading?: boolean;
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  /** Google's labelled pill (default), or its round G-only button for a row of providers. */
  variant?: 'pill' | 'icon';
}

/**
 * Google Sign-In button backed by the official `@react-oauth/google` SDK.
 *
 * The package renders the Google-styled button with the G logo and theme
 * variants — there is nothing to bundle locally. The button automatically
 * switches between the light and dark Google themes to match MUI's color
 * mode, and falls back to a plain MUI tile if no `VITE_GOOGLE_CLIENT_ID`
 * is configured so dev environments fail loud, not silent.
 *
 * No width is passed to `GoogleLogin`: the button sizes to its own label so
 * it can sit beside other controls in a row and wrap instead of overflowing.
 */
export default function GoogleSignInButton({
  onCredential,
  loading,
  text = 'signin_with',
  variant = 'pill',
}: Readonly<Props>) {
  // From the provider, not the module config: the server's id can land after
  // this renders (first paint no longer waits for it), and reading it here is
  // what re-renders the button when it does.
  const { clientId } = useGoogleOAuth();
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  if (!clientId || clientId === 'your_client_id_here') {
    return (
      <Box
        data-testid="google-signin-fallback"
        sx={{
          minHeight: 44,
          px: 1.5,
          py: 1,
          border: 1,
          borderColor: 'divider',
          borderRadius: '999px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1.25,
          bgcolor: 'background.paper',
          color: 'text.secondary',
        }}
      >
        <Typography variant="body2" sx={{
          fontWeight: 600
        }}>
          Google sign-in not configured (VITE_GOOGLE_CLIENT_ID missing)
        </Typography>
      </Box>
    );
  }

  const google = (
    <GoogleLogin
        onSuccess={(response) => {
          if (response.credential) onCredential(response.credential);
        }}
        onError={() => undefined}
        useOneTap={false}
        theme={isDark ? 'filled_black' : 'outline'}
        text={text}
        type={variant === 'icon' ? 'icon' : 'standard'}
        shape={variant === 'icon' ? 'circle' : 'pill'}
        size="large"
        logo_alignment="left"
      />
  );

  return (
    <Stack
      data-testid="google-auth-button"
      aria-busy={loading ? true : undefined}
      sx={{ maxWidth: '100%', alignItems: 'center', position: 'relative', minHeight: 44 }}
    >
      {variant === 'icon' ? (
        // Google draws its round button in its own frame at a fixed size, smaller
        // than our large round buttons. Hold it in the same square the Apple
        // button takes and scale it to fill, so the row's circles and captions line up.
        <Box
          data-testid="google-icon-frame"
          sx={{
            width: ROUND_SIZE,
            height: ROUND_SIZE,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '& > div': { transform: `scale(${ROUND_SIZE / GOOGLE_DISK[isDark ? 'dark' : 'light']})` },
          }}
        >
          {google}
        </Box>
      ) : (
        google
      )}
      {loading && (
        <Box
          data-testid="google-signin-loading"
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(theme.palette.background.paper, 0.6),
            borderRadius: '999px',
          }}
        >
          <CircularProgress size={20} aria-label={t('mweb.a11y.loading')} />
        </Box>
      )}
    </Stack>
  );
}
