import type { ReactNode } from 'react';
import { DuncitErrorBoundary } from '@duncit/ui';

import { APP_KEY } from '../config/env';
import { storeLog } from '../lib/log';

interface StoreErrorBoundaryProps {
  children: ReactNode;
  /** `root` wraps the whole app (Retry reloads it); `page` wraps one routed page. */
  scope?: 'root' | 'page';
  /** A new value (the path) clears a caught crash — navigating away is a recovery. */
  resetKey?: string;
}

/**
 * The store's error boundary: the shared Duncit one (Retry + Report an issue)
 * with the storefront's logger, so a crash on one page never takes down the
 * header, cart or the rest of the store. The report is the redacted crash log
 * row the Tech portal's Error Boundaries page lists.
 */
export function StoreErrorBoundary({ children, scope = 'page', resetKey }: Readonly<StoreErrorBoundaryProps>) {
  return (
    <DuncitErrorBoundary logger={storeLog} surface={APP_KEY} scope={scope} resetKey={resetKey}>
      {children}
    </DuncitErrorBoundary>
  );
}
