import { useEffect, useState } from 'react';

import { MobileActiveSupportPodsDocument } from '@/graphql/bouncer';
import { graphqlRequest } from '@/services/graphql.client';
import { filterSupportPods, type SupportPodOption } from '@/utils/support-pods';

/** Loads every pod the user has joined and tracks the selected one —
 * RN port of mWeb's usePodPicker. */
export function useSupportPods() {
  const [options, setOptions] = useState<SupportPodOption[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    graphqlRequest(MobileActiveSupportPodsDocument, undefined, { auth: true })
      .then((data) => {
        if (!active) return;
        const next = filterSupportPods(data.myPodMemberships);
        setOptions(next);
        setSelectedId(next[0]?.podDocId ?? '');
      })
      .catch(() => undefined)
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const selected = options.find((o) => o.podDocId === selectedId) ?? null;
  return { options, selected, selectedId, setSelectedId, isLoading };
}
