import { Suspense, useRef, useState } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router';
import { Box, Container, Link } from '@mui/material';
import { Loader, mergeSx, useRouteFocus } from '@duncit/ui';

import { CartDrawer } from '../../components/cart/CartDrawer';
import { Footer } from '../../components/footer';
import { Header, MobileTopBar } from '../../components/header';
import { SignInDialog } from '../../components/auth/SignInDialog';
import { PreferencesProvider } from '../../components/preferences';
import { StoreErrorBoundary } from '../../components/StoreErrorBoundary';
import { visuallyHidden } from '../../lib/a11y';
import { startsFromServer } from '../../lib/hydration';
import { useStoreT } from '../../i18n';
import { useCart } from '../providers/CartProvider';
import { useWishlist } from '../providers/WishlistProvider';
import { BottomNav } from './BottomNav';
import { OnboardingSplash } from './onboarding';
import { useStoreBranding } from './useStoreBranding';

const MAIN_ID = 'main-content';

/**
 * A full-height column whose main grows, so the footer always ends the page.
 * `overflowX: clip` stops an absolutely positioned element wider than the
 * viewport from adding a horizontal scrollbar, without making the page a
 * scroll container, which would break the sticky header.
 */
const ROOT_SX = { display: 'flex', flexDirection: 'column', minHeight: '100dvh', overflowX: 'clip' } as const;

const SKIP_LINK_SX = {
  position: 'absolute',
  left: 8,
  top: -60,
  zIndex: 2000,
  bgcolor: 'background.paper',
  p: 1.5,
  borderRadius: 2,
  '&:focus': { top: 8 },
} as const;

/** Announces cart and wishlist changes to screen readers without moving focus. */
function LiveRegion() {
  const { announcement: cartNews } = useCart();
  const { announcement: wishNews } = useWishlist();
  return (
    <Box aria-live="polite" role="status" sx={visuallyHidden}>
      {cartNews} {wishNews}
    </Box>
  );
}

/**
 * Skip link, header, the routed page, footer, and the overlays every page
 * shares. The preferences sidebar wraps it all, so the header, the phone menu
 * and the footer open the same drawer.
 */
export function AppShell() {
  const { t } = useStoreT();
  const { pathname } = useLocation();
  const { backgroundSx } = useStoreBranding();
  const mainRef = useRef<HTMLElement>(null);
  useRouteFocus(mainRef);
  const isHome = pathname === '/';
  // A server-rendered page is drawn without a Suspense boundary round it: React
  // hydrates a boundary's content in a pass after the shell, and by then the
  // shopper's own theme may have changed it. Later pages load inside the
  // router's transitions, which keep the current page up meanwhile; a page the
  // browser draws from scratch still gets the loader.
  const [withBoundary] = useState(() => !startsFromServer());
  const page = (
    <Container maxWidth="lg" sx={{ py: { xs: 1, md: 3 } }}>
      <StoreErrorBoundary resetKey={pathname}>
        <Outlet />
      </StoreErrorBoundary>
    </Container>
  );
  return (
    <PreferencesProvider>
      <Box sx={mergeSx(ROOT_SX, backgroundSx)}>
        <Link href={`#${MAIN_ID}`} sx={SKIP_LINK_SX}>
          {t('ecommStore.common.skipToContent')}
        </Link>
        <Header />
        {isHome ? null : <MobileTopBar />}
        <Box component="main" id={MAIN_ID} ref={mainRef} tabIndex={-1} sx={{ outline: 'none', flexGrow: 1, minHeight: '60vh' }}>
          {withBoundary ? <Suspense fallback={<Loader label={t('ecommStore.common.loading')} />}>{page}</Suspense> : page}
        </Box>
        <Footer />
        <BottomNav />
        <CartDrawer />
        <SignInDialog />
        <LiveRegion />
        <OnboardingSplash />
        <ScrollRestoration />
      </Box>
    </PreferencesProvider>
  );
}
