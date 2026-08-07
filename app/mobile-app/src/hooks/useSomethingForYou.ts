import { useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { PublicSomethingForYouDocument } from '@/graphql/somethingForYou';
import { graphqlRequest } from '@/services/graphql.client';

/** One card, exactly as the server serves it to both apps. */
export type SomethingForYouCard = ResultOf<
  typeof PublicSomethingForYouDocument
>['publicSomethingForYou'][number];

/**
 * The rail at the bottom of Home, loaded once per mount.
 *
 * A failure resolves to an empty list rather than an error: this row decorates
 * Home, and a promotion that could not load must never be the reason Home looks
 * broken.
 */
export function useSomethingForYou(): SomethingForYouCard[] {
  const [items, setItems] = useState<SomethingForYouCard[]>([]);

  useEffect(() => {
    let active = true;
    graphqlRequest(PublicSomethingForYouDocument, {})
      .then((data) => {
        if (active) setItems(data.publicSomethingForYou);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  return items;
}
