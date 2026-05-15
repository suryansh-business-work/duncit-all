import { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';

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

export default function GoogleSignInButton({
  onCredential,
  loading,
  text = 'continue_with',
}: Props) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    if (!clientId || !containerRef.current) return;
    let cancelled = false;
    setFallback(false);
    loadGoogleScript()
      .then(() => {
        if (cancelled || !window.google?.accounts?.id || !containerRef.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (resp: any) => {
            if (resp?.credential) onCredential(resp.credential);
          },
          ux_mode: 'popup',
          auto_select: false,
          itp_support: true,
        });
        containerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text,
          shape: 'pill',
          logo_alignment: 'left',
          width: containerRef.current.clientWidth || 320,
        });
        window.setTimeout(() => {
          if (!cancelled && containerRef.current?.childElementCount === 0) setFallback(true);
        }, 900);
      })
      .catch(() => {
        if (!cancelled) setFallback(true);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId, onCredential, text]);

  if (!clientId || fallback) {
    return (
      <Box
        sx={{
          height: 44,
          border: '1px solid',
          borderColor: 'rgba(255,255,255,0.22)',
          borderRadius: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1.25,
          bgcolor: 'rgba(255,255,255,0.92)',
          color: '#1f1b2e',
        }}
      >
        <Box sx={{ width: 24, height: 24, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: '#fff', fontWeight: 900 }}>
          G
        </Box>
        <Typography variant="body2" fontWeight={800}>
          Google sign-in unavailable
        </Typography>
      </Box>
    );
  }

  return (
    <Stack sx={{ width: '100%', alignItems: 'center', position: 'relative', minHeight: 44 }}>
      <Box ref={containerRef} sx={{ width: '100%', display: 'flex', justifyContent: 'center' }} />
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(255,255,255,0.6)',
            borderRadius: '24px',
          }}
        >
          <CircularProgress size={20} />
        </Box>
      )}
    </Stack>
  );
}
