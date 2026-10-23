import { gql } from '@/generated/graphql';

/**
 * Pod Requests between venues and hosts, on the phone — the same operations
 * mWeb's pod-requests / nearby-partners pages fire (rule 27). Only what the
 * screens draw is asked for; the other side's contact is read on the detail
 * query alone, and the API only fills it once the pod exists.
 */
export const MyPodPartnerRequestsDocument = gql(`
  query MobileMyPodPartnerRequests($side: PartnerSide!, $venue_id: ID) {
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
`);

export const PodPartnerRequestDocument = gql(`
  query MobilePodPartnerRequestDetail($id: ID!) {
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
        categories
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
        offer {
          model
          rate
          pax
          quote {
            venue_payout
            platform_fee
            total
          }
        }
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
`);

/** The pod's public address is its club slug + pod slug; the request only carries its id. */
export const PodRequestPodLinkDocument = gql(`
  query MobilePodRequestPodLink($pod_doc_id: ID!) {
    pod(pod_doc_id: $pod_doc_id) {
      id
      pod_id
      club_slug
    }
  }
`);

export const RespondPodPartnerRequestDocument = gql(`
  mutation MobileRespondPodPartnerRequest($id: ID!, $accept: Boolean!) {
    respondPodPartnerRequest(id: $id, accept: $accept) {
      id
      status
    }
  }
`);

export const CancelPodPartnerRequestDocument = gql(`
  mutation MobileCancelPodPartnerRequest($id: ID!) {
    cancelPodPartnerRequest(id: $id) {
      id
      status
    }
  }
`);

/** The receiver proposes a window, guests and price terms; the time is held for the sender's answer. */
export const ProposePodPartnerWindowDocument = gql(`
  mutation MobileProposePodPartnerWindow($id: ID!, $offer: VenueOfferInput!) {
    proposePodPartnerWindow(id: $id, offer: $offer) {
      id
      status
    }
  }
`);

/** What a proposed window and terms would cost — or why they cannot be proposed. */
export const PodPartnerWindowQuoteDocument = gql(`
  query MobilePodPartnerWindowQuote($id: ID!, $offer: VenueOfferInput!) {
    podPartnerWindowQuote(id: $id, offer: $offer) {
      ...MobileOfferQuoteResult
    }
  }
`);

export const RespondPodPartnerSlotDocument = gql(`
  mutation MobileRespondPodPartnerSlot($id: ID!, $confirm: Boolean!) {
    respondPodPartnerSlot(id: $id, confirm: $confirm) {
      id
      status
    }
  }
`);

export const NearbyHostsForVenueDocument = gql(`
  query MobileNearbyHostsForVenue($venue_id: ID!, $search: NearbyPartnerSearchInput!) {
    nearbyHostsForVenue(venue_id: $venue_id, search: $search) {
      user_id
      name
      photo_url
      categories
      distance_km
      open_request_status
    }
  }
`);

export const NearbyVenuesForHostDocument = gql(`
  query MobileNearbyVenuesForHost($search: NearbyPartnerSearchInput!) {
    nearbyVenuesForHost(search: $search) {
      id
      venue_name
      category
      categories
      locality
      city
      cover_image_url
      distance_km
      open_request_status
    }
  }
`);

/** This month's sending allowance — as a host, or for one venue. */
export const PodRequestQuotaDocument = gql(`
  query MobilePodPartnerRequestQuota($side: PartnerSide!, $venue_id: ID) {
    podPartnerRequestQuota(side: $side, venue_id: $venue_id) {
      limit
      remaining
    }
  }
`);

export const SendPodPartnerRequestDocument = gql(`
  mutation MobileSendPodPartnerRequest($input: SendPodPartnerRequestInput!) {
    sendPodPartnerRequest(input: $input) {
      id
      status
    }
  }
`);

/** The owner's venues for the host search's picker; the categories seed the filter
 * (every one the venue has; `venue_category` is only the primary). */
export const PodRequestSearchVenuesDocument = gql(`
  query MobilePodRequestSearchVenues {
    myVenues {
      id
      venue_name
      city
      status
      venue_category {
        category_id
      }
      venue_categories {
        category_id
      }
    }
  }
`);

/** The host's own categories seed the venue search's filter. */
export const PodRequestHostCategoriesDocument = gql(`
  query MobilePodRequestHostCategories {
    myHost {
      id
      host_categories {
        category_id
      }
    }
  }
`);

/** Create Pod's prefill: only what it sets — never the other side's contact. */
export const CreatePodPartnerRequestDocument = gql(`
  query MobileCreatePodPartnerRequest($id: ID!) {
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
`);
