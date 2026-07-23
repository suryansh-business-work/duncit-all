import { gql } from '@/generated/graphql';

/** Standalone product-cart checkout via the dummy gateway (no pod ticket).
 * Returns the same Payment fields the pod dummy checkout selects — mWeb's
 * DUMMY_PRODUCT_CHECKOUT. */
export const MobileDummyProductCheckoutDocument = gql(`
  mutation MobileDummyProductCheckout($input: DummyProductCheckoutInput!) {
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
`);

/** Standalone product-cart checkout via Razorpay (step 1; verify with the shared
 * MobileVerifyRazorpayDocument). Same RazorpayOrder shape as the pod flow —
 * mWeb's CREATE_RAZORPAY_PRODUCT_ORDER. */
export const MobileCreateRazorpayProductOrderDocument = gql(`
  mutation MobileCreateRazorpayProductOrder($input: ProductCheckoutInput!) {
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
`);

/** Live ShipRocket delivery estimate for a product cart (preview only; the
 * charged amount is recomputed server-side at checkout) — mWeb's
 * PRODUCT_SHIPPING_QUOTE. */
export const MobileProductShippingQuoteDocument = gql(`
  query MobileProductShippingQuote($input: ProductShippingQuoteInput!) {
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
`);
