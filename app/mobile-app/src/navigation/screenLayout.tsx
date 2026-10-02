import type { ReactNode } from 'react';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ScreenRefreshProvider } from '@/components/PullToRefresh';

/**
 * What every route renders inside — the root stack's and each tab's alike.
 * Doing it here rather than in each screen makes both universal: a screen
 * added tomorrow gets them without knowing they exist.
 *
 * - its own error boundary, so a crash in one screen shows Retry / Report an
 *   Issue in that screen while the rest of the app keeps working;
 * - its own pull-to-refresh scope — the tabs stay mounted behind one another,
 *   so a shared scope would refetch four tabs on every pull.
 *
 * Module scope, so the identity is stable and no screen ever remounts because of it.
 */
export const screenLayout = ({
  children,
  route,
}: Readonly<{ children: ReactNode; route: { name: string } }>) => (
  <ErrorBoundary scope="page" route={route.name}>
    <ScreenRefreshProvider>{children}</ScreenRefreshProvider>
  </ErrorBoundary>
);
