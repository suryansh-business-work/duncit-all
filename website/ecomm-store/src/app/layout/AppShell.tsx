import { Suspense, useRef } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router';
import { Box, Container, Link } from '@mui/material';
import { Loader, useRouteFocus } from '@duncit/ui';

import { CartDrawer } from '../../components/cart/CartDrawer';
import { Footer } from '../../components/footer';
import { Header, MobileTopBar } from '../../components/header';
import { SignInDialog } from '../../components/auth/SignInDialog';
import { visuallyHidden } from '../../lib/a11y';
import { useStoreT } from '../../i18n';
import { useCart } from '../providers/CartProvider';
import { useWishlist } from '../providers/WishlistProvider';
import { BottomNav } from './BottomNav';
import { OnboardingSplash } from './onboarding';

const MAIN_ID = 'main-content';

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

/** Skip link, header, the routed page, footer, and the overlays every page shares. */
export function AppShell() {
  const { t } = useStoreT();
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  useRouteFocus(mainRef);
  const isHome = pathname === '/';
  return (
    // A full-height column whose main grows, so the footer always ends the page.
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <Link
        href={`#${MAIN_ID}`}
        sx={{
          position: 'absolute',
          left: 8,
          top: -60,
          zIndex: 2000,
          bgcolor: 'background.paper',
          p: 1.5,
          borderRadius: 2,
          '&:focus': { top: 8 },
        }}
      >
        {t('ecommStore.common.skipToContent')}
      </Link>
      <Header />
      {isHome ? null : <MobileTopBar />}
      <Box component="main" id={MAIN_ID} ref={mainRef} tabIndex={-1} sx={{ outline: 'none', flexGrow: 1, minHeight: '60vh' }}>
        <Suspense fallback={<Loader label={t('ecommStore.common.loading')} />}>
          <Container maxWidth="lg" sx={{ py: { xs: 1, md: 3 } }}>
            <Outlet />
          </Container>
        </Suspense>
      </Box>
      <Footer />
      <BottomNav />
      <CartDrawer />
      <SignInDialog />
      <LiveRegion />
      <OnboardingSplash />
      <ScrollRestoration />
    </Box>
  );
}
