import { useEffect, useMemo, useState } from 'react';
import {
  createContactPager,
  initialContactPages,
  type ContactPagesState,
  type ContactsPage,
} from '@duncit/utils';

import { useRefreshRegistration } from '@/components/PullToRefresh';
import { fireAndForget } from '@/utils/fire-and-forget';

/**
 * A paged contacts list streamed into React state while `active`: the first
 * page paints, the rest append behind it. The state machine is
 * `createContactPager` in @duncit/utils, which mWeb's `useContactPages` binds
 * the same way (rule 27); this adds the screen's pull-to-refresh.
 *
 * `fetchPage` must be stable (module scope or memoised): a new one restarts
 * the walk.
 */
export function useContactPages<T>(
  fetchPage: (offset: number, limit: number) => Promise<ContactsPage<T>>,
  active = true,
) {
  const [pages, setPages] = useState<ContactPagesState<T>>(initialContactPages);
  const pager = useMemo(() => createContactPager(fetchPage, setPages), [fetchPage]);

  useEffect(() => {
    if (!active) return undefined;
    fireAndForget(pager.reload());
    return pager.cancel;
  }, [active, pager]);

  // A pull reloads only a list that is on screen.
  useRefreshRegistration(() => (active ? pager.reload() : undefined));

  return { ...pages, reload: pager.reload, patch: pager.patch };
}
