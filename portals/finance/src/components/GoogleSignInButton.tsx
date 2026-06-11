import { useEffect, useState } from 'react';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { GoogleLogin } from '@react-oauth/google';

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
 */
export default function GoogleSignInButton({ onCredential, loading, text = 'signin_with' }: Readonly<Props>) {
  const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [width, setWidth] = useState<number>(320);

  useEffect(() => {
    const compute = () => {
      const el = document.getElementById('google-signin-host');
      if (el) setWidth(Math.min(Math.max(el.clientWidth, 240), 400));
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  if (!clientId || clientId === 'your_client_id_here') {
    return (
      <Box
        sx={{
          height: 44,
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
        <Typography variant="body2" fontWeight={700}>
          Google sign-in not configured (VITE_GOOGLE_CLIENT_ID missing)
        </Typography>
      </Box>
    );
  }

  return (
    <Stack id="google-signin-host" sx={{ width: '100%', alignItems: 'center', position: 'relative', minHeight: 44 }}>
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
        width={width}
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
