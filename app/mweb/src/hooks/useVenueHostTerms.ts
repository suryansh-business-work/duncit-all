import { useMemo } from 'react';
import { gql, type TypedDocumentNode } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { venueHostTermsById, type VenueHostTerms } from '@duncit/utils';

export const VENUE_HOST_TERMS: TypedDocumentNode<{ venueHostTerms: VenueHostTerms[] }, { venue_ids: string[] }> = gql`
  query VenueHostTerms($venue_ids: [ID!]!) {
    venueHostTerms(venue_ids: $venue_ids) {
      venue_id
      min_guests
      min_business {
        model
        amount
      }
      min_spend
      cleaning_fee
      pet_fee
      deposit
      gst_enabled
    }
  }
`;

/** A signed-out visitor is never a host — the query is not even asked. */
function signedIn(): boolean {
  try {
    return !!globalThis.localStorage?.getItem('token');
  } catch {
    return false;
  }
}

/**
 * Fees & Minimum Spend of the listed venues, for a host weighing them. The
 * server answers only for an active host, so for anyone else the map stays
 * empty and the surfaces show what they always did. Native twin:
 * hooks/useVenueHostTerms.
 */
export function useVenueHostTerms(venueIds: readonly string[]) {
  const ids = useMemo(() => [...new Set(venueIds)].sort(), [venueIds]);
  const { data, loading, error, refetch } = useQuery(VENUE_HOST_TERMS, {
    variables: { venue_ids: ids },
    skip: ids.length === 0 || !signedIn(),
    fetchPolicy: 'cache-and-network',
  });
  const byId = useMemo(() => venueHostTermsById(data?.venueHostTerms), [data]);
  return { byId, loading: loading && !data, error, refetch };
}
