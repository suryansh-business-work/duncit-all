import { Suspense, useRef } from 'react';
import { Outlet, ScrollRestoration, useMatches } from 'react-router';
import { MotionConfig } from 'framer-motion';
import { Box, Container, Link } from '@mui/material';
import { useRouteFocus } from '@duncit/ui';
import { useWebT } from '../../shared/i18n';
import { SignInDialog } from '../components/auth/SignInDialog';
import { PageSkeleton } from '../components/skeletons';
import { Footer } from './Footer';
import { Header } from './header';
import { MobileTabBar, TAB_BAR_HEIGHT } from './MobileTabBar';
import { PageBoundary } from './PageBoundary';
import { TopGlow } from './TopGlow';

const MAIN_ID = 'main-content';

/** A route that draws edge to edge (the landing page) says so in its `handle`. */
export interface RouteHandle {
  bleed?: boolean;
}

const isBleed = (handle: unknown): boolean => Boolean((handle as RouteHandle | undefined)?.bleed);

/** Skip link, the glow, header, the routed page, footer and the one sign-in dialog. */
export function AppShell() {
  const { t } = useWebT();
  const mainRef = useRef<HTMLElement>(null);
  const matches = useMatches();
  const bleed = isBleed(matches.at(-1)?.handle);
  useRouteFocus(mainRef);
  const fallback = <PageSkeleton />;
  return (
    // reducedMotion="user": with the reader's reduced-motion setting on, every Framer animation drops its movement.
    <MotionConfig reducedMotion="user">
      <Box
        sx={(theme) => ({
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100dvh',
          overflowX: 'clip',
          // Room for the phone tab bar, so the footer and the last card are never under it.
          [theme.breakpoints.down('sm')]: { pb: `calc(${TAB_BAR_HEIGHT}px + env(safe-area-inset-bottom))` },
        })}
      >
        <TopGlow />
        <Link
          href={`#${MAIN_ID}`}
          sx={{ position: 'absolute', left: 8, top: -60, zIndex: 2000, bgcolor: 'background.paper', p: 1.5, borderRadius: 2, '&:focus': { top: 8 } }}
          data-testid="skip-link"
        >
          {t('lite.common.skipToContent')}
        </Link>
        <Header />
        <Box component="main" id={MAIN_ID} ref={mainRef} tabIndex={-1} sx={{ position: 'relative', outline: 'none', flexGrow: 1 }}>
          <PageBoundary>
            <Suspense fallback={fallback}>
              {bleed ? (
                <Outlet />
              ) : (
                <Container maxWidth={false} sx={{ maxWidth: 1040, py: { xs: 2, md: 4 }, animation: 'lite-rise 420ms both' }} data-lite-animate>
                  <Outlet />
                </Container>
              )}
            </Suspense>
          </PageBoundary>
        </Box>
        <Footer />
        <MobileTabBar />
        <SignInDialog />
        <ScrollRestoration />
      </Box>
    </MotionConfig>
  );
}
