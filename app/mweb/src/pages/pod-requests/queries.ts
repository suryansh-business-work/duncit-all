import { gql, type TypedDocumentNode } from '@apollo/client';
import type { PodRequestDirection, PodRequestSide, PodRequestStatus } from '@duncit/utils';

/** The venue half of a request, as a host sees it before any pod: the place, never the owner's contact. */
export interface PodRequestVenue {
  id: string;
  venue_name: string;
  category: string;
  venue_type?: string;
  capacity?: number;
  locality: string;
  city: string;
  cover_image_url: string;
}

/** The host half of a request: name, photo and categories, never a phone or email. */
export interface PodRequestHost {
  user_id: string;
  name: string;
  photo_url: string;
  categories: string[];
}

export interface PodRequestSlot {
  id: string;
  start_at: string;
  end_at: string;
  whole_day: boolean;
  price: number;
  space_label: string;
}

/** One request as the studio lists render it. */
export interface PodRequestRowData {
  id: string;
  direction: PodRequestDirection;
  status: PodRequestStatus;
  viewer_side: PodRequestSide;
  note: string;
  venue: PodRequestVenue | null;
  host: PodRequestHost | null;
  created_at: string;
}

/** One request as its detail page renders it. Contact is null until POD_CREATED. */
export interface PodRequestDetail extends PodRequestRowData {
  distance_km: number | null;
  slot: PodRequestSlot | null;
  pod_id: string | null;
  contact: { phone: string; email: string; address: string | null } | null;
}

/** What a write hands back: enough for the cache to move the row. */
type Moved<K extends string> = Record<K, { id: string; status: PodRequestStatus }>;

/** Every request on one side: Host Studio reads HOST, Venue Studio VENUE (narrowed to the selected venue). */
export const MY_POD_PARTNER_REQUESTS: TypedDocumentNode<
  { myPodPartnerRequests: PodRequestRowData[] },
  { side: PodRequestSide; venue_id?: string | null }
> = gql`
  query MyPodPartnerRequests($side: PartnerSide!, $venue_id: ID) {
    myPodPartnerRequests(side: $side, venue_id: $venue_id) {
      id
      direction
      status
      viewer_side
      note
      venue {
        id
        venue_name
        category
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
      created_at
    }
  }
`;

export const POD_PARTNER_REQUEST: TypedDocumentNode<{ podPartnerRequest: PodRequestDetail }, { id: string }> = gql`
  query PodPartnerRequestDetail($id: ID!) {
    podPartnerRequest(id: $id) {
      id
      direction
      status
      viewer_side
      note
      distance_km
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
        price
        space_label
      }
      pod_id
      contact {
        phone
        email
        address
      }
      created_at
    }
  }
`;

export const RESPOND_POD_PARTNER_REQUEST: TypedDocumentNode<
  Moved<'respondPodPartnerRequest'>,
  { id: string; accept: boolean }
> = gql`
  mutation RespondPodPartnerRequest($id: ID!, $accept: Boolean!) {
    respondPodPartnerRequest(id: $id, accept: $accept) {
      id
      status
    }
  }
`;

export const CANCEL_POD_PARTNER_REQUEST: TypedDocumentNode<Moved<'cancelPodPartnerRequest'>, { id: string }> = gql`
  mutation CancelPodPartnerRequest($id: ID!) {
    cancelPodPartnerRequest(id: $id) {
      id
      status
    }
  }
`;

export const REQUEST_POD_PARTNER_SLOT: TypedDocumentNode<Moved<'requestPodPartnerSlot'>, { id: string; slot_id: string }> = gql`
  mutation RequestPodPartnerSlot($id: ID!, $slot_id: ID!) {
    requestPodPartnerSlot(id: $id, slot_id: $slot_id) {
      id
      status
    }
  }
`;

export const RESPOND_POD_PARTNER_SLOT: TypedDocumentNode<Moved<'respondPodPartnerSlot'>, { id: string; confirm: boolean }> = gql`
  mutation RespondPodPartnerSlot($id: ID!, $confirm: Boolean!) {
    respondPodPartnerSlot(id: $id, confirm: $confirm) {
      id
      status
    }
  }
`;
