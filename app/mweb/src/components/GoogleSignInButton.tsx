import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { GoogleLogin } from '@react-oauth/google';
import { getGoogleClientId } from '../config/runtimeConfig';

interface Props {
  onCredential: (idToken: string) => void;
  loading?: boolean;
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
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
export default function GoogleSignInButton({ onCredential, loading, text = 'signin_with' }: Readonly<Props>) {
  const clientId = getGoogleClientId();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  if (!clientId || clientId === 'your_client_id_here') {
    return (
      <Box
        sx={{
          minHeight: 44,
          px: 1.5,
          py: 1,
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1.25,
          bgcolor: 'background.paper',
          color: 'text.secondary',
        }}
      >
        <Typography variant="body2" sx={{
          fontWeight: 700
        }}>
          Google sign-in not configured (VITE_GOOGLE_CLIENT_ID missing)
        </Typography>
      </Box>
    );
  }

  return (
    <Stack sx={{ maxWidth: '100%', alignItems: 'center', position: 'relative', minHeight: 44 }}>
      <GoogleLogin
        onSuccess={(response) => {
          if (response.credential) onCredential(response.credential);
        }}
        onError={() => undefined}
        useOneTap={false}
        theme={isDark ? 'filled_black' : 'outline'}
        text={text}
        shape="rectangular"
        size="large"
        logo_alignment="left"
      />
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: isDark ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.6)',
            borderRadius: 1,
          }}
        >
          <CircularProgress size={20} />
        </Box>
      )}
    </Stack>
  );
}
