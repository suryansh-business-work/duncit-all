import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';
import Lottie from 'lottie-react';
import { Box, Fade, Paper, Typography } from '@mui/material';

const BRANDING_WELCOME = gql`
  query BrandingWelcome {
    branding {
      welcome_lottie_url
    }
  }
`;

const SHOW_MS = 1800;

function moduleLabelFromPath(pathname: string): string {
  const seg = pathname.split('/').filter(Boolean)[0] ?? '';
  if (!seg) return 'Dashboard';
  return seg
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ModuleWelcomeOverlay() {
  const location = useLocation();
  const moduleKey = location.pathname.split('/').filter(Boolean)[0] ?? '';
  const lastModule = useRef<string | null>(null);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<any>(null);

  const { data: brandingData } = useQuery(BRANDING_WELCOME, { fetchPolicy: 'cache-first' });
  const url = brandingData?.branding?.welcome_lottie_url || '/lotties/welcome.json';

  useEffect(() => {
    let alive = true;
    fetch(url)
      .then((r) => r.json())
      .then((j) => alive && setData(j))
      .catch(() => alive && setData(null));
    return () => {
      alive = false;
    };
  }, [url]);

  useEffect(() => {
    if (lastModule.current === null) {
      lastModule.current = moduleKey;
      return;
    }
    if (lastModule.current !== moduleKey) {
      lastModule.current = moduleKey;
      setOpen(true);
      const t = setTimeout(() => setOpen(false), SHOW_MS);
      return () => clearTimeout(t);
    }
  }, [moduleKey]);

  if (!data) return null;
  const label = moduleLabelFromPath(location.pathname);

  return (
    <Fade in={open} unmountOnExit>
      <Paper
        elevation={6}
        sx={{
          position: 'fixed',
          top: 88,
          right: 24,
          zIndex: (t) => t.zIndex.snackbar + 1,
          px: 2,
          py: 1.25,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          borderRadius: 3,
          minWidth: 220,
          pointerEvents: 'none',
        }}
      >
        <Box sx={{ width: 56, height: 56 }}>
          <Lottie animationData={data} loop={false} autoplay style={{ width: '100%', height: '100%' }} />
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Welcome to
          </Typography>
          <Typography variant="subtitle1" sx={{ lineHeight: 1.1, fontWeight: 700 }}>
            {label}
          </Typography>
        </Box>
      </Paper>
    </Fade>
  );
}
