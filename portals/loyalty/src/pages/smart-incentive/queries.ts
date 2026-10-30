import { gql } from '@apollo/client';

/** The programme's three settings: the switch, when the offer pops up, and the biggest discount a host may choose. */
export interface SmartIncentiveSettings {
  enabled: boolean;
  delay_seconds: number;
  max_discount_pct: number;
}

/** A save. Every field is optional on the server, and one left out is left alone. */
export type SmartIncentiveSettingsInput = Partial<SmartIncentiveSettings>;

/** One UTC month: offers the pod pages showed, bookings paid with one, and what those took off. */
export interface SmartIncentiveMonthBucket {
  month: string;
  offers: number;
  bookings: number;
  discount: number;
}

/** How many opted-in pods offer one discount percentage. */
export interface SmartIncentiveDiscountShare {
  discount_pct: number;
  pods: number;
}

/** A host who switched the incentive on, and what their pods converted. */
export interface SmartIncentiveTopHost {
  user_id: string;
  name: string;
  email: string;
  pods: number;
  avg_discount_pct: number;
  bookings: number;
  discount_given: number;
}

/** Totals are all-time; `monthly` covers the window the dashboard asked for. */
export interface SmartIncentiveAdminStats extends SmartIncentiveSettings {
  hosts_opted_in: number;
  pods_opted_in: number;
  upcoming_pods: number;
  avg_discount_pct: number;
  offers_shown: number;
  bookings: number;
  conversion_pct: number;
  discount_given: number;
  monthly: SmartIncentiveMonthBucket[];
  discount_split: SmartIncentiveDiscountShare[];
  top_hosts: SmartIncentiveTopHost[];
}

export const SMART_INCENTIVE_ADMIN_STATS = gql`
  query LoyaltySmartIncentiveStats($months: Int) {
    smartIncentiveAdminStats(months: $months) {
      enabled
      delay_seconds
      max_discount_pct
      hosts_opted_in
      pods_opted_in
      upcoming_pods
      avg_discount_pct
      offers_shown
      bookings
      conversion_pct
      discount_given
      monthly {
        month
        offers
        bookings
        discount
      }
      discount_split {
        discount_pct
        pods
      }
      top_hosts {
        user_id
        name
        email
        pods
        avg_discount_pct
        bookings
        discount_given
      }
    }
  }
`;

// The query and the mutation select the same fields: the save writes its result
// over the query's cached read, and a field one of them lacked would be missing.
export const SMART_INCENTIVE_SETTINGS = gql`
  query LoyaltySmartIncentiveSettings {
    smartIncentiveSettings {
      enabled
      delay_seconds
      max_discount_pct
    }
  }
`;

export const UPDATE_SMART_INCENTIVE_SETTINGS = gql`
  mutation UpdateSmartIncentiveSettings($input: SmartIncentiveSettingsInput!) {
    updateSmartIncentiveSettings(input: $input) {
      enabled
      delay_seconds
      max_discount_pct
    }
  }
`;

/** The discount is money; its symbol is admin-configured (Finance settings), not assumed. */
export const SMART_INCENTIVE_CURRENCY = gql`
  query LoyaltySmartIncentiveCurrency {
    publicFinanceSettings {
      currency_symbol
    }
  }
`;
