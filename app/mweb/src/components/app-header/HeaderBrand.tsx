import { useNavigate } from 'react-router-dom';
import { Box, Stack } from '@mui/material';
import { HOME_REFRESH_EVENT } from './queries';

interface HeaderBrandProps {
  logoUrl?: string | null;
  appName?: string | null;
}

function scrollToTop() {
  const el = document.getElementById('main-scroll');
  (el ?? globalThis).scrollTo({ top: 0, left: 0, behavior: 'smooth' });
}

export default function HeaderBrand({ logoUrl, appName }: Readonly<HeaderBrandProps>) {
  const navigate = useNavigate();

  const goHome = () => {
    const alreadyHome = globalThis.window.location.pathname === '/';
    navigate('/');
    scrollToTop();
    if (alreadyHome) globalThis.dispatchEvent(new Event(HOME_REFRESH_EVENT));
  };

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.25}
      sx={{ cursor: 'pointer', minWidth: 0 }}
      onClick={goHome}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          goHome();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="Go to home and refresh"
    >
      {logoUrl ? (
        <Box
          component="img"
          src={logoUrl}
          alt={appName ?? 'Duncit'}
          sx={{
            height: 36,
            width: 'auto',
            maxWidth: 128,
            objectFit: 'contain',
            display: 'block',
          }}
        />
      ) : (
        <Box
          aria-label={appName ?? 'Duncit'}
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1.5,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            fontWeight: 900,
            fontSize: 18,
          }}
        >
          {(appName ?? 'Duncit')[0]?.toUpperCase()}
        </Box>
      )}
    </Stack>
  );
}
