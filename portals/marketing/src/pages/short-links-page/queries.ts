import { gql } from '@apollo/client';

const SHORT_LINK_FIELDS = gql`
  fragment ShortLinkFields on ShortLink {
    id
    code
    short_url
    label
    destination_url
    tagged_url
    source
    source_other
    medium
    medium_other
    campaign_id
    utm_source
    utm_medium
    utm_campaign
    is_active
    click_count
    first_clicked_at
    last_clicked_at
    created_at
  }
`;

export const SHORT_LINKS_TABLE = gql`
  query ShortLinksTable($query: TableQueryInput) {
    shortLinksTable(query: $query) {
      total
      rows {
        ...ShortLinkFields
      }
    }
  }
  ${SHORT_LINK_FIELDS}
`;

/** The channel and medium dropdowns come from the server so the portal never
 * keeps its own copy of the taxonomy. */
export const SHORT_LINK_OPTIONS = gql`
  query ShortLinkOptions {
    shortLinkOptions {
      sources {
        value
        label
        utm_value
        requires_text
      }
      mediums {
        value
        label
        utm_value
        requires_text
      }
    }
  }
`;

/**
 * Campaigns a link can be attributed to: the platform's own share campaigns —
 * what mWeb and the app file every share under — followed by the email ones.
 * One list, so the create form and the table's campaign filter agree.
 */
export const CAMPAIGNS_FOR_SHORT_LINK = gql`
  query CampaignsForShortLink {
    shortLinkCampaigns {
      campaign_id
      name
      utm_campaign
      kind
    }
  }
`;

/** Rendered server-side — `qrcode` is a server dependency, so no client
 * bundle grows for this. */
export const SHORT_LINK_QR = gql`
  query ShortLinkQr($id: ID!) {
    shortLinkQr(id: $id)
  }
`;

export const CREATE_SHORT_LINK = gql`
  mutation CreateShortLink($input: ShortLinkInput!) {
    createShortLink(input: $input) {
      ...ShortLinkFields
    }
  }
  ${SHORT_LINK_FIELDS}
`;

export const SET_SHORT_LINK_ACTIVE = gql`
  mutation SetShortLinkActive($id: ID!, $is_active: Boolean!) {
    setShortLinkActive(id: $id, is_active: $is_active) {
      id
      is_active
    }
  }
`;

export const DELETE_SHORT_LINK = gql`
  mutation DeleteShortLink($id: ID!) {
    deleteShortLink(id: $id)
  }
`;

/** One link in full, for the detail page. */
export const SHORT_LINK = gql`
  query ShortLink($id: ID!) {
    shortLink(id: $id) {
      ...ShortLinkFields
    }
  }
  ${SHORT_LINK_FIELDS}
`;

/** Aggregated analytics for one link — powers the detail page. */
export const SHORT_LINK_STATS = gql`
  query ShortLinkStats($id: ID!) {
    shortLinkStats(id: $id) {
      total_clicks
      unique_visitors
      countries_reached
      daily {
        date
        count
      }
      platforms {
        label
        count
      }
      devices {
        label
        count
      }
      oses {
        label
        count
      }
      browsers {
        label
        count
      }
      countries {
        label
        count
      }
      cities {
        label
        count
      }
      referrers {
        label
        count
      }
    }
  }
`;

export const SHORT_LINK_CLICKS = gql`
  query ShortLinkClicks($id: ID!, $query: TableQueryInput) {
    shortLinkClicks(id: $id, query: $query) {
      total
      rows {
        id
        click_id
        clicked_at
        platform
        referrer_host
        device_type
        os
        browser
        country
        region
        city
      }
    }
  }
`;

/** Click -> signup -> checkout -> paid, for one link. */
export const SHORT_LINK_FUNNEL = gql`
  query ShortLinkFunnel($id: ID!) {
    shortLinkFunnel(id: $id) {
      revenue
      conversion_rate
      steps {
        step
        count
      }
    }
  }
`;

/** One row per click, with the person it became. */
export const SHORT_LINK_JOURNEYS = gql`
  query ShortLinkJourneys($id: ID!, $query: TableQueryInput) {
    shortLinkJourneys(id: $id, query: $query) {
      total
      rows {
        id
        click_id
        clicked_at
        platform
        country
        city
        device_type
        furthest_step
        converted_amount
        user_id
        user_name
        user_email
        steps {
          step
          at
        }
        conversions {
          payment_id
          amount
          at
        }
      }
    }
  }
`;

export interface ShortLinkFunnelStep {
  step: string;
  count: number;
}

export interface ShortLinkFunnel {
  steps: ShortLinkFunnelStep[];
  revenue: number;
  conversion_rate: number;
}

export interface ShortLinkJourneyRow {
  id: string;
  click_id: string;
  clicked_at: string;
  platform: string;
  country?: string | null;
  city?: string | null;
  device_type: string;
  furthest_step: string;
  converted_amount?: number | null;
  user_id?: string | null;
  user_name?: string | null;
  user_email?: string | null;
  steps: { step: string; at: string }[];
  conversions: ShortLinkConversion[];
}

/** One payment this click earned. A visitor who buys twice has two. */
export interface ShortLinkConversion {
  payment_id: string;
  amount: number;
  at: string;
}
export interface ShortLinkBreakdown {
  label: string;
  count: number;
}

export interface ShortLinkStats {
  total_clicks: number;
  unique_visitors: number;
  countries_reached: number;
  daily: { date: string; count: number }[];
  platforms: ShortLinkBreakdown[];
  devices: ShortLinkBreakdown[];
  oses: ShortLinkBreakdown[];
  browsers: ShortLinkBreakdown[];
  countries: ShortLinkBreakdown[];
  cities: ShortLinkBreakdown[];
  referrers: ShortLinkBreakdown[];
}

export interface ShortLinkClickRow {
  id: string;
  click_id: string;
  clicked_at: string;
  platform: string;
  referrer_host?: string | null;
  device_type: string;
  os: string;
  browser: string;
  country?: string | null;
  region?: string | null;
  city?: string | null;
}

export interface ShortLinkOption {
  value: string;
  label: string;
  utm_value: string;
  requires_text: boolean;
}

export interface ShortLinkOptions {
  sources: ShortLinkOption[];
  mediums: ShortLinkOption[];
}

export interface ShortLinkRow {
  id: string;
  code: string;
  short_url: string;
  label: string;
  destination_url: string;
  tagged_url: string;
  source: string;
  source_other?: string | null;
  medium: string;
  medium_other?: string | null;
  campaign_id?: string | null;
  utm_source: string;
  utm_medium: string;
  utm_campaign?: string | null;
  is_active: boolean;
  click_count: number;
  first_clicked_at?: string | null;
  last_clicked_at?: string | null;
  created_at: string;
}

export interface CampaignChoice {
  campaign_id: string;
  name: string;
  utm_campaign: string;
  /** SHARE campaigns are the platform's own; EMAIL ones are marketing's. */
  kind: 'SHARE' | 'EMAIL';
}
