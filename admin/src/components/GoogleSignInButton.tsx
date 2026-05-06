import { useEffect, useState } from 'react';
import { Box, Button, CircularProgress } from '@mui/material';

declare global {
  interface Window {
    google?: any;
  }
}

interface Props {
  onCredential: (idToken: string) => void;
  loading?: boolean;
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
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

const LABEL_BY_TEXT: Record<NonNullable<Props['text']>, string> = {
  signin_with: 'Sign in with Google',
  signup_with: 'Sign up with Google',
  continue_with: 'Continue with Google',
  signin: 'Sign in',
};

export default function GoogleSignInButton({
  onCredential,
  loading,
  text = 'continue_with',
}: Props) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled || !window.google?.accounts?.id) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (resp: any) => {
            setBusy(false);
            if (resp?.credential) onCredential(resp.credential);
          },
          ux_mode: 'popup',
          auto_select: false,
        });
        setReady(true);
      })
      .catch(() => setReady(false));
    return () => {
      cancelled = true;
    };
  }, [clientId, onCredential]);

  if (!clientId) {
    return (
      <Button variant="outlined" disabled fullWidth>
        Google sign-in not configured
      </Button>
    );
  }

  const handleClick = () => {
    if (!ready || !window.google?.accounts?.id) return;
    setBusy(true);
    try {
      window.google.accounts.id.prompt();
    } catch {
      setBusy(false);
    }
    // If the prompt is dismissed without a credential, allow another try.
    window.setTimeout(() => setBusy(false), 5000);
  };

  const disabled = !ready || !!loading || busy;
  const showSpinner = !!loading || busy;

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      fullWidth
      sx={{
        height: 44,
        bgcolor: '#fff',
        color: '#1f1f1f',
        border: '1px solid #747775',
        borderRadius: '24px',
        textTransform: 'none',
        fontFamily: '"Roboto","Helvetica","Arial",sans-serif',
        fontWeight: 500,
        fontSize: 14,
        letterSpacing: 0.25,
        boxShadow: 'none',
        gap: 1.25,
        '&:hover': { bgcolor: '#f8f9fa', boxShadow: 'none' },
        '&.Mui-disabled': { bgcolor: '#fff', color: '#1f1f1f', opacity: 0.6 },
      }}
      startIcon={
        showSpinner ? (
          <CircularProgress size={18} />
        ) : (
          <Box
            component="img"
            src="/google-g.svg"
            alt=""
            sx={{ width: 20, height: 20 }}
          />
        )
      }
    >
      {LABEL_BY_TEXT[text]}
    </Button>
  );
}
