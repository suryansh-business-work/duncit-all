import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, Container } from '@mui/material';
import ScrollToTop from './components/ScrollToTop';
import AppHeader from './components/AppHeader';
import BottomNav from './components/BottomNav';
import SplashScreen from './components/SplashScreen';
import { NotifyHost } from './components/notify';
import AppRoutes from './app/AppRoutes';
import { APP_SHELL_MAX_WIDTH } from './app/appLayout';
import { useActivePing } from './app/useActivePing';
import { useClickstreamTracking } from './app/useClickstreamTracking';
import { useHapticFeedback } from './app/useHapticFeedback';

const BOTTOM_NAV_CONTENT_OFFSET = 'var(--duncit-bottom-nav-content-offset, 148px)';

export default function App() {
  const isAuthed = !!localStorage.getItem('token');
  const [superCategory, setSuperCategory] = useState('');
  const [locationId, setLocationId] = useState('');
  const [zoneName, setZoneName] = useState('');
  const location = useLocation();
  const fullBleed = location.pathname.startsWith('/explore');
  const isSignupSurvey = location.pathname.startsWith('/signup-survey');
  const showAppHeader = isAuthed;
  const showBottomNav = isAuthed && !isSignupSurvey;

  const [splashOpen, setSplashOpen] = useState(
    () => typeof window !== 'undefined' && !sessionStorage.getItem('duncit_splash_shown')
  );

  useEffect(() => {
    if (!splashOpen) return;
    const timer = window.setTimeout(() => {
      sessionStorage.setItem('duncit_splash_shown', '1');
      setSplashOpen(false);
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [splashOpen]);

  useActivePing(location.pathname, superCategory);
  useClickstreamTracking({
    enabled: isAuthed,
    path: `${location.pathname}${location.search}`,
    superCategory,
  });
  useHapticFeedback(isAuthed);

  return (
    <Box
      sx={isAuthed ? {
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'transparent',
      } : undefined}
    >
      {splashOpen && <SplashScreen />}
      {showAppHeader && (
        <AppHeader
          minimal={isSignupSurvey}
          selectedSuperCategory={superCategory}
          onSuperCategoryChange={setSuperCategory}
          selectedLocationId={locationId}
          onLocationChange={setLocationId}
          selectedZoneName={zoneName}
          onZoneChange={setZoneName}
        />
      )}
      <Container
        id="main-scroll"
        maxWidth={false}
        disableGutters
        sx={{
          width: '100%',
          maxWidth: APP_SHELL_MAX_WIDTH,
          mx: 'auto',
          position: 'relative',
          px: fullBleed ? 0 : { xs: 1.25, sm: 2 },
          ...(isAuthed && {
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflowY: fullBleed ? 'hidden' : 'auto',
            scrollPaddingBottom: showBottomNav ? BOTTOM_NAV_CONTENT_OFFSET : undefined,
          }),
          py: fullBleed ? 0 : 2,
          pb: fullBleed ? 0 : 2,
        }}
      >
        <ScrollToTop />
        <Box
          key={`${location.pathname}-${superCategory}-${locationId}-${zoneName}`}
          sx={{ flex: 1, minHeight: 0, animation: 'duncit-soft-enter 180ms ease-out both' }}
        >
          <AppRoutes superCategory={superCategory} locationId={locationId} zoneName={zoneName} />
        </Box>
        {!fullBleed && showBottomNav && (
          <Box aria-hidden sx={{ flex: '0 0 auto', height: BOTTOM_NAV_CONTENT_OFFSET }} />
        )}
      </Container>
      {showBottomNav && <BottomNav />}
      <NotifyHost />
    </Box>
  );
}
