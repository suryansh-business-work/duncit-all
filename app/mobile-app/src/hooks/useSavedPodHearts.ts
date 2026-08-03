import { useCallback, useMemo } from 'react';

import { ToggleSavedPodDocument } from '@/graphql/explore';
import { graphqlRequest } from '@/services/graphql.client';
import { useMe } from '@/hooks/useMe';
import { useMeStore } from '@/stores/me.store';
import { fireAndForget } from '@/utils/fire-and-forget';

/**
 * The heart on home pod cards: whether a pod (by DOC id) is in the viewer's
 * saved list, plus the toggle. Twin of mWeb's useSavedPodHearts; the `me`
 * store is refetched after a toggle so every reader of `saved_pod_ids` agrees
 * (the Saved screen queries the server directly and picks it up on focus).
 */
export function useSavedPodHearts() {
  const me = useMe().data?.me;
  const ids = useMemo(
    () => new Set((me as { saved_pod_ids?: string[] } | null | undefined)?.saved_pod_ids ?? []),
    [me],
  );

  const isSaved = useCallback((podDocId: string) => ids.has(podDocId), [ids]);
  const toggle = useCallback((podDocId: string) => {
    fireAndForget(
      graphqlRequest(ToggleSavedPodDocument, { podDocId }, { auth: true }).then(() =>
        useMeStore.getState().refetch(),
      ),
    );
  }, []);

  return { isSaved, toggle, signedIn: !!me?.user_id };
}
