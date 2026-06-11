import { useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { CreatePartnerPodDocument, CreatePodOptionsDocument } from '@/graphql/create-pod';
import { buildCreatePodInput } from '@/components/create-pod/create-pod.form';
import type { CreatePodFormValues } from '@/components/create-pod/create-pod.types';
import { graphqlRequest } from '@/services/graphql.client';

type OptionsData = ResultOf<typeof CreatePodOptionsDocument>;
export type CreatePodClub = OptionsData['clubs'][number];
export type CreatePodVenue = OptionsData['myVenues'][number];

/**
 * Data layer for the host Create Pod screen: loads the host status + the
 * clubs/approved venues to pick from, and submits via createPartnerPod (the
 * server attaches the approved host profile).
 */
export function useCreatePod() {
  const [data, setData] = useState<OptionsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    graphqlRequest(CreatePodOptionsDocument, undefined, { auth: true })
      .then((result) => active && setData(result))
      .catch(() => undefined)
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const create = async (values: CreatePodFormValues) => {
    const result = await graphqlRequest(
      CreatePartnerPodDocument,
      { input: buildCreatePodInput(values) },
      { auth: true },
    );
    return result.createPartnerPod.id;
  };

  return {
    isApprovedHost: data?.myHost?.status === 'APPROVED',
    clubs: data?.clubs ?? [],
    venues: (data?.myVenues ?? []).filter(
      (venue) => venue.status === 'APPROVED' && venue.is_active,
    ),
    isLoading,
    create,
  };
}
