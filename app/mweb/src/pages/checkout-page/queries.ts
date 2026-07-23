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
      address {
        line1
        line2
        landmark
        city
        state
        pincode
        country
      }
    }
  }
`;

export const UPDATE_MY_PROFILE = gql`
  mutation CheckoutUpdateMyProfile($input: UpdateMyProfileInput!) {
    updateMyProfile(input: $input) {
      user_id
      address {
        line1
        line2
        landmark
        city
        state
        pincode
        country
      }
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
      place_charges {
        label
        amount
        note
      }
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

export const AVAILABLE_COUPONS = gql`
  query AvailableCoupons($pod_id: ID) {
    availableCouponsForPod(pod_id: $pod_id) {
      id
      code
      description
      discount_pct
      min_order_amount
      scope
    }
  }
`;

export interface AvailableCoupon {
  id: string;
  code: string;
  description: string;
  discount_pct: number;
  min_order_amount: number;
  scope: 'GLOBAL' | 'POD';
}

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

/** Standalone product-cart checkout via the dummy gateway (no pod ticket).
 * Returns the same Payment fields the pod dummy checkout selects. */
export const DUMMY_PRODUCT_CHECKOUT = gql`
  mutation DummyProductCheckout($input: DummyProductCheckoutInput!) {
    dummyProductCheckout(input: $input) {
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

/** Standalone product-cart checkout via Razorpay (step 1; verify with
 * VERIFY_RAZORPAY_PAYMENT). Returns the same RazorpayOrder shape as the pod flow. */
export const CREATE_RAZORPAY_PRODUCT_ORDER = gql`
  mutation CreateRazorpayProductOrder($input: ProductCheckoutInput!) {
    createRazorpayProductOrder(input: $input) {
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

/** Live ShipRocket delivery estimate for a product cart (preview only; the
 * charged amount is recomputed server-side at checkout). */
export const PRODUCT_SHIPPING_QUOTE = gql`
  query ProductShippingQuote($input: ProductShippingQuoteInput!) {
    productShippingQuote(input: $input) {
      total
      currency_symbol
      all_quoted
      lines {
        warehouse_id
        pickup_pincode
        courier_name
        charge
        quoted
      }
    }
  }
`;

/** One line of the standalone product cart, mapped for the product engine. */
export interface ProductCartItemInput {
  product_id: string;
  pod_id: string;
  quantity: number;
  variant_id?: string;
}

export interface ProductShippingQuoteLine {
  warehouse_id: string;
  pickup_pincode: string;
  courier_name: string;
  charge: number;
  quoted: boolean;
}

export interface ProductShippingQuote {
  total: number;
  currency_symbol: string;
  all_quoted: boolean;
  lines: ProductShippingQuoteLine[];
}

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
  selected_products?: Array<{
    product_id: string;
    quantity: number;
    /** Chosen variant (products with a variant matrix). */
    variant_id?: string;
    /** Client-side display price for the line (variant-aware); never sent to the API. */
    unit_cost?: number;
  }>;
  description?: string;
}

/** Resolved buyer contact, taken straight from the loaded `me` query. */
export interface CheckoutContact {
  fullName: string;
  email: string;
  phoneExtension: string;
  phoneNumber: string;
}

export interface CheckoutForm {
  full_name: string;
  email: string;
  phone_extension: string;
  phone_number: string;
  same_as_main: boolean;
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  billing_email: string;
  has_gstin: boolean;
  gstin: string;
  save_as_main: boolean;
  simulate_failure: boolean;
}
