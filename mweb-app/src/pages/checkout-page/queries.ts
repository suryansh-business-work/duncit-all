import { gql } from '@apollo/client';

export const PUBLIC_FINANCE = gql`
  query PublicFinanceSettings {
    publicFinanceSettings {
      platform_fee_pct
      gst_pct
      currency_symbol
      dummy_mode
      razorpay_enabled
    }
  }
`;

export const CHECKOUT_ME = gql`
  query CheckoutMe {
    me {
      user_id
      first_name
      last_name
      email
      phone_number
      phone_extension
    }
  }
`;

export const CHECKOUT_POD = gql`
  query CheckoutPod($id: ID!) {
    pod(pod_doc_id: $id) {
      id
      pod_id
      pod_title
      pod_description
      pod_date_time
      pod_end_date_time
      pod_type
      pod_amount
      products_enabled
      product_cost_total
      product_requests {
        product_id
        product_name
        image_url
        images
        unit_cost
        quantity
        available_count
        total_cost
      }
      zone_name
      no_of_spots
      pod_attendees
      pod_images_and_videos {
        url
        type
      }
      club_id
      location_id
      venue_id
    }
  }
`;

export const DUMMY_CHECKOUT = gql`
  mutation DummyCheckout($input: DummyCheckoutInput!) {
    dummyCheckout(input: $input) {
      id
      payment_id
      invoice_no
      total
      currency_symbol
      status
      paid_at
      created_at
    }
  }
`;

export const PREVIEW_COUPON = gql`
  query PreviewCoupon($input: CouponPreviewInput!) {
    previewCoupon(input: $input) {
      ok
      message
      code
      discount_pct
      original_total
      discount_amount
      final_total
      currency_symbol
    }
  }
`;

export const CREATE_RAZORPAY_ORDER = gql`
  mutation CreateRazorpayOrder($input: RazorpayOrderInput!) {
    createRazorpayOrder(input: $input) {
      payment_doc_id
      key_id
      order_id
      amount
      currency
      name
      description
      prefill_email
      prefill_contact
      currency_symbol
      total
      free
      payment {
        id
        payment_id
        invoice_no
        total
        currency_symbol
        status
        paid_at
        created_at
      }
    }
  }
`;

export const VERIFY_RAZORPAY_PAYMENT = gql`
  mutation VerifyRazorpayPayment($input: VerifyRazorpayInput!) {
    verifyRazorpayPayment(input: $input) {
      id
      payment_id
      invoice_no
      total
      currency_symbol
      status
      paid_at
      created_at
    }
  }
`;

export interface CouponPreview {
  ok: boolean;
  message: string | null;
  code: string | null;
  discount_pct: number | null;
  original_total: number;
  discount_amount: number;
  final_total: number;
  currency_symbol: string;
}

export interface CheckoutState {
  pod_id?: string;
  pod_title?: string;
  amount?: number;
  selected_products?: Array<{ product_id: string; quantity: number }>;
  description?: string;
}

export interface CheckoutForm {
  email: string;
  phone_extension: string;
  phone_number: string;
  billing_address: string;
  method: string;
  simulate_failure: boolean;
}
