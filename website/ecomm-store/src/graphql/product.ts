import { gql, type TypedDocumentNode } from '@apollo/client';

import type { StoreCategoryTile } from './catalog';

export interface StoreRef {
  id: string;
  name: string;
  slug: string;
}

export interface StoreVariant {
  id: string;
  label: string;
  option_values: { name: string; value: string }[];
  sku: string;
  price: number;
  mrp: number;
  discount_pct: number;
  available: number;
  in_stock: boolean;
  images: string[];
}

export interface StoreProductOption {
  name: string;
  values: string[];
}

export interface StoreFaq {
  question: string;
  answer: string;
}

export interface StoreProduct {
  id: string;
  slug: string;
  title: string;
  brand_name: string;
  image_url: string;
  price: number;
  mrp: number;
  discount_pct: number;
  has_variants: boolean;
  in_stock: boolean;
  low_stock: boolean;
  badge: string;
  rating: number;
  rating_count: number;
  short_description: string;
  available: number;
  images: string[];
  description: string;
  highlights: string[];
  specifications: { label: string; value: string }[];
  ingredients: string;
  feeding_guide: string;
  care_instructions: string;
  options: StoreProductOption[];
  variants: StoreVariant[];
  default_variant_id: string | null;
  brand: { id: string; name: string; logo_url: string; tagline: string } | null;
  breadcrumbs: StoreRef[];
  facets: { name: string; values: string[] }[];
  cod_available: boolean;
  returnable: boolean;
  return_window_days: number;
  max_per_order: number;
  min_order_qty: number;
  weight_volume: string;
  seo_title: string;
  seo_description: string;
  star_counts: number[];
  offer_text: string;
  faqs: StoreFaq[];
}

export const STORE_PRODUCT: TypedDocumentNode<{ storeProduct: StoreProduct | null }, { slug: string }> = gql`
  query EcommStoreProduct($slug: String!) {
    storeProduct(slug: $slug) {
      id
      slug
      title
      brand_name
      image_url
      price
      mrp
      discount_pct
      has_variants
      in_stock
      low_stock
      badge
      rating
      rating_count
      short_description
      available
      images
      description
      highlights
      specifications { label value }
      ingredients
      feeding_guide
      care_instructions
      options { name values }
      variants {
        id
        label
        option_values { name value }
        sku
        price
        mrp
        discount_pct
        available
        in_stock
        images
      }
      default_variant_id
      brand { id name logo_url tagline }
      breadcrumbs { id name slug }
      facets { name values }
      cod_available
      returnable
      return_window_days
      max_per_order
      min_order_qty
      weight_volume
      seo_title
      seo_description
      star_counts
      offer_text
      faqs { question answer }
    }
  }
`;

export const RECORD_VIEW: TypedDocumentNode<{ storeRecordView: boolean }, { product_id: string }> = gql`
  mutation EcommStoreRecordView($product_id: ID!) {
    storeRecordView(product_id: $product_id)
  }
`;

export interface StoreDeliveryCheck {
  pincode: string;
  checked: boolean;
  serviceable: boolean;
  etd: string;
  courier_name: string;
  cod_available: boolean;
}

export const DELIVERY_CHECK: TypedDocumentNode<{ storeDeliveryCheck: StoreDeliveryCheck }, { product_id: string; variant_id?: string | null; pincode: string }> = gql`
  query EcommStoreDeliveryCheck($product_id: ID!, $variant_id: ID, $pincode: String!) {
    storeDeliveryCheck(product_id: $product_id, variant_id: $variant_id, pincode: $pincode) {
      pincode
      checked
      serviceable
      etd
      courier_name
      cod_available
    }
  }
`;

export const SUBSCRIBE_STOCK_ALERT: TypedDocumentNode<{ storeSubscribeStockAlert: boolean }, { product_id: string; variant_id?: string | null; email: string }> = gql`
  mutation EcommStoreStockAlert($product_id: ID!, $variant_id: String, $email: String!) {
    storeSubscribeStockAlert(product_id: $product_id, variant_id: $variant_id, email: $email)
  }
`;

export interface ProductReview {
  id: string;
  user_name: string;
  rating: number;
  comment: string;
  images: string[];
  seller_reply: string;
  created_at: string;
}

export const PRODUCT_REVIEWS: TypedDocumentNode<{ storeProductReviews: ProductReview[] }, { product_id: string }> = gql`
  query EcommStoreProductReviews($product_id: ID!) {
    storeProductReviews(product_id: $product_id) {
      id
      user_name
      rating
      comment
      images
      seller_reply
      created_at
    }
  }
`;

export interface StoreReviewInput {
  product_id: string;
  rating: number;
  comment?: string;
}

export const SUBMIT_REVIEW: TypedDocumentNode<{ storeSubmitReview: { id: string } }, { input: StoreReviewInput }> = gql`
  mutation EcommStoreSubmitReview($input: StoreReviewInput!) {
    storeSubmitReview(input: $input) {
      id
    }
  }
`;

export interface StorePetTypePage {
  id: string;
  name: string;
  slug: string;
  image_url: string;
  description: string;
  categories: StoreCategoryTile[];
}

export const STORE_PET_TYPE: TypedDocumentNode<{ storePetType: StorePetTypePage | null }, { slug: string }> = gql`
  query EcommStorePetType($slug: String!) {
    storePetType(slug: $slug) {
      id
      name
      slug
      image_url
      description
      categories { id name slug image_url }
    }
  }
`;

export interface StoreCategoryPage {
  id: string;
  name: string;
  slug: string;
  banner_url: string;
  description: string;
  seo_title: string;
  seo_description: string;
  parent: StoreRef | null;
  children: StoreRef[];
}

export const STORE_CATEGORY: TypedDocumentNode<{ storeCategory: StoreCategoryPage | null }, { slug: string }> = gql`
  query EcommStoreCategory($slug: String!) {
    storeCategory(slug: $slug) {
      id
      name
      slug
      banner_url
      description
      seo_title
      seo_description
      parent { id name slug }
      children { id name slug }
    }
  }
`;

export interface StoreCollectionPage {
  id: string;
  name: string;
  slug: string;
  description: string;
  banner_url: string;
  seo_title: string;
  seo_description: string;
}

export const STORE_COLLECTION: TypedDocumentNode<{ storeCollection: StoreCollectionPage | null }, { slug: string }> = gql`
  query EcommStoreCollection($slug: String!) {
    storeCollection(slug: $slug) { id name slug description banner_url seo_title seo_description }
  }
`;
