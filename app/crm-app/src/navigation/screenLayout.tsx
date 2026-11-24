import type { ReactNode } from 'react';

import { ErrorBoundary } from '@/components/ErrorBoundary';

/**
 * Every screen sits in its own error boundary (rule: a page failure never
 * crashes the app) — passed to each navigator as `screenLayout`.
 */
export function screenLayout({ children, route }: { children: ReactNode; route: { name: string } }) {
  return (
    <ErrorBoundary scope="page" route={route.name}>
      {children}
    </ErrorBoundary>
  );
}
