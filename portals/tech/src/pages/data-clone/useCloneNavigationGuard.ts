import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Keeps a running clone from being walked away from by accident.
 *
 * Two paths need covering and they cannot share a mechanism:
 *  - a real browser close/refresh, which only `beforeunload` can catch (the
 *    browser then shows its OWN prompt — unavoidable, and not the banned
 *    window.confirm);
 *  - in-app navigation, which is a plain link click. This portal mounts a
 *    BrowserRouter, not a data router, so react-router's useBlocker is not
 *    available; a capture-phase click listener is what is left. The click is
 *    swallowed, the caller renders an MUI dialog, and `leave()` finishes the
 *    navigation if the user still wants to go.
 */
const INTERNAL_LINK = 'a[href]';

/** The in-app path this click would navigate to, or null if it is not one. */
function internalPath(event: MouseEvent): string | null {
  if (event.defaultPrevented || event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  const anchor = (event.target as HTMLElement | null)?.closest?.(INTERNAL_LINK) as
    | HTMLAnchorElement
    | null
    | undefined;
  if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return null;
  if (anchor.origin !== globalThis.location.origin) return null;
  const path = `${anchor.pathname}${anchor.search}${anchor.hash}`;
  return path === globalThis.location.pathname ? null : path;
}

export interface CloneNavigationGuard {
  /** The path a blocked click was heading to — non-null means "ask the user". */
  pendingPath: string | null;
  leave: () => void;
  stay: () => void;
}

export function useCloneNavigationGuard(active: boolean): CloneNavigationGuard {
  const navigate = useNavigate();
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return undefined;
    // preventDefault alone is the current contract for beforeunload; the old
    // `returnValue = ''` companion is deprecated and no longer needed.
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    globalThis.addEventListener('beforeunload', warn);
    return () => globalThis.removeEventListener('beforeunload', warn);
  }, [active]);

  useEffect(() => {
    if (!active) return undefined;
    const intercept = (event: MouseEvent) => {
      const path = internalPath(event);
      if (!path) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingPath(path);
    };
    const doc = globalThis.document;
    doc.addEventListener('click', intercept, true);
    return () => doc.removeEventListener('click', intercept, true);
  }, [active]);

  const leave = useCallback(() => {
    setPendingPath(null);
    if (pendingPath) navigate(pendingPath);
  }, [navigate, pendingPath]);

  const stay = useCallback(() => setPendingPath(null), []);

  return { pendingPath, leave, stay };
}
