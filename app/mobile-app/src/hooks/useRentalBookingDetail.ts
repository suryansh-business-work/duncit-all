import { useCallback, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import type { RentalProofValues } from '@duncit/utils';

import {
  AddRentalBookingProofDocument,
  RentalBookingDetailDocument,
} from '@/graphql/venue-rentals-desk';
import { useReloadableQuery } from '@/hooks/useReloadableQuery';
import { graphqlRequest } from '@/services/graphql.client';

export type RentalDetail = ResultOf<typeof RentalBookingDetailDocument>['rentalBookingDetail'];

/**
 * One rental as its venue sees it, and the venue's optional proof on it. The
 * proof answers with the whole rental, so the screen swaps it in.
 */
export function useRentalBookingDetail(id: string) {
  const [detail, setDetail] = useState<RentalDetail | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    const data = await graphqlRequest(RentalBookingDetailDocument, { id }, { auth: true });
    setDetail(data.rentalBookingDetail);
    setFailed(false);
  }, [id]);
  const query = useReloadableQuery(load, { enabled: Boolean(id), onError: () => setFailed(true) });

  const addProof = useCallback(
    async (input: RentalProofValues) => {
      const data = await graphqlRequest(
        AddRentalBookingProofDocument,
        { id, input: { note: input.note, image_urls: input.image_urls } },
        { auth: true },
      );
      setDetail(data.addRentalBookingProof);
    },
    [id],
  );

  return {
    detail,
    failed,
    loading: query.isLoading && !detail,
    refetch: query.refetch,
    addProof,
  };
}
