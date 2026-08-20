import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, Container } from '@mui/material';
import ScrollToTop from './components/ScrollToTop';
import AppHeader from './components/AppHeader';
import BottomNav from './components/BottomNav';
import BrandFontLoader from './components/BrandFontLoader';
import OpenInAppBanner from './components/OpenInAppBanner';
import SplashScreen from './components/SplashScreen';
import OfflineBanner from './components/OfflineBanner';
import ErrorBoundary from './components/ErrorBoundary';
import { NotifyHost } from './components/notify';
import PodFeedbackPrompt from './components/pod-feedback';
import AppPopupDialog from './components/app-popup';
import AppRoutes from './app/AppRoutes';
import { APP_SHELL_MAX_WIDTH } from './app/appLayout';
import { useActivePing } from './app/useActivePing';
import { useClickstreamTracking } from './app/useClickstreamTracking';
import { useHapticFeedback } from './app/useHapticFeedback';
import { useShortLinkJourney } from './app/useShortLinkJourney';
import { useBrandingAssets } from './hooks/useBrandingAssets';
import { useDynamicFavicon } from './hooks/useDynamicFavicon';
import { StatusUploadProvider } from './components/status-upload/StatusUploadProvider';
import { CartProvider } from './components/cart/CartContext';
import { TourProvider } from './tours/TourContext';
import { TourRunner } from './tours/TourRunner';

const BOTTOM_NAV_CONTENT_OFFSET = 'var(--duncit-bottom-nav-content-offset, 148px)';
/** Height the app-install bar reserves at the bottom (0 when it is not shown). */
const APP_BANNER_CONTENT_OFFSET = 'var(--duncit-app-banner-offset, 0px)';

export default function App() {
  const isAuthed = !!localStorage.getItem('token');
  const [superCategory, setSuperCategory] = useState('');
  const [locationId, setLocationId] = useState('');
  const [zoneName, setZoneName] = useState('');
  const location = useLocation();
  const fullBleed = location.pathname.startsWith('/explore');
  const isSignupSurvey = location.pathname.startsWith('/signup-survey');
  // The account menu owns the whole viewport (it carries its own title + ✕),
  // exactly like the full-screen drawer it replaced. A trailing slash still
  // resolves to the same route, so normalise before comparing.
  const isMenu = location.pathname === '/menu' || location.pathname === '/menu/';
  const showAppHeader = isAuthed && !isMenu;
  const showBottomNav = isAuthed && !isSignupSurvey && !isMenu;
  const navPadBottom = showBottomNav ? BOTTOM_NAV_CONTENT_OFFSET : '0px';
  const contentPadBottom = fullBleed ? 0 : `calc(${navPadBottom} + ${APP_BANNER_CONTENT_OFFSET})`;

  const [splashOpen, setSplashOpen] = useState(
    () => globalThis.window !== undefined && !sessionStorage.getItem('duncit_splash_shown')
  );

  useEffect(() => {
    if (!splashOpen) return;
    const timer = globalThis.setTimeout(() => {
      sessionStorage.setItem('duncit_splash_shown', '1');
      setSplashOpen(false);
    }, 2200);
    return () => globalThis.clearTimeout(timer);
  }, [splashOpen]);

  const { faviconUrl } = useBrandingAssets();
  useDynamicFavicon(faviconUrl);

  useActivePing(location.pathname, superCategory);
  useClickstreamTracking({
    enabled: isAuthed,
    path: `${location.pathname}${location.search}`,
    superCategory,
  });
  useHapticFeedback(isAuthed);
  // Only does anything for a visitor who arrived through a duncit.com link.
  useShortLinkJourney(isAuthed);

  return (
    <StatusUploadProvider>
    <CartProvider>
    <TourProvider>
    <Box
      sx={isAuthed ? {
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'transparent',
      } : undefined}
    >
      {splashOpen && <SplashScreen />}
      <OfflineBanner />
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
          // The menu keeps the gutters at 0 (edge-to-edge, like the drawer it
          // replaced and like its native twin) but still scrolls, so it cannot
          // ride the `fullBleed` flag — that also hides the overflow.
          px: fullBleed || isMenu ? 0 : { xs: 1.25, sm: 2 },
          ...(isAuthed && {
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflowY: fullBleed ? 'hidden' : 'auto',
            scrollPaddingBottom: showBottomNav ? BOTTOM_NAV_CONTENT_OFFSET : undefined,
          }),
          py: fullBleed || isMenu ? 0 : 2,
          pb: fullBleed || isMenu ? 0 : 2,
        }}
      >
        <ScrollToTop />
        <Box
          key={`${location.pathname}-${superCategory}-${locationId}-${zoneName}`}
          sx={{
            flex: 1,
            minHeight: 0,
            boxSizing: 'border-box',
            pb: contentPadBottom,
            animation: 'duncit-soft-enter 180ms ease-out both',
          }}
        >
          <ErrorBoundary>
            <AppRoutes superCategory={superCategory} locationId={locationId} zoneName={zoneName} />
          </ErrorBoundary>
          {/* The wrapper above is a flex item with a pinned height, so its
              padding-bottom only shrinks the box a full-height page (chat) is
              measured against — a page taller than the viewport overflows past
              it and the padding adds nothing to the scroll length. This spacer
              rides after the routed page in normal flow, so every scrolling
              page ends on the same reserved strip instead of under the bar. */}
          <Box aria-hidden sx={{ height: contentPadBottom }} />
        </Box>
      </Container>
      {showBottomNav && <BottomNav />}
      {isAuthed && <PodFeedbackPrompt />}
      {isAuthed && <AppPopupDialog />}
      <OpenInAppBanner />
      <BrandFontLoader />
      <NotifyHost />
    </Box>
    <TourRunner />
    </TourProvider>
    </CartProvider>
    </StatusUploadProvider>
  );
}
