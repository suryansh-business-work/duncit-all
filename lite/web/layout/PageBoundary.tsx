import type { ReactNode } from 'react';
import { useLocation } from 'react-router';
import { DuncitErrorBoundary } from '@duncit/ui';
import { liteLog } from '../../shared/log';

/**
 * One page's crash stays on that page: the shared Duncit boundary shows Retry
 * and Report an issue in its place, logs the crash (redacted) and clears as soon
 * as the reader goes to another path. The header and footer keep working.
 */
export function PageBoundary({ children }: Readonly<{ children: ReactNode }>) {
  const { pathname } = useLocation();
  return (
    <DuncitErrorBoundary logger={liteLog} surface="lite" scope="page" resetKey={pathname}>
      {children}
    </DuncitErrorBoundary>
  );
}
