import { gql, type TypedDocumentNode } from '@apollo/client';

import type { NoVars } from './types';

export interface StoreSocialLink {
  label: string;
  url: string;
}

/** The festive window open right now: the look the store swaps to while it lasts. */
export interface StoreActiveOccasion {
  slug: string;
  label: string;
  logo_url: string;
  favicon_url: string;
  background_url: string;
  background_color: string;
  announcement_text: string;
  ends_at: string;
}

export interface StoreSettings {
  store_enabled: boolean;
  store_name: string;
  tagline: string;
  logo_url: string;
  favicon_url: string;
  support_email: string;
  support_phone: string;
  whatsapp_number: string;
  announcement_enabled: boolean;
  announcement_text: string;
  announcement_link: string;
  guest_checkout_enabled: boolean;
  cod_enabled: boolean;
  cod_fee: number;
  cod_requires_otp: boolean;
  prepaid_discount_pct: number;
  min_order_value: number;
  free_shipping_above: number;
  max_qty_per_line: number;
  returns_enabled: boolean;
  return_window_days: number;
  return_reasons: string[];
  cancel_reasons: string[];
  seo_title: string;
  seo_description: string;
  shipping_policy_html: string;
  returns_policy_html: string;
  terms_html: string;
  about_html: string;
  social_links: StoreSocialLink[];
  currency_symbol: string;
  autoship_enabled: boolean;
  autoship_discount_pct: number;
  /** Delivery intervals a subscription may choose, in weeks. */
  autoship_frequencies: number[];
  /** On: delivery is limited to the operator's pincode list (storePincodeServiceable says which). */
  serviceable_pincodes_enabled: boolean;
  /** On: no payment gateway is configured, so checkout confirms without taking money. */
  dummy_mode: boolean;
  active_occasion: StoreActiveOccasion | null;
}

export const STORE_SETTINGS: TypedDocumentNode<{ storeSettings: StoreSettings }, NoVars> = gql`
  query EcommStoreSettings {
    storeSettings {
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
      cod_enabled
      cod_fee
      cod_requires_otp
      prepaid_discount_pct
      min_order_value
      free_shipping_above
      max_qty_per_line
      returns_enabled
      return_window_days
      return_reasons
      cancel_reasons
      seo_title
      seo_description
      shipping_policy_html
      returns_policy_html
      terms_html
      about_html
      social_links {
        label
        url
      }
      currency_symbol
      autoship_enabled
      autoship_discount_pct
      autoship_frequencies
      serviceable_pincodes_enabled
      dummy_mode
      active_occasion {
        slug
        label
        logo_url
        favicon_url
        background_url
        background_color
        announcement_text
        ends_at
      }
    }
  }
`;

export interface StorePetType {
  id: string;
  name: string;
  slug: string;
  icon_url: string;
  image_url: string;
  description: string;
}

export interface StoreCategoryNode {
  id: string;
  name: string;
  slug: string;
  pet_type_ids: string[];
  show_in_menu: boolean;
  /** Selected two levels deep; the deepest level carries none. */
  children?: StoreCategoryNode[];
}

export interface StoreCollectionLink {
  id: string;
  name: string;
  slug: string;
  image_url: string;
}

/** One of the store's own pages, as the footer and menu link it. */
export interface StorePageLink {
  id: string;
  title: string;
  slug: string;
}

export interface StoreNavigation {
  pet_types: StorePetType[];
  categories: StoreCategoryNode[];
  collections: StoreCollectionLink[];
  pages: StorePageLink[];
}

export const STORE_NAVIGATION: TypedDocumentNode<{ storeNavigation: StoreNavigation }, NoVars> = gql`
  query EcommStoreNavigation {
    storeNavigation {
      pet_types {
        id
        name
        slug
        icon_url
        image_url
        description
      }
      categories {
        id
        name
        slug
        pet_type_ids
        show_in_menu
        children {
          id
          name
          slug
          pet_type_ids
          show_in_menu
          children {
            id
            name
            slug
            pet_type_ids
            show_in_menu
          }
        }
      }
      collections {
        id
        name
        slug
        image_url
      }
      pages {
        id
        title
        slug
      }
    }
  }
`;

export interface StorePage {
  id: string;
  title: string;
  slug: string;
  content_html: string;
  seo_title: string;
  seo_description: string;
  updated_at: string;
}

export const STORE_PAGE: TypedDocumentNode<{ storePage: StorePage | null }, { slug: string }> = gql`
  query EcommStorePage($slug: String!) {
    storePage(slug: $slug) {
      id
      title
      slug
      content_html
      seo_title
      seo_description
      updated_at
    }
  }
`;

/** Whether the store delivers to a pincode by the operator's list alone; the courier is asked at checkout. */
export interface StorePincodeCheck {
  pincode: string;
  serviceable: boolean;
  /** False when the store serves every pincode the courier can reach. */
  restricted: boolean;
}

export const STORE_PINCODE_SERVICEABLE: TypedDocumentNode<{ storePincodeServiceable: StorePincodeCheck }, { pincode: string }> = gql`
  query EcommStorePincodeServiceable($pincode: String!) {
    storePincodeServiceable(pincode: $pincode) {
      pincode
      serviceable
      restricted
    }
  }
`;

export const PUBLIC_CLIENT_CONFIG: TypedDocumentNode<{ publicClientConfig: { google_maps_api_key: string } }, NoVars> = gql`
  query EcommStorePublicClientConfig {
    publicClientConfig {
      google_maps_api_key
    }
  }
`;
