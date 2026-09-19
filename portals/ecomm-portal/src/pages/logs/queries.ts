import { gql } from '@apollo/client';

/** A payment as the store's Payment logs table lists it. */
export interface StorePaymentRow {
  id: string;
  payment_id: string;
  invoice_no: string | null;
  user_name: string;
  user_email: string;
  description: string;
  total: number;
  currency_symbol: string;
  coupon_code: string | null;
  coupon_discount: number;
  coins_redeemed: number;
  status: string;
  gateway: string;
  paid_at: string | null;
  created_at: string;
}

export const STORE_PAYMENTS_TABLE = gql`
  query StorePaymentsTable($query: TableQueryInput) {
    storePaymentsTable(query: $query) {
      total
      rows {
        id
        payment_id
        invoice_no
        user_name
        user_email
        description
        total
        currency_symbol
        coupon_code
        coupon_discount
        coins_redeemed
        status
        gateway
        paid_at
        created_at
      }
    }
  }
`;
