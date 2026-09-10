import { useCallback, useEffect, useRef, useState } from 'react';

import { useRefreshRegistration } from '@/components/PullToRefresh';

interface ReloadableQueryOptions {
  /**
   * Skip the load entirely. A query still waiting for its id stays in its
   * loading state rather than firing a request with an empty one.
   */
  enabled?: boolean;
  /**
   * Where a failed load is reported. Left out, the rejection travels on to the
   * pull gesture's provider, which logs it — so a hook with no error state of
   * its own still does not swallow the failure.
   */
  onError?: (error: unknown) => void;
}

/**
 * One query's lifecycle: load on mount and whenever `load` changes, expose the
 * same reload as `refetch`, and hand it to the screen's pull-to-refresh scope.
 *
 * Every data hook in the app was writing this same block by hand — the `active`
 * flag, the loading flip in `finally`, the registration — which is exactly the
 * copy rule 34 exists to stop, and it drifted the moment pull-to-refresh was
 * added to some of them. `load` may be a fresh closure each render as long as
 * it is wrapped in `useCallback` on the caller's own keys, which is what
 * decides when the query re-runs.
 */
export function useReloadableQuery(
  load: () => Promise<void>,
  options: ReloadableQueryOptions = {},
) {
  const { enabled = true } = options;
  const [isLoading, setIsLoading] = useState(true);

  // Held in a ref so a caller may pass an inline handler without re-running the
  // query, and so `refetch` keeps one identity for the life of the loader.
  const onError = useRef(options.onError);
  useEffect(() => {
    onError.current = options.onError;
  });

  const refetch = useCallback(() => {
    const running = load();
    const handler = onError.current;
    return handler ? running.catch(handler) : running;
  }, [load]);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setIsLoading(true);
    load()
      .catch((error: unknown) => active && onError.current?.(error))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [enabled, load]);

  useRefreshRegistration(refetch);

  return { isLoading, refetch };
}
