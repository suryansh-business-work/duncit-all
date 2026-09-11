import { useEffect, useMemo, useState } from 'react';
import { createContactPager, initialContactPages, type ContactPagesState, type ContactsPage } from '@duncit/utils';

/**
 * A paged contacts list streamed into React state while `active`: the first
 * page paints, the rest append behind it while the page stays usable. The
 * state machine is `createContactPager` in @duncit/utils, which native's
 * `useContactPages` binds the same way (rule 27).
 *
 * `fetchPage` must be stable (memoised): a new one restarts the walk.
 */
export function useContactPages<T>(
  fetchPage: (offset: number, limit: number) => Promise<ContactsPage<T>>,
  active = true
) {
  const [pages, setPages] = useState<ContactPagesState<T>>(initialContactPages);
  const pager = useMemo(() => createContactPager(fetchPage, setPages), [fetchPage]);

  useEffect(() => {
    if (!active) return undefined;
    // `firstPage` settles either way — a failed page is reported through state.
    pager.reload().catch(() => undefined);
    return pager.cancel;
  }, [active, pager]);

  return { ...pages, reload: pager.reload, patch: pager.patch };
}
