import { gql, type TypedDocumentNode } from '@apollo/client';

/** The settings that are words, links or HTML. */
type TextSetting =
  | 'store_name'
  | 'tagline'
  | 'logo_url'
  | 'favicon_url'
  | 'support_email'
  | 'support_phone'
  | 'whatsapp_number'
  | 'announcement_text'
  | 'announcement_link'
  | 'razorpay_account'
  | 'seo_title'
  | 'seo_description'
  | 'og_image_url'
  | 'shipping_policy_html'
  | 'returns_policy_html'
  | 'terms_html'
  | 'about_html'
  | 'updated_at';

/** The settings that are switches. */
type FlagSetting =
  | 'store_enabled'
  | 'announcement_enabled'
  | 'guest_checkout_enabled'
  | 'cod_enabled'
  | 'cod_requires_otp'
  | 'returns_enabled'
  | 'restock_on_cancel'
  | 'autoship_enabled'
  | 'serviceable_pincodes_enabled';

/** The settings that are amounts, percentages or counts. */
type NumberSetting =
  | 'cod_fee'
  | 'cod_min_order'
  | 'cod_max_order'
  | 'prepaid_discount_pct'
  | 'min_order_value'
  | 'free_shipping_above'
  | 'flat_shipping_fee'
  | 'max_qty_per_line'
  | 'return_window_days'
  | 'autoship_discount_pct';

/** A festive window: while it is open the store swaps its logo, favicon and background. */
export interface StoreOccasion {
  slug: string;
  label: string;
  starts_at: string;
  ends_at: string;
  logo_url: string;
  favicon_url: string;
  background_url: string;
  background_color: string;
  announcement_text: string;
  is_active: boolean;
  sort_order: number;
}

/** The store's own settings — identity, checkout rules, shipping, returns, autoship, SEO, pages and occasions. */
export type StoreSettings = Record<TextSetting, string> &
  Record<FlagSetting, boolean> &
  Record<NumberSetting, number> & {
    cod_blocked_pincodes: string[];
    return_reasons: string[];
    cancel_reasons: string[];
    autoship_frequencies: number[];
    social_links: { label: string; url: string }[];
    serviceable_pincodes: string[];
    occasions: StoreOccasion[];
  };

const SETTINGS_FIELDS = `
  store_enabled
  store_name
  tagline
  logo_url
  favicon_url
  support_email
  support_phone
  whatsapp_number
  announcement_enabled
  announcement_text
  announcement_link
  guest_checkout_enabled
  razorpay_account
  cod_enabled
  cod_fee
  cod_min_order
  cod_max_order
  cod_requires_otp
  cod_blocked_pincodes
  prepaid_discount_pct
  min_order_value
  free_shipping_above
  flat_shipping_fee
  max_qty_per_line
  returns_enabled
  return_window_days
  return_reasons
  cancel_reasons
  restock_on_cancel
  autoship_enabled
  autoship_discount_pct
  autoship_frequencies
  seo_title
  seo_description
  og_image_url
  shipping_policy_html
  returns_policy_html
  terms_html
  about_html
  social_links {
    label
    url
  }
  serviceable_pincodes_enabled
  serviceable_pincodes
  occasions {
    slug
    label
    starts_at
    ends_at
    logo_url
    favicon_url
    background_url
    background_color
    announcement_text
    is_active
    sort_order
  }
  updated_at
`;

export const STORE_SETTINGS: TypedDocumentNode<{ storeAdminSettings: StoreSettings }> = gql`
  query StoreAdminSettings {
    storeAdminSettings {
      ${SETTINGS_FIELDS}
    }
  }
`;

export const SAVE_SETTINGS = gql`
  mutation StoreSaveSettings($input: StoreSettingsInput!) {
    storeSaveSettings(input: $input) {
      ${SETTINGS_FIELDS}
    }
  }
`;

/** Test keys take no real money; the mode is read from the key id. */
export type RazorpayMode = 'LIVE' | 'TEST' | 'UNKNOWN';

/** One of the Tech portal's Razorpay entries — never a secret, only a name and a hint of the key. */
export interface StoreRazorpayAccount {
  id: string;
  name: string;
  key_hint: string;
  mode: RazorpayMode;
  is_default: boolean;
  is_active: boolean;
}

export const STORE_RAZORPAY_ACCOUNTS: TypedDocumentNode<{ storeAdminRazorpayAccounts: StoreRazorpayAccount[] }> = gql`
  query StoreAdminRazorpayAccounts {
    storeAdminRazorpayAccounts {
      id
      name
      key_hint
      mode
      is_default
      is_active
    }
  }
`;
