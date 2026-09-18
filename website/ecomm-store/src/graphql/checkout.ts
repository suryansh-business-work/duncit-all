import { gql, type TypedDocumentNode } from '@apollo/client';

import type { StoreCheckoutMethod } from './cart';
import type { StoreOrderResultStatus } from './orders';

export interface StoreCodOtp {
  challenge_id: string;
  expires_at: string;
  resend_after_seconds: number;
  test_code: string | null;
}

export const REQUEST_COD_OTP: TypedDocumentNode<{ storeRequestCodOtp: StoreCodOtp }, { cart_token: string; phone_extension: string; phone_number: string }> = gql`
  mutation EcommStoreRequestCodOtp($cart_token: String, $phone_extension: String!, $phone_number: String!) {
    storeRequestCodOtp(cart_token: $cart_token, phone_extension: $phone_extension, phone_number: $phone_number) {
      challenge_id
      expires_at
      resend_after_seconds
      test_code
    }
  }
`;

export const VERIFY_COD_OTP: TypedDocumentNode<{ storeVerifyCodOtp: boolean }, { challenge_id: string; code: string }> = gql`
  mutation EcommStoreVerifyCodOtp($challenge_id: ID!, $code: String!) {
    storeVerifyCodOtp(challenge_id: $challenge_id, code: $code)
  }
`;

export interface StoreAddressInput {
  name: string;
  phone: string;
  email?: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
}

export interface StorePlaceOrderInput {
  cart_token: string;
  payment_method: StoreCheckoutMethod;
  coupon_code?: string;
  redeem_coins?: number;
  contact: { name: string; email: string; phone_extension: string; phone_number: string };
  shipping_address: StoreAddressInput;
  billing_same_as_shipping: boolean;
  cod_challenge_id?: string;
  autoship_id?: string;
  checkout_url: string;
}

export interface RazorpaySheet {
  payment_doc_id: string;
  key_id: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill_email: string;
  prefill_contact: string;
}

export interface StorePlaceOrderResult {
  status: StoreOrderResultStatus;
  payment_doc_id: string;
  access_key: string;
  razorpay: RazorpaySheet | null;
}

const RESULT_FIELDS = `
  status
  payment_doc_id
  access_key
  razorpay {
    payment_doc_id
    key_id
    order_id
    amount
    currency
    name
    description
    prefill_email
    prefill_contact
  }
`;

export const PLACE_ORDER: TypedDocumentNode<{ storePlaceOrder: StorePlaceOrderResult }, { input: StorePlaceOrderInput }> = gql`
  mutation EcommStorePlaceOrder($input: StorePlaceOrderInput!) {
    storePlaceOrder(input: $input) { ${RESULT_FIELDS} }
  }
`;

export interface StoreVerifyPaymentInput {
  payment_doc_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  cart_token: string;
  access_key: string;
}

export const VERIFY_PAYMENT: TypedDocumentNode<{ storeVerifyPayment: StorePlaceOrderResult }, { input: StoreVerifyPaymentInput }> = gql`
  mutation EcommStoreVerifyPayment($input: StoreVerifyPaymentInput!) {
    storeVerifyPayment(input: $input) { ${RESULT_FIELDS} }
  }
`;
