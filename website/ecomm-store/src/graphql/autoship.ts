import { gql, type TypedDocumentNode } from '@apollo/client';

import type { StoreCart } from './cart';
import type { StoreAddressInput } from './checkout';
import type { StoreOrderAddress } from './orders';
import type { NoVars } from './types';

export type StoreSubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED';

/** COD_AUTO: a Cash-on-Delivery order is placed each cycle. REMIND: the buyer is told, and orders. */
export type StoreSubscriptionMode = 'COD_AUTO' | 'REMIND';

export interface StoreSubscription {
  id: string;
  product: { id: string; slug: string; title: string; image_url: string; in_stock: boolean } | null;
  product_id: string;
  variant_id: string;
  variant_label: string;
  qty: number;
  frequency_weeks: number;
  mode: StoreSubscriptionMode;
  status: StoreSubscriptionStatus;
  next_run_at: string | null;
  last_run_at: string | null;
  last_order_no: string;
  run_count: number;
  unit_price: number;
  discount_pct: number;
  shipping_address: StoreOrderAddress | null;
  events: { action: string; note: string; at: string }[];
  created_at: string;
}

const SUBSCRIPTION_FIELDS = `
  id
  product { id slug title image_url in_stock }
  product_id
  variant_id
  variant_label
  qty
  frequency_weeks
  mode
  status
  next_run_at
  last_run_at
  last_order_no
  run_count
  unit_price
  discount_pct
  shipping_address { name phone line1 line2 landmark city state pincode country }
  events { action note at }
  created_at
`;

export const MY_SUBSCRIPTIONS: TypedDocumentNode<{ storeMySubscriptions: StoreSubscription[] }, NoVars> = gql`
  query EcommStoreMySubscriptions {
    storeMySubscriptions { ${SUBSCRIPTION_FIELDS} }
  }
`;

export interface StoreSubscriptionInput {
  product_id: string;
  variant_id?: string;
  qty: number;
  frequency_weeks: number;
  mode: StoreSubscriptionMode;
  contact: { name: string; email: string; phone_extension: string; phone_number: string };
  shipping_address: StoreAddressInput;
  cod_challenge_id?: string;
}

export const CREATE_SUBSCRIPTION: TypedDocumentNode<
  { storeCreateSubscription: StoreSubscription },
  { input: StoreSubscriptionInput }
> = gql`
  mutation EcommStoreCreateSubscription($input: StoreSubscriptionInput!) {
    storeCreateSubscription(input: $input) { ${SUBSCRIPTION_FIELDS} }
  }
`;

export interface StoreSubscriptionUpdateInput {
  qty?: number;
  frequency_weeks?: number;
  mode?: StoreSubscriptionMode;
  shipping_address?: StoreAddressInput;
  cod_challenge_id?: string;
}

export const UPDATE_SUBSCRIPTION: TypedDocumentNode<
  { storeUpdateSubscription: StoreSubscription },
  { id: string; input: StoreSubscriptionUpdateInput }
> = gql`
  mutation EcommStoreUpdateSubscription($id: ID!, $input: StoreSubscriptionUpdateInput!) {
    storeUpdateSubscription(id: $id, input: $input) { ${SUBSCRIPTION_FIELDS} }
  }
`;

export const PAUSE_SUBSCRIPTION: TypedDocumentNode<
  { storePauseSubscription: StoreSubscription },
  { id: string; paused: boolean }
> = gql`
  mutation EcommStorePauseSubscription($id: ID!, $paused: Boolean!) {
    storePauseSubscription(id: $id, paused: $paused) { ${SUBSCRIPTION_FIELDS} }
  }
`;

export const SKIP_SUBSCRIPTION: TypedDocumentNode<{ storeSkipSubscription: StoreSubscription }, { id: string }> = gql`
  mutation EcommStoreSkipSubscription($id: ID!) {
    storeSkipSubscription(id: $id) { ${SUBSCRIPTION_FIELDS} }
  }
`;

export const CANCEL_SUBSCRIPTION: TypedDocumentNode<{ storeCancelSubscription: StoreSubscription }, { id: string }> = gql`
  mutation EcommStoreCancelSubscription($id: ID!) {
    storeCancelSubscription(id: $id) { ${SUBSCRIPTION_FIELDS} }
  }
`;

/** Puts the subscribed item in the cart for an ordinary checkout. */
export const SUBSCRIPTION_ORDER_NOW: TypedDocumentNode<
  { storeSubscriptionOrderNow: Pick<StoreCart, 'id' | 'item_count'> },
  { id: string; cart_token: string }
> = gql`
  mutation EcommStoreSubscriptionOrderNow($id: ID!, $cart_token: String) {
    storeSubscriptionOrderNow(id: $id, cart_token: $cart_token) {
      id
      item_count
    }
  }
`;
