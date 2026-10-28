import { gql } from '@apollo/client';
import type { GiftCardCardRow, GiftCardTxnRow } from '../queries';
import type { CoinCredit } from '../../../../components/detail/CoinCreditSection';

/** The virtual card's own fields the list does not carry. */
export interface GiftCardDetailCard extends GiftCardCardRow {
  scope_image_front_url: string;
  scope_image_back_url: string;
  message: string;
}

/** The purchase payment behind the card, as Finance recorded it. */
export interface GiftCardPaymentSummary {
  /** The payment document — what the Finance payment page is addressed by. */
  id: string;
  payment_id: string;
  invoice_no: string | null;
  status: string;
  gateway: string;
  gateway_ref: string | null;
  subtotal: number;
  platform_fee_amount: number;
  gst_amount: number;
  coupon_code: string | null;
  coupon_discount: number;
  coins_redeemed: number;
  total: number;
  currency_symbol: string;
  user_phone: string | null;
  paid_at: string | null;
  created_at: string;
  issue_step_status: string;
  email_step_status: string;
  email_step_detail: string;
  email_step_at: string | null;
}

export interface GiftCardAdminDetail {
  card: GiftCardDetailCard;
  payment: GiftCardPaymentSummary | null;
  transactions: GiftCardTxnRow[];
  coin_credit: CoinCredit | null;
}

export const GIFT_CARD_ADMIN_DETAIL = gql`
  query LoyaltyGiftCardAdminDetail($id: ID!) {
    giftCardAdminDetail(id: $id) {
      card {
        id
        code
        scope_type
        scope_category_id
        scope_name
        scope_image_url
        scope_image_front_url
        scope_image_back_url
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
        purchaser_name
        purchaser_email
        redeemer_name
        redeemer_email
        payment_id
      }
      payment {
        id
        payment_id
        invoice_no
        status
        gateway
        gateway_ref
        subtotal
        platform_fee_amount
        gst_amount
        coupon_code
        coupon_discount
        coins_redeemed
        total
        currency_symbol
        user_phone
        paid_at
        created_at
        issue_step_status
        email_step_status
        email_step_detail
        email_step_at
      }
      transactions {
        id
        gift_card_id
        code
        user_id
        user_name
        user_email
        type
        amount
        balance_after
        source
        payment_id
        created_at
      }
      coin_credit {
        id
        user_id
        amount
        balance_after
        reason
        created_at
      }
    }
  }
`;
