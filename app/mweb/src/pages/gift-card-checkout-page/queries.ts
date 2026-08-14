import { gql } from '@apollo/client';

/** Gift card purchase via the dummy gateway. Returns the same Payment fields
 * every other checkout selects. */
export const DUMMY_GIFT_CARD_CHECKOUT = gql`
  mutation DummyGiftCardCheckout($input: DummyGiftCardCheckoutInput!) {
    dummyGiftCardCheckout(input: $input) {
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

/** Gift card purchase via Razorpay (step 1; verify with the shared
 * VERIFY_RAZORPAY_PAYMENT). Same RazorpayOrder shape as the other flows. */
export const CREATE_RAZORPAY_GIFT_CARD_ORDER = gql`
  mutation CreateRazorpayGiftCardOrder($input: GiftCardCheckoutInput!) {
    createRazorpayGiftCardOrder(input: $input) {
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
