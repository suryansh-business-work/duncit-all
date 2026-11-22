import { gql } from '@/generated/graphql';

/** Everything the buy page needs in one request — the default design, the
 * sales policy (Loyalty > Gift Card Settings) and printed stock. mWeb's
 * GIFT_CARD_STOREFRONT. */
export const MobileGiftCardStorefrontDocument = gql(`
  query MobileGiftCardStorefront {
    giftCardStorefront {
      design {
        id
        name
        front_image_url
        back_image_url
      }
      settings {
        denominations
        min_amount
        max_amount
        validity_months
        max_quantity
        physical_enabled
        shipping_fee
        updated_at
      }
      physical_available
      currency_symbol
    }
  }
`);

/** The member's gift card orders, newest first — mWeb's MY_GIFT_CARD_ORDERS. */
export const MobileMyGiftCardOrdersDocument = gql(`
  query MobileMyGiftCardOrders($page: Int, $page_size: Int) {
    myGiftCardOrders(page: $page, page_size: $page_size) {
      total
      rows {
        id
        order_no
        delivery_mode
        design_name
        design_front_url
        amount
        quantity
        total
        currency_symbol
        payment_status
        fulfilment_status
        created_at
      }
    }
  }
`);

/** One of the member's orders with its tracking — mWeb's MY_GIFT_CARD_ORDER. */
export const MobileMyGiftCardOrderDocument = gql(`
  query MobileMyGiftCardOrder($order_no: String!) {
    myGiftCardOrder(order_no: $order_no) {
      id
      order_no
      delivery_mode
      design_name
      design_front_url
      design_back_url
      amount
      quantity
      cards_value
      shipping_fee
      total
      currency_symbol
      recipient_email
      payment_status
      fulfilment_status
      created_at
      shipping_address {
        name
        line1
        line2
        landmark
        city
        state
        pincode
      }
      shipment {
        courier_name
        awb
        etd
      }
      tracking_events {
        status
        location
        note
        at
      }
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
        scope_image_front_url
        scope_image_back_url
        design_name
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
        scope_image_front_url
        scope_image_back_url
        design_name
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
      scope_image_front_url
      scope_image_back_url
      design_name
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
        scope_image_front_url
        scope_image_back_url
        design_name
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

/** Redeem a PRINTED card by its number and scratch-panel passcode — the only
 * call there is for one (no lookup). Asks for what the success card shows. */
export const MobileRedeemPhysicalGiftCardDocument = gql(`
  mutation MobileRedeemPhysicalGiftCard($card_number: String!, $passcode: String!) {
    redeemPhysicalGiftCard(card_number: $card_number, passcode: $passcode) {
      coins_added
      coin_balance
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
      smart_incentive_amount
      smart_incentive_pct
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
        smart_incentive_amount
        smart_incentive_pct
        currency_symbol
        status
        paid_at
        created_at
      }
    }
  }
`);
