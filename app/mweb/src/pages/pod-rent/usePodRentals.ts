import { useMemo } from 'react';
import { gql, type TypedDocumentNode } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import {
  POD_RENTALS_QUERY,
  PUBLIC_RENTAL_SETTINGS_QUERY,
  type PodRentalCatalogue,
  type PublicRentalSettings,
} from '@duncit/utils';

const POD_RENTALS: TypedDocumentNode<{ podRentals: PodRentalCatalogue }, { pod_id: string }> = gql(POD_RENTALS_QUERY);
const PUBLIC_RENTAL_SETTINGS: TypedDocumentNode<{ publicRentalSettings: PublicRentalSettings }, Record<string, never>> =
  gql(PUBLIC_RENTAL_SETTINGS_QUERY);

/**
 * What a pod's venue rents out, how much is left, and the rules a guest
 * agrees to. Skipped for a pod with no venue (virtual or not yet placed).
 */
export function usePodRentals(podId: string | null | undefined, hasVenue: boolean) {
  const skip = !podId || !hasVenue;
  const catalogue = useQuery(POD_RENTALS, {
    variables: { pod_id: podId ?? '' },
    skip,
    fetchPolicy: 'cache-and-network',
  });
  const settings = useQuery(PUBLIC_RENTAL_SETTINGS, { skip, fetchPolicy: 'cache-first' });
  return useMemo(
    () => ({
      catalogue: catalogue.data?.podRentals ?? null,
      settings: settings.data?.publicRentalSettings ?? null,
      loading: catalogue.loading && !catalogue.data,
      error: catalogue.error ?? settings.error ?? null,
      refetch: () => {
        catalogue.refetch().catch(() => undefined);
        settings.refetch().catch(() => undefined);
      },
    }),
    [catalogue, settings]
  );
}

export type PodRentals = ReturnType<typeof usePodRentals>;
