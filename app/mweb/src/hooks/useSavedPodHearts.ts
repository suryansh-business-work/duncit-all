import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import { useCallback, useMemo, useState } from 'react';

const SAVED_POD_IDS = gql`
  query SavedPodIds {
    me {
      user_id
      saved_pod_ids
    }
  }
`;

const TOGGLE_SAVED_POD_CARD = gql`
  mutation ToggleSavedPodCard($pod_doc_id: ID!) {
    toggleSavedPod(pod_doc_id: $pod_doc_id) {
      pod_id
      saved
      saved_pod_ids
    }
  }
`;

/**
 * The save button on pod cards: whether a pod (by DOC id) is in the viewer's
 * saved list, plus the toggle. The Saved page reads the same `saved_pod_ids`,
 * so a toggle here updates it too.
 *
 * `isSaving` covers the mutation's round trip, and the mutation's own answer is
 * what flips the icon (see `update`), so the spinner never clears onto the old
 * state.
 */
export function useSavedPodHearts() {
  const { data } = useQuery<{ me?: { user_id: string; saved_pod_ids: string[] } | null }>(
    SAVED_POD_IDS,
    { fetchPolicy: 'cache-and-network' }
  );
  const meId = data?.me?.user_id;
  const [toggleMut] = useMutation<any>(TOGGLE_SAVED_POD_CARD, {
    // The answer carries the whole saved list, so it goes onto the viewer's User
    // entry and every reader of saved_pod_ids updates from the mutation itself —
    // not from a follow-up `me` round trip after it.
    update(cache, { data: result }) {
      const next = result?.toggleSavedPod?.saved_pod_ids;
      if (!next || !meId) return;
      cache.modify({
        id: cache.identify({ __typename: 'User', user_id: meId }),
        fields: { saved_pod_ids: () => next },
      });
    },
  });

  const [savingId, setSavingId] = useState<string | null>(null);

  const ids = useMemo(() => new Set(data?.me?.saved_pod_ids ?? []), [data?.me?.saved_pod_ids]);
  const isSaved = useCallback((podDocId: string) => ids.has(podDocId), [ids]);
  const isSaving = useCallback((podDocId: string) => savingId === podDocId, [savingId]);
  const toggle = useCallback(
    (podDocId: string) => {
      setSavingId(podDocId);
      toggleMut({ variables: { pod_doc_id: podDocId } })
        .catch(() => undefined)
        // Only clear our own pod: a second card tapped meanwhile owns the flag.
        .finally(() => setSavingId((current) => (current === podDocId ? null : current)));
    },
    [toggleMut]
  );

  // Signed-out visitors have no saved list — the cards hide the button then.
  return { isSaved, isSaving, toggle, signedIn: !!data?.me?.user_id };
}
