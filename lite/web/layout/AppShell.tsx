import { Suspense, useRef } from 'react';
import { Outlet, ScrollRestoration } from 'react-router';
import { Box, Container, Link } from '@mui/material';
import { Loader, useRouteFocus } from '@duncit/ui';
import { useWebT } from '../../shared/i18n';
import { SignInDialog } from '../components/auth/SignInDialog';
import { BottomNav } from './BottomNav';
import { Footer } from './Footer';
import { Header } from './header';

const MAIN_ID = 'main-content';

/** Skip link, header, the routed page, footer, the phone's bottom bar and the one sign-in dialog. */
export function AppShell() {
  const { t } = useWebT();
  const mainRef = useRef<HTMLElement>(null);
  useRouteFocus(mainRef);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', overflowX: 'clip' }}>
      <Link
        href={`#${MAIN_ID}`}
        sx={{ position: 'absolute', left: 8, top: -60, zIndex: 2000, bgcolor: 'background.paper', p: 1.5, borderRadius: 2, '&:focus': { top: 8 } }}
        data-testid="skip-link"
      >
        {t('lite.common.skipToContent')}
      </Link>
      <Header />
      <Box component="main" id={MAIN_ID} ref={mainRef} tabIndex={-1} sx={{ outline: 'none', flexGrow: 1 }}>
        <Suspense fallback={<Loader label={t('lite.common.loading')} />}>
          <Container maxWidth={false} sx={{ maxWidth: 1100, py: { xs: 2, md: 4 } }}>
            <Outlet />
          </Container>
        </Suspense>
      </Box>
      <Footer />
      <BottomNav />
      <SignInDialog />
      <ScrollRestoration />
    </Box>
  );
}
