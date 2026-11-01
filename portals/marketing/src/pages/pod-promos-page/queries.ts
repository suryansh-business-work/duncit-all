import { gql } from '@apollo/client';

export type PodPromoStatus = 'PLANNED' | 'BANNER_READY' | 'SCHEDULED' | 'PUBLISHED' | 'SKIPPED' | 'FAILED' | 'CANCELLED';
export type PodPromoBannerStyle = 'PORTRAIT' | 'SQUARE';
export type PodPromoPriceFilter = 'ALL' | 'PAID' | 'FREE';
export type PodPromoSource = 'AUTO' | 'MANUAL';
export type PodBannerStyle = 'FESTIVE_BOLD' | 'ELEGANT_SERIF' | 'SPORT_NIGHT' | 'PLAYFUL_PASTEL' | 'CALM_WELLNESS';
export type PodBannerSlideKind = 'COVER' | 'DETAILS' | 'HOST' | 'VENUE' | 'BOOK';

/** One rendered slide of a pod's carousel. */
export interface PodBannerSlide {
  kind: PodBannerSlideKind;
  url: string;
}

export interface PodPromoSettings {
  enabled: boolean;
  days_before: number;
  post_hour: number;
  account_ids: string[];
  needs_approval: boolean;
  city_ids: string[];
  club_ids: string[];
  category_ids: string[];
  price_filter: PodPromoPriceFilter;
  min_days_until_start: number;
  banner_style: PodPromoBannerStyle;
  cta_text: string;
  utm_prefix: string;
  time_zone: string;
  updated_by_name: string;
  updated_at: string | null;
}

export type PodPromoSettingsInput = Omit<PodPromoSettings, 'time_zone' | 'updated_by_name' | 'updated_at'>;

export interface PodPromoFigures {
  clicks: number;
  unique_visitors: number;
  signups: number;
  pod_views: number;
  checkouts: number;
  bookings: number;
  paid_bookings: number;
  payments: number;
  revenue: number;
  likes: number;
  comments: number;
  engagement: number;
  updated_at: string | null;
}

export interface PodPromo {
  id: string;
  pod_id: string;
  pod_title: string;
  pod_start: string;
  club_name: string;
  city_name: string;
  pod_url: string;
  status: PodPromoStatus;
  source: PodPromoSource;
  banner_url: string;
  style: PodBannerStyle;
  slides: PodBannerSlide[];
  collaborators: string[];
  caption: string;
  hashtags: string[];
  ai_caption: boolean;
  tracking_url: string;
  scheduled_post_id: string | null;
  post_status: string;
  permalink: string;
  scheduled_at: string | null;
  error: string;
  figures: PodPromoFigures;
}

export interface PodPromoSummary {
  planned: number;
  scheduled: number;
  published: number;
  failed: number;
  clicks: number;
  bookings: number;
  payments: number;
  revenue: number;
}

export interface PodPromoPreview {
  pod_id: string;
  pod_title: string;
  banner_url: string;
  banner_style: PodPromoBannerStyle;
  style: PodBannerStyle;
  slides: PodBannerSlide[];
  collaborators: string[];
  caption: string;
  hashtags: string[];
  ai_caption: boolean;
  scheduled_at: string | null;
  ineligible_reason: string;
}

export interface PodPromoCandidate {
  id: string;
  title: string;
  starts_at: string;
  club_name: string;
  promo_status: PodPromoStatus | null;
}

export interface PickOption {
  id: string;
  label: string;
}

const SETTINGS_FIELDS = gql`
  fragment PodPromoSettingsFields on PodPromoSettings {
    enabled
    days_before
    post_hour
    account_ids
    needs_approval
    city_ids
    club_ids
    category_ids
    price_filter
    min_days_until_start
    banner_style
    cta_text
    utm_prefix
    time_zone
    updated_by_name
    updated_at
  }
`;

