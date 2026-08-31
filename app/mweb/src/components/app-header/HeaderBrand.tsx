import { useNavigate } from 'react-router';
import { Box, Stack } from '@mui/material';
import { HOME_REFRESH_EVENT } from './queries';
import { useTranslation } from '../../i18n/useTranslation';

interface HeaderBrandProps {
  logoUrl?: string | null;
  appName?: string | null;
}

function scrollToTop() {
  const el = document.getElementById('main-scroll');
  (el ?? globalThis).scrollTo({ top: 0, left: 0, behavior: 'smooth' });
}

export default function HeaderBrand({ logoUrl, appName }: Readonly<HeaderBrandProps>) {
  const { t } = useTranslation();
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
      spacing={1.25}
      onClick={goHome}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          goHome();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={t('mweb.appHeader.goToHomeAndRefresh')}
      sx={{
        alignItems: "center",
        cursor: 'pointer',
        minWidth: 0
      }}>
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
            borderRadius: '8px',
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            fontWeight: 700,
            fontSize: 18,
          }}
        >
          {(appName ?? 'Duncit')[0]?.toUpperCase()}
        </Box>
      )}
    </Stack>
  );
}
