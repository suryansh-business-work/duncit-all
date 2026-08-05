import { useCallback, useMemo, useState } from 'react';

import { ToggleSavedPodDocument } from '@/graphql/explore';
import { graphqlRequest } from '@/services/graphql.client';
import { useMe } from '@/hooks/useMe';
import { useMeStore } from '@/stores/me.store';
import { fireAndForget } from '@/utils/fire-and-forget';

/**
 * The save button on home pod cards: whether a pod (by DOC id) is in the
 * viewer's saved list, plus the toggle. Twin of mWeb's useSavedPodHearts; the
 * `me` store is refetched after a toggle so every reader of `saved_pod_ids`
 * agrees (the Saved screen queries the server directly and picks it up on
 * focus).
 *
 * `isSaving` covers the whole round trip INCLUDING that refetch, because the
 * refetch is what flips the icon — clearing the spinner earlier would leave the
 * old state on screen with nothing to explain it.
 */
export function useSavedPodHearts() {
  const me = useMe().data?.me;
  const [savingId, setSavingId] = useState<string | null>(null);
  const ids = useMemo(
    () => new Set((me as { saved_pod_ids?: string[] } | null | undefined)?.saved_pod_ids ?? []),
    [me],
  );

  const isSaved = useCallback((podDocId: string) => ids.has(podDocId), [ids]);
  const isSaving = useCallback((podDocId: string) => savingId === podDocId, [savingId]);
  const toggle = useCallback((podDocId: string) => {
    setSavingId(podDocId);
    fireAndForget(
      graphqlRequest(ToggleSavedPodDocument, { podDocId }, { auth: true })
        .then(() => useMeStore.getState().refetch())
        // Only clear our own pod: a second card tapped meanwhile owns the flag.
        .finally(() => setSavingId((current) => (current === podDocId ? null : current))),
    );
  }, []);

  return { isSaved, isSaving, toggle, signedIn: !!me?.user_id };
}
