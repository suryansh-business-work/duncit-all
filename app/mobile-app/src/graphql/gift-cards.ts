import { gql } from '@/generated/graphql';

/** Amount presets + custom bounds + validity for the buy page — mWeb's
 * GIFT_CARD_SETTINGS. Configured in Finance > Gift Cards. */
export const MobileGiftCardSettingsDocument = gql(`
  query MobileGiftCardSettings {
    publicGiftCardSettings {
      denominations
      min_amount
      max_amount
      validity_months
      updated_at
    }
  }
`);

/** The caller's cards — held or redeemed by them, and the ones they gifted
 * away. mWeb's MY_GIFT_CARDS. */
export const MobileMyGiftCardsDocument = gql(`
  query MobileMyGiftCards {
    myGiftCards {
      owned {
        id
        code
        scope_type
        scope_category_id
        scope_name
        scope_image_url
        initial_amount
        balance
        status
        recipient_email
        recipient_name
        message
        redeemed
        redeemed_at
        expires_at
        created_at
        sender_name
      }
      gifted {
        id
        code
        scope_type
        scope_category_id
        scope_name
        scope_image_url
        initial_amount
        balance
        status
        recipient_email
        recipient_name
        message
        redeemed
        redeemed_at
        expires_at
        created_at
        sender_name
      }
    }
  }
`);

/** One card by its code — the redeem/claim lookup (fills sender_name). */
export const MobileGiftCardByCodeDocument = gql(`
  query MobileGiftCardByCode($code: String!) {
    giftCardByCode(code: $code) {
      id
      code
      scope_type
      scope_category_id
      scope_name
      scope_image_url
      initial_amount
      balance
      status
      recipient_email
      recipient_name
      message
      redeemed
      redeemed_at
      expires_at
      created_at
      sender_name
    }
  }
`);

/** Convert the card's full value into Duncit Coins for the caller. A repeat
 * call by the same person is a no-op reporting coins_added: 0. */
export const MobileRedeemGiftCardDocument = gql(`
  mutation MobileRedeemGiftCard($code: String!) {
    redeemGiftCard(code: $code) {
      coins_added
      coin_balance
      card {
        id
        code
        scope_type
        scope_category_id
        scope_name
        scope_image_url
        initial_amount
        balance
        status
        recipient_email
        recipient_name
        message
        redeemed
        redeemed_at
        expires_at
        created_at
        sender_name
      }
    }
  }
`);

/** Gift card purchase via the dummy gateway — selection mirrors
 * MobileDummyCheckout so the shared success view renders it unchanged. */
export const MobileDummyGiftCardCheckoutDocument = gql(`
  mutation MobileDummyGiftCardCheckout($input: DummyGiftCardCheckoutInput!) {
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
`);

/** Live gift card purchase step 1 — a Razorpay order + PENDING payment.
 * Selection mirrors MobileCreateRazorpayOrder so RazorpayWebView and the
 * shared verify flow (MobileVerifyRazorpay) take the order unchanged. */
export const MobileCreateRazorpayGiftCardOrderDocument = gql(`
  mutation MobileCreateRazorpayGiftCardOrder($input: GiftCardCheckoutInput!) {
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
`);
