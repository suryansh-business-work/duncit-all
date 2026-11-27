import type { ReactNode } from 'react';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ScreenRefreshProvider } from '@/components/PullToRefresh';
import { ScreenScrollProvider, ScrollTopOnTabEntry } from '@/components/ScreenScroll';

interface LayoutArgs {
  children: ReactNode;
  route: { name: string };
}

/**
 * What every route renders inside — the root stack's and each tab's alike.
 * Doing it here rather than in each screen makes both universal: a screen
 * added tomorrow gets them without knowing they exist.
 *
 * - its own error boundary, so a crash in one screen shows Retry / Report an
 *   Issue in that screen while the rest of the app keeps working;
 * - its own pull-to-refresh scope — the tabs stay mounted behind one another,
 *   so a shared scope would refetch four tabs on every pull;
 * - its own scroll registry, so a new page shown on a mounted screen (a tab
 *   switched to, a wizard's next step) opens at the top.
 *
 * Module scope, so the identity is stable and no screen ever remounts because of it.
 */
export const screenLayout = ({ children, route }: Readonly<LayoutArgs>) => (
  <ErrorBoundary scope="page" route={route.name}>
    <ScreenRefreshProvider>
      <ScreenScrollProvider>{children}</ScreenScrollProvider>
    </ScreenRefreshProvider>
  </ErrorBoundary>
);

/**
 * A bottom tab: `screenLayout`, plus opening at the top when the user switches
 * to it — mWeb's bottom nav opens every tab page at the top.
 */
export const tabScreenLayout = ({ children, route }: Readonly<LayoutArgs>) =>
  screenLayout({
    route,
    children: (
      <>
        <ScrollTopOnTabEntry />
        {children}
      </>
    ),
  });
