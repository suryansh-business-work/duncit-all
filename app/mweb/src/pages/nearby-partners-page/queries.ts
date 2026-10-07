import { gql, type TypedDocumentNode } from '@apollo/client';
import type { PodRequestDirection, PodRequestSide, PodRequestStatus } from '@duncit/utils';

/** The search a nearby query sends: the header's city + area, the radius and the category filter. */
export interface NearbySearchInput {
  location_id: string;
  zone_name: string | null;
  radius_km: number;
  category_ids: string[];
}

export interface NearbyHostRow {
  user_id: string;
  name: string;
  photo_url: string;
  categories: string[];
  distance_km: number;
  open_request_status: PodRequestStatus | null;
}

export interface NearbyVenueRow {
  id: string;
  venue_name: string;
  category: string;
  locality: string;
  city: string;
  cover_image_url: string;
  distance_km: number;
  open_request_status: PodRequestStatus | null;
}

export interface PodRequestQuota {
  limit: number;
  remaining: number;
}

export interface SearchCategory {
  id: string;
  name: string;
  is_active: boolean;
}

/** An owner's venue in the search's picker; its category seeds the filter. */
export interface SearchVenue {
  id: string;
  venue_name: string;
  city: string;
  status: string;
  venue_category: { category_id: string | null };
}

export interface SendPodRequestInput {
  direction: PodRequestDirection;
  venue_id: string;
  host_user_id?: string | null;
  note: string | null;
}

export const NEARBY_HOSTS_FOR_VENUE: TypedDocumentNode<
  { nearbyHostsForVenue: NearbyHostRow[] },
  { venue_id: string; search: NearbySearchInput }
> = gql`
  query NearbyHostsForVenue($venue_id: ID!, $search: NearbyPartnerSearchInput!) {
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

export const NEARBY_VENUES_FOR_HOST: TypedDocumentNode<{ nearbyVenuesForHost: NearbyVenueRow[] }, { search: NearbySearchInput }> = gql`
  query NearbyVenuesForHost($search: NearbyPartnerSearchInput!) {
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

/** This month's sending allowance — as a host, or for one venue. */
export const POD_REQUEST_QUOTA: TypedDocumentNode<
  { podPartnerRequestQuota: PodRequestQuota },
  { side: PodRequestSide; venue_id?: string | null }
> = gql`
  query PodPartnerRequestQuota($side: PartnerSide!, $venue_id: ID) {
    podPartnerRequestQuota(side: $side, venue_id: $venue_id) {
      limit
      remaining
    }
  }
`;

export const SEND_POD_PARTNER_REQUEST: TypedDocumentNode<
  { sendPodPartnerRequest: { id: string; status: PodRequestStatus } },
  { input: SendPodRequestInput }
> = gql`
  mutation SendPodPartnerRequest($input: SendPodPartnerRequestInput!) {
    sendPodPartnerRequest(input: $input) {
      id
      status
    }
  }
`;

/** The filter's chips: the Category level, the one hosts and venues are both tagged at. */
export const SEARCH_CATEGORIES: TypedDocumentNode<{ categories: SearchCategory[] }> = gql`
  query PodRequestSearchCategories {
    categories(filter: { level: CATEGORY }) {
      id
      name
      is_active
    }
  }
`;

export const SEARCH_OWNER_VENUES: TypedDocumentNode<{ myVenues: SearchVenue[] }> = gql`
  query PodRequestSearchVenues {
    myVenues {
      id
      venue_name
      city
      status
      venue_category {
        category_id
      }
    }
  }
`;

/** The host's own categories seed the venue search's filter. */
export const SEARCH_HOST_CATEGORIES: TypedDocumentNode<{
  myHost: { id: string; host_categories: { category_id: string | null }[] } | null;
}> = gql`
  query PodRequestSearchHostCategories {
    myHost {
      id
      host_categories {
        category_id
      }
    }
  }
`;
