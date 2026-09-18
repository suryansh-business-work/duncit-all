import { gql, type TypedDocumentNode } from '@apollo/client';

export type StoreLineIssue = 'UNAVAILABLE' | 'VARIANT_GONE' | 'OUT_OF_STOCK' | 'QTY_REDUCED';

export interface StoreCartLine {
  product_id: string;
  variant_id: string;
  variant_label: string;
  name: string;
  slug: string;
  image_url: string;
  brand_name: string;
  quantity: number;
  requested_qty: number;
  unit_price: number;
  mrp: number;
  discount_pct: number;
  line_total: number;
  available: number;
  max_qty: number;
  cod_available: boolean;
  issue: StoreLineIssue | null;
}

const LINE_FIELDS = `
  product_id
  variant_id
  variant_label
  name
  slug
  image_url
  brand_name
  quantity
  requested_qty
  unit_price
  mrp
  discount_pct
  line_total
  available
  max_qty
  cod_available
  issue
`;

export interface StoreCart {
  id: string;
  lines: StoreCartLine[];
  item_count: number;
  items_total: number;
  mrp_total: number;
  savings: number;
  coupon_code: string;
  coupon_discount: number;
  coupon_error: string | null;
  free_shipping_above: number;
  amount_to_free_shipping: number;
  min_order_value: number;
  has_issues: boolean;
}

const CART_FIELDS = `
  id
  lines { ${LINE_FIELDS} }
  item_count
  items_total
  mrp_total
  savings
  coupon_code
  coupon_discount
  coupon_error
  free_shipping_above
  amount_to_free_shipping
  min_order_value
  has_issues
`;

/** One line of the cart: which product (and option), and how many. */
export interface CartLineVars {
  cart_token: string;
  product_id: string;
  variant_id: string;
  qty: number;
}

export const STORE_CART: TypedDocumentNode<{ storeCart: StoreCart }, { cart_token: string }> = gql`
  query EcommStoreCart($cart_token: String) {
    storeCart(cart_token: $cart_token) { ${CART_FIELDS} }
  }
`;

export const ADD_TO_CART: TypedDocumentNode<{ storeAddToCart: StoreCart }, CartLineVars> = gql`
  mutation EcommStoreAddToCart($cart_token: String, $product_id: ID!, $variant_id: String, $qty: Int!) {
    storeAddToCart(cart_token: $cart_token, product_id: $product_id, variant_id: $variant_id, qty: $qty) {
      ${CART_FIELDS}
    }
  }
`;

export const SET_CART_QTY: TypedDocumentNode<{ storeSetCartQty: StoreCart }, CartLineVars> = gql`
  mutation EcommStoreSetCartQty($cart_token: String, $product_id: ID!, $variant_id: String, $qty: Int!) {
    storeSetCartQty(cart_token: $cart_token, product_id: $product_id, variant_id: $variant_id, qty: $qty) {
      ${CART_FIELDS}
    }
  }
`;

export const APPLY_COUPON: TypedDocumentNode<{ storeApplyCoupon: StoreCart }, { cart_token: string; code: string }> = gql`
  mutation EcommStoreApplyCoupon($cart_token: String, $code: String) {
    storeApplyCoupon(cart_token: $cart_token, code: $code) { ${CART_FIELDS} }
  }
`;

export const MERGE_GUEST: TypedDocumentNode<{ storeMergeGuest: StoreCart }, { cart_token: string }> = gql`
  mutation EcommStoreMergeGuest($cart_token: String) {
    storeMergeGuest(cart_token: $cart_token) { ${CART_FIELDS} }
  }
`;

export type StoreCheckoutMethod = 'ONLINE' | 'COD';

export type StoreCodBlock = 'DISABLED' | 'PRODUCT' | 'PINCODE' | 'MIN_ORDER' | 'MAX_ORDER' | 'NOT_SERVICEABLE';

export interface StoreQuoteInput {
  cart_token: string;
  pincode?: string;
  payment_method: StoreCheckoutMethod;
  coupon_code?: string;
  redeem_coins?: number;
  email?: string;
  /** Set when checkout started from an autoship "Order now". */
  autoship_id?: string;
}

export interface StoreCheckoutQuote {
  lines: StoreCartLine[];
  items_total: number;
  mrp_total: number;
  savings: number;
  coupon_code: string;
  coupon_discount: number;
  coupon_error: string | null;
  prepaid_discount: number;
  shipping_total: number;
  shipping_quoted: boolean;
  serviceable: boolean;
  etd: string;
  cod_fee: number;
  coins_redeemed: number;
  autoship_discount: number;
  discount_total: number;
  gst_amount: number;
  total: number;
  currency_symbol: string;
  cod_available: boolean;
  cod_block: StoreCodBlock | null;
  below_minimum: boolean;
  has_issues: boolean;
}

export const CHECKOUT_QUOTE: TypedDocumentNode<{ storeCheckoutQuote: StoreCheckoutQuote }, { input: StoreQuoteInput }> = gql`
  query EcommStoreCheckoutQuote($input: StoreQuoteInput!) {
    storeCheckoutQuote(input: $input) {
      lines { ${LINE_FIELDS} }
      items_total
      mrp_total
      savings
      coupon_code
      coupon_discount
      coupon_error
      prepaid_discount
      shipping_total
      shipping_quoted
      serviceable
      etd
      cod_fee
      coins_redeemed
      autoship_discount
      discount_total
      gst_amount
      total
      currency_symbol
      cod_available
      cod_block
      below_minimum
      has_issues
    }
  }
`;
