import type { JSX } from 'react';
import { useLocation } from 'react-router';
import { createLogger } from '@duncit/logs';
import { DuncitErrorBoundary } from '@duncit/ui';

/** `configureLogs` stamps the portal key on every row, so one logger serves all of them. */
const logger = createLogger('portal');

/**
 * Catches a crash in one routed page so the portal chrome stays up and the
 * person gets Retry and Report an Issue instead of a white screen.
 *
 * It sits INSIDE the chrome (see `createAuthed`), so the sidebar still works
 * and navigating away is itself the recovery: the boundary clears when the path
 * changes rather than remounting the page, so a param change inside a working
 * page keeps its state. A report lands in Tech → Error Boundaries.
 */
export function PageErrorBoundary({ children }: Readonly<{ children: JSX.Element }>) {
  const { pathname } = useLocation();
  return (
    <DuncitErrorBoundary logger={logger} surface="portal" scope="page" resetKey={pathname}>
      {children}
    </DuncitErrorBoundary>
  );
}
