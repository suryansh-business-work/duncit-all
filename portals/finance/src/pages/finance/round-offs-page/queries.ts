import { gql } from '@apollo/client';

/** The checkout a payment came from, as the server classifies it. */
export type PaymentSource = 'POD_BOOKING' | 'POD_SHOP' | 'ECOMM' | 'OTHER';

/** Row shape for the Round Offs table (the fields the columns touch). */
export interface RoundOffRow {
  id: string;
  payment_id: string;
  invoice_no: string | null;
  user_name: string;
  user_email: string;
  description: string;
  source: PaymentSource;
  /** The bill before it was rounded up. */
  bill_amount: number;
  round_off: number;
  coins_redeemed: number;
  /** What was actually charged. */
  total: number;
  currency_symbol: string;
  status: string;
  gateway: string;
  paid_at: string | null;
  created_at: string;
}

/** Totals over every payment the table's filter matches — worked out by the server. */
export interface RoundOffSummary {
  count: number;
  round_off_total: number;
  collected_round_off_total: number;
}

export const EMPTY_ROUND_OFF_SUMMARY: RoundOffSummary = {
  count: 0,
  round_off_total: 0,
  collected_round_off_total: 0,
};

export const ROUND_OFFS_TABLE = gql`
  query PaymentRoundOffsTable($query: TableQueryInput) {
    paymentRoundOffsTable(query: $query) {
      total
      summary {
        count
        round_off_total
        collected_round_off_total
      }
      rows {
        id
        payment_id
        invoice_no
        user_name
        user_email
        description
        source
        bill_amount
        round_off
        coins_redeemed
        total
        currency_symbol
        status
        gateway
        paid_at
        created_at
      }
    }
  }
`;

/** What `paymentRoundOffsTable` answers with: one page of rounded payments and the totals for the filter. */
export interface RoundOffsData {
  paymentRoundOffsTable: { rows: RoundOffRow[]; total: number; summary: RoundOffSummary | null } | null;
}
