import { gql } from '@/generated/graphql';

/** Public finance settings (fee/GST/currency) — mWeb's PUBLIC_FINANCE. */
export const MobilePublicFinanceDocument = gql(`
  query MobilePublicFinanceSettings {
    publicFinanceSettings {
      platform_fee_pct
      gst_pct
      currency_symbol
      dummy_mode
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

/** Base64 PDF invoice for the completed payment — shared with pod history. */
export const MobileCheckoutInvoiceDocument = gql(`
  query MobileCheckoutInvoicePdf($id: ID!) {
    paymentInvoicePdfBase64(payment_doc_id: $id)
  }
`);
