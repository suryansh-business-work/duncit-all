import { useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { FaqsDocument, MyPodsDocument } from '@/graphql/library';
import { graphqlRequest } from '@/services/graphql.client';

export type FaqGroup = ResultOf<typeof FaqsDocument>['publicFaqGroups'][number];
type MyPodsData = ResultOf<typeof MyPodsDocument>;
export type LibraryPod = MyPodsData['pods'][number];

/** FAQ groups for the FAQs page (auth). */
export function useFaqs() {
  const [groups, setGroups] = useState<FaqGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    let active = true;
    graphqlRequest(FaqsDocument, undefined, { auth: true })
      .then((data) => active && setGroups(data.publicFaqGroups))
      .catch((err) => active && setError(err))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return { groups, isLoading, error };
}

/** Saved pods + the user's pod history (attended/hosted), derived from the feed. */
export function useMyPods() {
  const [data, setData] = useState<MyPodsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    let active = true;
    graphqlRequest(MyPodsDocument, undefined, { auth: true })
      .then((result) => active && setData(result))
      .catch((err) => active && setError(err))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const me = data?.me ?? null;
  const pods = data?.pods ?? [];
  const savedIds = new Set(me?.saved_pod_ids ?? []);
  const savedPods = pods.filter((p) => savedIds.has(p.id));
  const historyPods = pods.filter((p) =>
    me ? p.pod_attendees.includes(me.user_id) || p.pod_hosts_id.includes(me.user_id) : false,
  );

  return { savedPods, historyPods, isLoading, error };
}
