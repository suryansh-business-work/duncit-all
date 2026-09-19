import { gql, type TypedDocumentNode } from '@apollo/client';

import type { StorePetType } from './settings';
import type { NoVars } from './types';

/** A product as a shelf card — the one selection every rail and grid reads. */
export interface StoreProductCard {
  id: string;
  slug: string;
  title: string;
  brand_id: string | null;
  brand_name: string;
  image_url: string;
  hover_image_url: string;
  price: number;
  mrp: number;
  discount_pct: number;
  has_variants: boolean;
  in_stock: boolean;
  low_stock: boolean;
  badge: string;
  rating: number;
  rating_count: number;
  offer_text: string;
}

const CARD_FIELDS = `
  id
  slug
  title
  brand_id
  brand_name
  image_url
  hover_image_url
  price
  mrp
  discount_pct
  has_variants
  in_stock
  low_stock
  badge
  rating
  rating_count
  offer_text
`;

export type StoreSort = 'RELEVANCE' | 'NEWEST' | 'PRICE_ASC' | 'PRICE_DESC' | 'BESTSELLING' | 'DISCOUNT' | 'RATING';

export interface StoreFacetFilter {
  facet: string;
  values: string[];
}

export interface StoreSearchInput {
  q?: string;
  pet_type?: string;
  category?: string;
  collection?: string;
  brand_ids?: string[];
  facets?: StoreFacetFilter[];
  min_price?: number;
  max_price?: number;
  in_stock_only?: boolean;
  on_sale?: boolean;
  /** Only products discounted at least this much (flash-sale tabs). */
  min_discount_pct?: number;
  sort?: StoreSort;
  page?: number;
  page_size?: number;
}

export interface StoreFacetPanel {
  id: string;
  name: string;
  slug: string;
  options: { label: string; slug: string; count: number; selected: boolean }[];
}

export interface StoreCountOption {
  id: string;
  name: string;
  count: number;
  selected: boolean;
  slug?: string;
}

export interface StoreSearchPage {
  items: StoreProductCard[];
  total: number;
  page: number;
  page_size: number;
  sort: StoreSort;
  price_min: number;
  price_max: number;
  brands: StoreCountOption[];
  facets: StoreFacetPanel[];
  pet_types: StoreCountOption[];
}

export const STORE_SEARCH: TypedDocumentNode<{ storeSearch: StoreSearchPage }, { input: StoreSearchInput }> = gql`
  query EcommStoreSearch($input: StoreSearchInput!) {
    storeSearch(input: $input) {
      items { ${CARD_FIELDS} }
      total
      page
      page_size
      sort
      price_min
      price_max
      brands { id name count selected }
      facets { id name slug options { label slug count selected } }
      pet_types { id name slug count selected }
    }
  }
`;

export interface StoreSuggest {
  products: StoreProductCard[];
  categories: { id: string; name: string; slug: string }[];
  brands: { id: string; name: string; slug: string; logo_url: string }[];
}

export const STORE_SUGGEST: TypedDocumentNode<{ storeSuggest: StoreSuggest }, { q: string }> = gql`
  query EcommStoreSuggest($q: String!) {
    storeSuggest(q: $q) {
      products { ${CARD_FIELDS} }
      categories { id name slug }
      brands { id name slug logo_url }
    }
  }
`;

export const STORE_PRODUCTS_BY_IDS: TypedDocumentNode<{ storeProductsByIds: StoreProductCard[] }, { ids: string[] }> = gql`
  query EcommStoreProductsByIds($ids: [ID!]!) {
    storeProductsByIds(ids: $ids) { ${CARD_FIELDS} }
  }
`;

export const STORE_RELATED: TypedDocumentNode<{ storeRelatedProducts: StoreProductCard[] }, { product_id: string; limit?: number }> = gql`
  query EcommStoreRelated($product_id: ID!, $limit: Int) {
    storeRelatedProducts(product_id: $product_id, limit: $limit) { ${CARD_FIELDS} }
  }
`;

export const STORE_WISHLIST: TypedDocumentNode<{ storeWishlist: StoreProductCard[] }, { cart_token: string }> = gql`
  query EcommStoreWishlist($cart_token: String) {
    storeWishlist(cart_token: $cart_token) { ${CARD_FIELDS} }
  }
`;

export const STORE_WISHLIST_IDS: TypedDocumentNode<{ storeWishlistIds: string[] }, { cart_token: string }> = gql`
  query EcommStoreWishlistIds($cart_token: String) {
    storeWishlistIds(cart_token: $cart_token)
  }
`;

export const TOGGLE_WISHLIST: TypedDocumentNode<{ storeToggleWishlist: string[] }, { cart_token: string; product_id: string }> = gql`
  mutation EcommStoreToggleWishlist($cart_token: String, $product_id: ID!) {
    storeToggleWishlist(cart_token: $cart_token, product_id: $product_id)
  }
`;

export interface StoreBrandInfo {
  id: string;
  name: string;
  slug: string;
  logo_url: string;
  tagline: string;
}

export const STORE_BRANDS: TypedDocumentNode<{ storeBrands: StoreBrandInfo[] }, NoVars> = gql`
  query EcommStoreBrands {
    storeBrands { id name slug logo_url tagline }
  }
`;

export type StoreHomeSectionKind =
  | 'HERO_SLIDER'
  | 'PET_TYPES'
  | 'CATEGORY_GRID'
  | 'COLLECTION_CAROUSEL'
  | 'PROMO_BANNERS'
  | 'BRANDS'
  | 'USP_STRIP'
  | 'NEWSLETTER'
  | 'FLASH_SALE'
  | 'PRODUCT_SLIDER'
  | 'CATEGORY_ICONS';

export interface StoreSectionItem {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  mobile_image_url: string;
  cta_label: string;
  link: string;
}

export interface StoreCategoryTile {
  id: string;
  name: string;
  slug: string;
  image_url: string;
}

export interface StoreHomeSection {
  id: string;
  kind: StoreHomeSectionKind;
  title: string;
  subtitle: string;
  items: StoreSectionItem[];
  collection: { id: string; name: string; slug: string } | null;
  products: StoreProductCard[];
  categories: StoreCategoryTile[];
  pet_types: StorePetType[];
  brands: StoreBrandInfo[];
  /** FLASH_SALE: the discount tabs, e.g. [10, 20, 30, 40]. */
  discount_tiers: number[];
  /** FLASH_SALE: when the countdown ends (ISO); the section hides after it. */
  ends_at: string | null;
}

export const STORE_HOME: TypedDocumentNode<{ storeHome: StoreHomeSection[] }, NoVars> = gql`
  query EcommStoreHome {
    storeHome {
      id
      kind
      title
      subtitle
      items { id title subtitle image_url mobile_image_url cta_label link }
      collection { id name slug }
      products { ${CARD_FIELDS} }
      categories { id name slug image_url }
      pet_types { id name slug icon_url image_url description }
      brands { id name slug logo_url tagline }
      discount_tiers
      ends_at
    }
  }
`;
