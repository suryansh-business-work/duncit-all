import { gql } from '@apollo/client';
import type {
  NearbyHost,
  NearbyVenue,
  PartnerContact,
  PartnerHostSummary,
  PartnerRequestQuota,
  PartnerRequestSlot,
  PartnerSide,
  PartnerVenueSummary,
  PodPartnerRequest,
  VenueSlot,
} from '@duncit/gql-types';

/**
 * Pod Requests between venues and hosts — the Partners console's documents.
 * Contact details are never selected here except on the one request, where the
 * server answers them only once the pod exists (`contact` is null before).
 */

/** One row of a studio list: who, what state, when. */
export const MY_POD_REQUESTS = gql`
  query PartnersMyPodRequests($side: PartnerSide!) {
    myPodPartnerRequests(side: $side) {
      id
      direction
      status
      viewer_side
      created_at
      venue {
        id
        venue_name
        locality
        city
        cover_image_url
      }
      host {
        user_id
        name
        photo_url
      }
    }
  }
`;

export const POD_REQUEST_DETAIL = gql`
  query PartnersPodRequest($id: ID!) {
    podPartnerRequest(id: $id) {
      id
      direction
      status
      viewer_side
      note
      distance_km
      pod_id
      created_at
      venue {
        id
        venue_name
        category
        venue_type
        capacity
        locality
        city
        cover_image_url
      }
      host {
        user_id
        name
        photo_url
        categories
      }
      slot {
        id
        start_at
        end_at
        whole_day
        space_label
      }
      contact {
        phone
        email
        address
      }
    }
  }
`;

/** The venue's open slots, for the side that picks one. */
export const POD_REQUEST_VENUE_SLOTS = gql`
  query PartnersPodRequestVenueSlots($venue_id: ID!) {
    venueAvailableSlots(venue_id: $venue_id) {
      id
      start_at
      end_at
      whole_day
      price
      space_label
    }
  }
`;

export const POD_REQUEST_QUOTA = gql`
  query PartnersPodRequestQuota($side: PartnerSide!, $venue_id: ID) {
    podPartnerRequestQuota(side: $side, venue_id: $venue_id) {
      limit
      remaining
    }
  }
`;

export const NEARBY_HOSTS = gql`
  query PartnersNearbyHosts($venue_id: ID!, $search: NearbyPartnerSearchInput!) {
    nearbyHostsForVenue(venue_id: $venue_id, search: $search) {
      user_id
      name
      photo_url
      categories
      distance_km
      open_request_status
    }
  }
`;

export const NEARBY_VENUES = gql`
  query PartnersNearbyVenues($search: NearbyPartnerSearchInput!) {
    nearbyVenuesForHost(search: $search) {
      id
      venue_name
      category
      locality
      city
      cover_image_url
      distance_km
      open_request_status
    }
  }
`;

/** The owner's venues the host search runs from: place + default category. */
export const NEARBY_SEARCH_VENUES = gql`
  query PartnersNearbySearchVenues {
    myVenues {
      id
      venue_name
      status
      is_active
      location_id
      locality
      venue_category {
        category_id
      }
    }
  }
`;

/** The host's own categories — the venue search's default filter. */
export const NEARBY_SEARCH_HOST = gql`
  query PartnersNearbySearchHost {
    myHost {
      id
      host_categories {
        category_id
      }
    }
  }
`;

export const SEND_POD_REQUEST = gql`
  mutation PartnersSendPodRequest($input: SendPodPartnerRequestInput!) {
    sendPodPartnerRequest(input: $input) {
      id
      status
    }
  }
`;

export const RESPOND_POD_REQUEST = gql`
  mutation PartnersRespondPodRequest($id: ID!, $accept: Boolean!) {
    respondPodPartnerRequest(id: $id, accept: $accept) {
      id
      status
    }
  }
`;

export const CANCEL_POD_REQUEST = gql`
  mutation PartnersCancelPodRequest($id: ID!) {
    cancelPodPartnerRequest(id: $id) {
      id
      status
    }
  }
`;

export const REQUEST_POD_REQUEST_SLOT = gql`
  mutation PartnersRequestPodRequestSlot($id: ID!, $slot_id: ID!) {
    requestPodPartnerSlot(id: $id, slot_id: $slot_id) {
      id
      status
    }
  }
`;

export const RESPOND_POD_REQUEST_SLOT = gql`
  mutation PartnersRespondPodRequestSlot($id: ID!, $confirm: Boolean!) {
    respondPodPartnerSlot(id: $id, confirm: $confirm) {
      id
      status
    }
  }
`;

type RequestCore = Pick<PodPartnerRequest, 'id' | 'direction' | 'status' | 'viewer_side' | 'created_at'>;

export type PodRequestRow = RequestCore & {
  venue?: Pick<PartnerVenueSummary, 'id' | 'venue_name' | 'locality' | 'city' | 'cover_image_url'> | null;
  host?: Pick<PartnerHostSummary, 'user_id' | 'name' | 'photo_url'> | null;
};

export type PodRequestDetail = RequestCore &
  Pick<PodPartnerRequest, 'note' | 'distance_km' | 'pod_id'> & {
    venue?: Omit<PartnerVenueSummary, '__typename'> | null;
    host?: Omit<PartnerHostSummary, '__typename'> | null;
    slot?: Pick<PartnerRequestSlot, 'id' | 'start_at' | 'end_at' | 'whole_day' | 'space_label'> | null;
    contact?: Omit<PartnerContact, '__typename'> | null;
  };

export type PodRequestSlot = Pick<VenueSlot, 'id' | 'start_at' | 'end_at' | 'whole_day' | 'price' | 'space_label'>;
export type PodRequestQuota = Pick<PartnerRequestQuota, 'limit' | 'remaining'>;
export type NearbyHostResult = Omit<NearbyHost, '__typename'>;
export type NearbyVenueResult = Omit<NearbyVenue, '__typename' | 'capacity' | 'venue_type'>;
export type PodRequestSide = PartnerSide;

export interface SearchVenue {
  id: string;
  venue_name: string;
  status: string;
  is_active: boolean;
  location_id?: string | null;
  locality: string;
  venue_category: { category_id?: string | null };
}
