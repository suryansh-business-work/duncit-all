import { useEffect } from 'react';
import { parseApiError } from '@duncit/utils';
import { useGigSurface } from './GigSurfaceProvider';

/**
 * Files a failed load with the surface's logger, with the parsed cause beside
 * the raw error. The screen itself shows one fixed "could not load" line, so
 * without this a GRAPHQL_VALIDATION_FAILED (a client document the schema no
 * longer accepts) left nothing to diagnose. Logged once per distinct error.
 */
export function useLoggedError(error: unknown, page: string, component: string): void {
  const { logger } = useGigSurface();
  useEffect(() => {
    if (error) logger.error(page, component, { error, reason: parseApiError(error) });
  }, [error, logger, page, component]);
}
