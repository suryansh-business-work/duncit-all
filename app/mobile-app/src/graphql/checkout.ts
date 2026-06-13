import { gql } from '@/generated/graphql';

/** Public finance settings (fee/GST/currency/gateway) — mWeb's PUBLIC_FINANCE. */
export const MobilePublicFinanceDocument = gql(`
  query MobilePublicFinanceSettings {
    publicFinanceSettings {
      platform_fee_pct
      gst_pct
      currency_symbol
      dummy_mode
      razorpay_enabled
    }
  }
`);

/** Contact prefill for checkout — mWeb's CHECKOUT_ME. */
export const MobileCheckoutMeDocument = gql(`
  query MobileCheckoutMe {
    me {
      user_id
      first_name
      last_name
      email
      phone_number
      phone_extension
    }
  }
`);

/** The pod being booked — mWeb's CHECKOUT_POD (trimmed to what mobile renders). */
export const MobileCheckoutPodDocument = gql(`
  query MobileCheckoutPod($id: ID!) {
    pod(pod_doc_id: $id) {
      id
      pod_id
      pod_title
      pod_date_time
      pod_type
      pod_amount
      zone_name
      pod_images_and_videos {
        url
        type
      }
    }
  }
`);

/** Simulated checkout — mWeb's DUMMY_CHECKOUT. Returns a payment record. */
export const MobileDummyCheckoutDocument = gql(`
  mutation MobileDummyCheckout($input: DummyCheckoutInput!) {
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
`);

/** Preview a coupon on the payment step — drives the strikethrough / Pay X UI. */
export const MobilePreviewCouponDocument = gql(`
  query MobilePreviewCoupon($input: CouponPreviewInput!) {
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
`);

/** Active coupons a shopper can apply (global + this pod) — checkout picker. */
export const MobileAvailableCouponsDocument = gql(`
  query MobileAvailableCoupons($pod_id: ID) {
    availableCouponsForPod(pod_id: $pod_id) {
      id
      code
      description
      discount_pct
      min_order_amount
      scope
    }
  }
`);

/** Live checkout step 1 — create a Razorpay order + PENDING payment. */
export const MobileCreateRazorpayOrderDocument = gql(`
  mutation MobileCreateRazorpayOrder($input: RazorpayOrderInput!) {
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
`);

/** Live checkout step 2 — verify the signature, finalize the payment. */
export const MobileVerifyRazorpayDocument = gql(`
  mutation MobileVerifyRazorpayPayment($input: VerifyRazorpayInput!) {
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
`);

/** Base64 PDF invoice for the completed payment — shared with pod history. */
export const MobileCheckoutInvoiceDocument = gql(`
  query MobileCheckoutInvoicePdf($id: ID!) {
    paymentInvoicePdfBase64(payment_doc_id: $id)
  }
`);
