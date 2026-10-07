import { useSearchParams } from 'react-router';
import { gql, type TypedDocumentNode } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import type { PodRequestSide, PodRequestStatus } from '@duncit/utils';
import { venueSpaces } from './create-pod/steps/VenueSlotStep';
import type { CreatePodFormValues, CreatePodVenue } from './create-pod/create-pod.types';

type Prefill = Pick<
  CreatePodFormValues,
  | 'location_id'
  | 'venue_id'
  | 'venue_space_label'
  | 'no_of_spots'
  | 'venue_slot_id'
  | 'pod_date_time'
  | 'pod_end_date_time'
  | 'partner_request_id'
>;

interface PrefillRequest {
  id: string;
  status: PodRequestStatus;
  viewer_side: PodRequestSide;
  venue: { id: string } | null;
  slot: { id: string; start_at: string; end_at: string; space_label: string } | null;
}

/** Only what the prefill sets — never the other side's contact. */
const CREATE_POD_PARTNER_REQUEST: TypedDocumentNode<{ podPartnerRequest: PrefillRequest }, { id: string }> = gql`
  query CreatePodPartnerRequest($id: ID!) {
    podPartnerRequest(id: $id) {
      id
      status
      viewer_side
      venue {
        id
      }
      slot {
        id
        start_at
        end_at
        space_label
      }
    }
  }
`;

/**
 * `/create-pod?partner_request_id=…` — a Pod Request whose slot is confirmed,
 * laid over a fresh form exactly as step 3's own pickers would set it (venue →
 * its space → the slot window), plus the request id the pod is published
 * against. Anything else (not confirmed, not the host) leaves the form blank.
 */
export function usePartnerRequestPrefill(venues: CreatePodVenue[], enabled: boolean) {
  const [params] = useSearchParams();
  const requestId = enabled ? params.get('partner_request_id') ?? '' : '';
  const query = useQuery(CREATE_POD_PARTNER_REQUEST, {
    variables: { id: requestId },
    skip: !requestId,
    fetchPolicy: 'network-only',
  });
  const loading = !!requestId && query.loading && !query.data;
  const error = query.error?.message ?? null;
  const request = query.data?.podPartnerRequest;
  const venue = venues.find((row) => row.id === request?.venue?.id) ?? null;
  const slot = request?.slot ?? null;
  const usable = request?.status === 'SLOT_CONFIRMED' && request.viewer_side === 'HOST';
  if (!request || !usable || !venue || !slot) return { loading, error, values: null, pinnedVenueId: undefined };

  const values: Partial<Prefill> = {
    venue_id: venue.id,
    venue_slot_id: slot.id,
    pod_date_time: new Date(slot.start_at),
    pod_end_date_time: new Date(slot.end_at),
    partner_request_id: request.id,
  };
  if (venue.location_id) values.location_id = venue.location_id;
  const space = venueSpaces(venue).find((row) => row.slotSpaceLabel === slot.space_label);
  if (space) {
    values.venue_space_label = space.label;
    values.no_of_spots = space.capacity;
  }
  return { loading, error, values, pinnedVenueId: venue.id };
}
