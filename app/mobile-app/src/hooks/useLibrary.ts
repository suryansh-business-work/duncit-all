import { useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { FaqsDocument } from '@/graphql/library';
import { graphqlRequest } from '@/services/graphql.client';

export type FaqGroup = ResultOf<typeof FaqsDocument>['publicFaqGroups'][number];

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
