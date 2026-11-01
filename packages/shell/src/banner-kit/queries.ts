import { gql } from '@apollo/client';

/**
 * The banner kit documents every portal sends — the venue's or the host's kit,
 * read through the query its viewer may use (the owner's own, or the console's
 * record), saved through one mutation per entity.
 */
const BANNER_KIT_FIELDS = gql`
  fragment BannerKitFields on BannerKit {
    logo_url
    instagram_handle
    collab_opt_in
    photos {
      url
      caption
    }
    event_photos {
      url
      caption
    }
    tagline
    bio
    brand_color
    suggested_photos
  }
`;

export const OWNER_VENUE_BANNER_KIT = gql`
  query OwnerVenueBannerKit($venue_id: ID!) {
    myVenue(venue_id: $venue_id) {
      id
      name: venue_name
      banner_kit {
        ...BannerKitFields
      }
    }
  }
  ${BANNER_KIT_FIELDS}
`;

export const CONSOLE_VENUE_BANNER_KIT = gql`
  query ConsoleVenueBannerKit($venue_id: ID!) {
    venue(venue_doc_id: $venue_id) {
      id
      name: venue_name
      banner_kit {
        ...BannerKitFields
      }
    }
  }
  ${BANNER_KIT_FIELDS}
`;

export const OWNER_HOST_BANNER_KIT = gql`
  query OwnerHostBannerKit {
    myHost {
      id
      name: full_name
      banner_kit {
        ...BannerKitFields
      }
    }
  }
  ${BANNER_KIT_FIELDS}
`;

export const CONSOLE_HOST_BANNER_KIT = gql`
  query ConsoleHostBannerKit($host_id: ID!) {
    host(host_doc_id: $host_id) {
      id
      name: full_name
      banner_kit {
        ...BannerKitFields
      }
    }
  }
  ${BANNER_KIT_FIELDS}
`;

export const UPDATE_VENUE_BANNER_KIT = gql`
  mutation UpdateVenueBannerKit($venue_id: ID!, $input: BannerKitInput!) {
    updateVenueBannerKit(venue_id: $venue_id, input: $input) {
      id
      banner_kit {
        ...BannerKitFields
      }
    }
  }
  ${BANNER_KIT_FIELDS}
`;

export const UPDATE_HOST_BANNER_KIT = gql`
  mutation UpdateHostBannerKit($host_id: ID!, $input: BannerKitInput!) {
    updateHostBannerKit(host_id: $host_id, input: $input) {
      id
      banner_kit {
        ...BannerKitFields
      }
    }
  }
  ${BANNER_KIT_FIELDS}
`;

/** A partner's next pods, soonest first — the ones worth a banner. */
export const BANNER_PODS = gql`
  query BannerPods($query: TableQueryInput) {
    podsTable(query: $query, lifecycle: UPCOMING) {
      rows {
        id
        pod_title
        pod_date_time
      }
    }
  }
`;

/**
 * Renders a pod's carousel slides from the pod, its venue's and its host's
 * banner kits (the marketing banner engine — server podPromo), in the
 * engine's default style and size.
 */
export const GENERATE_POD_BANNERS = gql`
  mutation GeneratePodBanners($pod_id: ID!) {
    generatePodBanners(pod_id: $pod_id) {
      run_id
      style
      slides {
        url
        kind
      }
    }
  }
`;
