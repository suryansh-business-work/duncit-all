import { useEffect, useRef } from 'react';
import { Box, Button, CircularProgress, Stack } from '@mui/material';

declare global {
  interface Window {
    google?: any;
  }
}

interface Props {
  onCredential: (idToken: string) => void;
  loading?: boolean;
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  fullWidth?: boolean;
}

const SCRIPT_ID = 'google-identity-services';

function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('no window'));
    if (window.google?.accounts?.id) return resolve();
    if (document.getElementById(SCRIPT_ID)) {
      const i = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(i);
          resolve();
        }
      }, 50);
      setTimeout(() => {
        clearInterval(i);
        reject(new Error('Google script load timeout'));
      }, 8000);
      return;
    }
    const s = document.createElement('script');
    s.id = SCRIPT_ID;
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Google script'));
    document.head.appendChild(s);
  });
}

export default function GoogleSignInButton({
  onCredential,
  loading,
  text = 'signin_with',
  fullWidth = true,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  useEffect(() => {
    if (!clientId || !ref.current) return;
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled || !window.google?.accounts?.id || !ref.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (resp: any) => {
            if (resp?.credential) onCredential(resp.credential);
          },
          ux_mode: 'popup',
          auto_select: false,
        });
        window.google.accounts.id.renderButton(ref.current, {
          theme: 'outline',
          size: 'large',
          width: fullWidth ? Math.min(ref.current.clientWidth, 400) : 280,
          text,
          shape: 'rectangular',
          logo_alignment: 'center',
        });
      })
      .catch(() => {
        /* fallback button below remains */
      });
    return () => {
      cancelled = true;
    };
  }, [clientId, onCredential, text, fullWidth]);

  if (!clientId) {
    return (
      <Button variant="outlined" disabled fullWidth={fullWidth}>
        Google sign-in not configured
      </Button>
    );
  }

  return (
    <Stack alignItems="center" sx={{ width: '100%', position: 'relative' }}>
      <Box
        ref={ref}
        sx={{
          width: '100%',
          minHeight: 44,
          display: 'flex',
          justifyContent: 'center',
          opacity: loading ? 0.5 : 1,
          pointerEvents: loading ? 'none' : 'auto',
        }}
      />
      {loading && (
        <CircularProgress
          size={20}
          sx={{ position: 'absolute', top: '50%', mt: '-10px' }}
        />
      )}
    </Stack>
  );
}