const PROMO_FIELDS = gql`
  fragment PodPromoFields on PodPromo {
    id
    pod_id
    pod_title
    pod_start
    club_name
    city_name
    pod_url
    status
    source
    banner_url
    style
    slides {
      kind
      url
    }
    collaborators
    caption
    hashtags
    ai_caption
    tracking_url
    scheduled_post_id
    post_status
    permalink
    scheduled_at
    error
    figures {
      clicks
      unique_visitors
      signups
      pod_views
      checkouts
      bookings
      paid_bookings
      payments
      revenue
      likes
      comments
      engagement
      updated_at
    }
  }
`;

export const POD_PROMO_SETTINGS = gql`
  query PodPromoSettings {
    podPromoSettings {
      ...PodPromoSettingsFields
    }
  }
  ${SETTINGS_FIELDS}
`;

export const UPDATE_POD_PROMO_SETTINGS = gql`
  mutation UpdatePodPromoSettings($input: PodPromoSettingsInput!) {
    updatePodPromoSettings(input: $input) {
      ...PodPromoSettingsFields
    }
  }
  ${SETTINGS_FIELDS}
`;

/** Everything the settings pickers choose from, read once. */
export const POD_PROMO_OPTIONS = gql`
  query PodPromoOptions {
    socialAccounts {
      id
      name
      platform
    }
    locations {
      id
      location_name
    }
    clubs {
      id
      club_name
    }
    categories {
      id
      name
    }
  }
`;

export const POD_PROMO_SUMMARY = gql`
  query PodPromoSummary {
    podPromoSummary {
      planned
      scheduled
      published
      failed
      clicks
      bookings
      payments
      revenue
    }
  }
`;

export const POD_PROMOS_TABLE = gql`
  query PodPromosTable($query: TableQueryInput) {
    podPromosTable(query: $query) {
      rows {
        ...PodPromoFields
      }
      total
      page
      page_size
    }
  }
  ${PROMO_FIELDS}
`;

export const POD_PROMO = gql`
  query PodPromo($id: ID!) {
    podPromo(id: $id) {
      ...PodPromoFields
    }
  }
  ${PROMO_FIELDS}
`;

export const POD_PROMO_CANDIDATES = gql`
  query PodPromoCandidates($search: String) {
    podPromoCandidates(search: $search) {
      id
      title
      starts_at
      club_name
      promo_status
    }
  }
`;

export const PREVIEW_POD_PROMO = gql`
  mutation PreviewPodPromo($pod_id: ID!) {
    previewPodPromo(pod_id: $pod_id) {
      pod_id
      pod_title
      banner_url
      banner_style
      style
      slides {
        kind
        url
      }
      collaborators
      caption
      hashtags
      ai_caption
      scheduled_at
      ineligible_reason
    }
  }
`;

export const CREATE_POD_PROMO = gql`
  mutation CreatePodPromo($pod_id: ID!) {
    createPodPromo(pod_id: $pod_id) {
      ...PodPromoFields
    }
  }
  ${PROMO_FIELDS}
`;

export const REGENERATE_POD_PROMO_BANNER = gql`
  mutation RegeneratePodPromoBanner($id: ID!, $style: PodBannerStyle) {
    regeneratePodPromoBanner(id: $id, style: $style) {
      ...PodPromoFields
    }
  }
  ${PROMO_FIELDS}
`;

export const CANCEL_POD_PROMO = gql`
  mutation CancelPodPromo($id: ID!) {
    cancelPodPromo(id: $id) {
      ...PodPromoFields
    }
  }
  ${PROMO_FIELDS}
`;

/** Promote one pod in one call, choosing the time, accounts, collaborators and style the planner would otherwise pick. */
export const SCHEDULE_POD_PROMO = gql`
  mutation SchedulePodPromo($pod_id: ID!, $at: String, $account_ids: [ID!], $collaborators: [String!], $style: PodBannerStyle) {
    schedulePodPromo(pod_id: $pod_id, at: $at, account_ids: $account_ids, collaborators: $collaborators, style: $style) {
      ...PodPromoFields
    }
  }
  ${PROMO_FIELDS}
`;
