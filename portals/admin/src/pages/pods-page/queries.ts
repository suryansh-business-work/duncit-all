import { gql } from '@apollo/client';

export const PODS = gql`
  query Pods($filter: PodFilterInput) {
    pods(filter: $filter) {
      id
      pod_id
      pod_title
      pod_hosts_id
      location_id
      venue_id
      club_id
      pod_mode
      meeting_platform
      meeting_url
      meeting_notes
      pod_hashtag
      pod_images_and_videos {
        url
        type
      }
      reel_url
      pod_hits
      pod_attendees
      pod_description
      pod_date_time
      pod_end_date_time
      pod_type
      pod_amount
      pod_occurrence
      no_of_spots
      pod_info
      what_this_pod_offers
      available_perks
      payment_terms
      place_charges {
        label
        amount
        note
      }
      products_enabled
      product_requests {
        product_id
        product_name
        unit_cost
        quantity
        total_cost
      }
      product_cost_total
      is_active
      completed_at
      zone_name
    }
  }
`;
/** Row shape used by the pods table and the deep-link edit fetch. */
export interface PodRow {
  id: string;
  pod_id: string;
  pod_title: string;
  club_id: string;
  venue_id?: string | null;
  location_id?: string | null;
  pod_mode: string;
  meeting_platform?: string | null;
  pod_images_and_videos?: { url: string; type: string }[] | null;
  pod_hits: number;
  pod_attendees?: string[] | null;
  pod_date_time?: string | null;
  pod_type: string;
  pod_amount: number;
  no_of_spots?: number | null;
  product_requests?: { product_id: string; product_name: string; quantity: number }[] | null;
  product_cost_total?: number | null;
  is_active: boolean;
  completed_at?: string | null;
  created_at?: string | null;
}

/** Same selection as PODS rows (+ created_at for the table's Created filter),
 * so table rows can feed the edit dialogs without a second fetch. */
const POD_ROW_FIELDS = gql`
  fragment PodRowFields on Pod {
    id
    pod_id
    pod_title
    pod_hosts_id
    location_id
    venue_id
    club_id
    pod_mode
    meeting_platform
    meeting_url
    meeting_notes
    pod_hashtag
    pod_images_and_videos {
      url
      type
    }
    reel_url
    pod_hits
    pod_attendees
    pod_description
    pod_date_time
    pod_end_date_time
    pod_type
    pod_amount
    pod_occurrence
    no_of_spots
    pod_info
    what_this_pod_offers
    available_perks
    payment_terms
    place_charges {
      label
      amount
      note
    }
    products_enabled
    product_requests {
      product_id
      product_name
      unit_cost
      quantity
      total_cost
    }
    product_cost_total
    is_active
    completed_at
    created_at
    zone_name
  }
`;

export const PODS_TABLE = gql`
  query PodsTable($query: TableQueryInput) {
    podsTable(query: $query) {
      total
      rows {
        ...PodRowFields
      }
    }
  }
  ${POD_ROW_FIELDS}
`;

/** Single-pod fetch for the /pods?edit=<id> deep-link (rows are paged now). */
export const POD_FOR_EDIT = gql`
  query PodForEdit($id: ID!) {
    pod(pod_doc_id: $id) {
      ...PodRowFields
    }
  }
  ${POD_ROW_FIELDS}
`;

export const CLUBS = gql`
  query AllClubs {
    clubs {
      id
      club_id
      club_name
      super_category_id
      category_id
      matched_venues {
        id
      }
    }
  }
`;
export const FINANCE_FOR_PODS = gql`
  query FinanceForPods {
    publicFinanceSettings {
      platform_fee_pct
      gst_pct
      currency_symbol
    }
  }
`;
export const LOCATIONS = gql`
  query AllLocations {
    locations {
      id
      location_id
      location_name
      city
      state
      location_zones {
        zone_name
      }
    }
  }
`;
export const APPROVED_VENUES = gql`
  query ApprovedVenuesForPods {
    venues(status: APPROVED) {
      id
      venue_name
      address_line1
      address_line2
      country
      city
      state
      locality
      postal_code
      lat
      lng
    }
  }
`;
export const INVENTORY_PRODUCTS = gql`
  query InventoryProductsForPods {
    inventoryProducts(activeOnly: true) {
      id
      product_name
      sku
      unit_cost
      inventory_count
      requested_count
      available_count
      is_active
      listing_review_status
      listing_submitted_by_name
      super_category_id
      category_id
      sub_category_id
      categories {
        super_category_id
        category_id
        sub_category_id
      }
    }
  }
`;
export const USERS = gql`
  query AllUsersForPods {
    users {
      user_id
      full_name
      email
    }
  }
`;
export const CREATE = gql`
  mutation CreatePod($input: CreatePodInput!) {
    createPod(input: $input) {
      id
    }
  }
`;
export const UPDATE = gql`
  mutation UpdatePod($id: ID!, $input: UpdatePodInput!) {
    updatePod(pod_doc_id: $id, input: $input) {
      id
    }
  }
`;
export const DELETE = gql`
  mutation DeletePod($id: ID!) {
    deletePod(pod_doc_id: $id)
  }
`;
export const COMPLETE_POD_SETTLEMENT = gql`
  mutation AdminCompletePodSettlement($input: CompletePodInput!) {
    completePodSettlement(input: $input) {
      settlement {
        currency_symbol
      }
      releases {
        id
        release_id
        kind
        status
        amount_requested
      }
    }
  }
`;

export const POD_SETTLEMENT_PREVIEW = gql`
  query AdminPodSettlementPreview($pod_id: ID!, $venue_bill_amount: Float!) {
    podSettlementPreview(pod_id: $pod_id, venue_bill_amount: $venue_bill_amount) {
      currency_symbol
      collected_total
      has_venue
      waterfall {
        version
        amount
        gst_pct
        gst_amount
        net_amount
        platform_fee_pct
        platform_fee_amount
        pool_amount
        venue_amount
        venue_commission_pct
        venue_commission_amount
        venue_receives
        host_amount
        host_commission_pct
        host_commission_amount
        host_receives
        duncit_revenue
        host_earn_pct
      }
    }
  }
`;
