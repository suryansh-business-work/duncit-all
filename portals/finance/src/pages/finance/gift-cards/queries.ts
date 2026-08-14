import { gql } from '@apollo/client';
import type { SvgIconComponent } from '@mui/icons-material';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import PaymentsIcon from '@mui/icons-material/Payments';
import RedeemIcon from '@mui/icons-material/Redeem';
import SavingsIcon from '@mui/icons-material/Savings';
import ScheduleIcon from '@mui/icons-material/Schedule';

export interface GiftCardMonthBucket {
  month: string;
  sold: number;
  redeemed: number;
}

export interface GiftCardAdminStats {
  sold_count: number;
  sold_value: number;
  redeemed_count: number;
  redeemed_value: number;
  outstanding_value: number;
  expired_value: number;
  validity_months: number;
  currency_symbol: string;
  monthly: GiftCardMonthBucket[];
}

/** The sales policy: which amounts the buy page offers and how long a card lives. */
export interface GiftCardSettings {
  denominations: number[];
  min_amount: number;
  max_amount: number;
  validity_months: number;
  updated_at: string;
}

/** What the card book shows: the stored enums plus the read-time EXPIRED. */
export type GiftCardDisplayStatus = 'ACTIVE' | 'REDEEMED' | 'EXPIRED';

/** One card of the book, joined with who bought it and who redeemed it. */
export interface GiftCardCardRow {
  id: string;
  code: string;
  scope_type: string;
  scope_category_id: string | null;
  scope_name: string;
  scope_image_url: string;
  initial_amount: number;
  balance: number;
  status: string;
  recipient_email: string;
  recipient_name: string;
  redeemed: boolean;
  redeemed_at: string | null;
  expires_at: string;
  created_at: string;
  purchaser_name: string;
  purchaser_email: string;
  redeemer_name: string;
  redeemer_email: string;
  payment_id: string;
}

/** One ledger row — the purchaser on ISSUE rows, the redeemer on REDEEM rows. */
export interface GiftCardTxnRow {
  id: string;
  gift_card_id: string;
  code: string;
  user_id: string;
  user_name: string;
  user_email: string;
  type: string;
  amount: number;
  balance_after: number;
  source: string;
  payment_id: string | null;
  created_at: string;
}

export const GIFT_CARD_ADMIN_STATS = gql`
  query FinanceGiftCardAdminStats($months: Int) {
    giftCardAdminStats(months: $months) {
      sold_count
      sold_value
      redeemed_count
      redeemed_value
      outstanding_value
      expired_value
      validity_months
      currency_symbol
      monthly {
        month
        sold
        redeemed
      }
    }
  }
`;

export const GIFT_CARD_CARDS_TABLE = gql`
  query FinanceGiftCardsTable($query: TableQueryInput) {
    giftCardsTable(query: $query) {
      total
      rows {
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
    }
  }
`;

export const GIFT_CARD_TXNS_TABLE = gql`
  query FinanceGiftCardTransactionsTable($query: TableQueryInput) {
    giftCardTransactionsTable(query: $query) {
      total
      rows {
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
    }
  }
`;

/** The policy the settings card edits — the same read the buy page uses. */
export const PUBLIC_GIFT_CARD_SETTINGS = gql`
  query FinancePublicGiftCardSettings {
    publicGiftCardSettings {
      denominations
      min_amount
      max_amount
      validity_months
      updated_at
    }
  }
`;

export const UPDATE_GIFT_CARD_SETTINGS = gql`
  mutation FinanceUpdateGiftCardSettings($input: GiftCardSettingsInput!) {
    updateGiftCardSettings(input: $input) {
      denominations
      min_amount
      max_amount
      validity_months
      updated_at
    }
  }
`;

/** The tables print rupee amounts; the symbol is admin-configured, not assumed. */
export const GIFT_CARD_CURRENCY = gql`
  query FinanceGiftCardCurrency {
    publicFinanceSettings {
      currency_symbol
    }
  }
`;

export type GiftCardTileKey =
  | 'sold_count'
  | 'sold_value'
  | 'redeemed_value'
  | 'outstanding_value'
  | 'expired_value'
  | 'validity_months';

export interface GiftCardTile {
  key: GiftCardTileKey;
  icon: SvgIconComponent;
  /** Literal CSS color — it is tinted via MUI `alpha()`, so a theme path breaks. */
  color: string;
  /** Money tiles carry the currency symbol; the sold count is a plain count. */
  money?: boolean;
}

/** Labels come from `finance.giftCards.tile*` keys at render time (rule 38). */
export const GIFT_CARD_TILES: readonly GiftCardTile[] = [
  { key: 'sold_count', icon: CardGiftcardIcon, color: '#2563eb' },
  { key: 'sold_value', icon: PaymentsIcon, color: '#7c3aed', money: true },
  { key: 'redeemed_value', icon: RedeemIcon, color: '#0f766e', money: true },
  { key: 'outstanding_value', icon: SavingsIcon, color: '#d97706', money: true },
  { key: 'expired_value', icon: EventBusyIcon, color: '#dc2626', money: true },
  { key: 'validity_months', icon: ScheduleIcon, color: '#0891b2' },
];
