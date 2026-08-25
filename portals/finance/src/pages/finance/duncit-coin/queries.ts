import { gql } from '@apollo/client';
import type { SvgIconComponent } from '@mui/icons-material';
import GroupsIcon from '@mui/icons-material/Groups';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import PercentIcon from '@mui/icons-material/Percent';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RedeemIcon from '@mui/icons-material/Redeem';
import SavingsIcon from '@mui/icons-material/Savings';
import { formatMoney } from '@duncit/utils';

export interface CoinMonthBucket {
  month: string;
  earned: number;
  redeemed: number;
}

export interface CoinAdminStats {
  total_circulated: number;
  total_redeemed: number;
  total_outstanding: number;
  wallet_balance_total: number;
  transaction_count: number;
  holders_count: number;
  earn_pct: number;
  shop_earn_pct: number;
  currency_symbol: string;
  monthly: CoinMonthBucket[];
}

/** Every rule deciding how many coins someone is given. */
export interface CoinSettings {
  pod_join_earn_pct: number;
  shop_earn_pct: number;
  coins_per_referral: number;
  pod_feedback_coins: number;
  updated_at: string;
}

/** One account the manual-adjustment picker can offer. */
export interface CoinUserOption {
  id: string;
  full_name: string;
  email: string;
  balance: number;
}

export interface CoinAdminPod {
  id: string;
  title: string;
  slug: string;
}

/** One coin ledger row, joined server-side to its payment and that payment's pods. */
export interface CoinTxnRow {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  /** Who typed the adjustment. Empty on every automatic row. */
  admin_name: string;
  type: string;
  amount: number;
  balance_after: number;
  source: string;
  reason: string;
  payment_id: string | null;
  payment_total: number;
  /** Every pod the payment touched — a shop cart can span more than one. */
  pods: CoinAdminPod[];
  earn_pct: number;
  spend_amount: number;
  created_at: string;
}

/** The slice of a pod the picker renders — deliberately narrow: `podsTable`
 * returns the full Pod type, and selecting all of it would ship megabytes on
 * every keystroke. */
export interface PodOption {
  id: string;
  pod_id: string;
  pod_title: string;
  club_slug: string;
}

export const COIN_ADMIN_STATS = gql`
  query AdminCoinStats($months: Int) {
    coinAdminStats(months: $months) {
      total_circulated
      total_redeemed
      total_outstanding
      wallet_balance_total
      transaction_count
      holders_count
      earn_pct
      shop_earn_pct
      currency_symbol
      monthly {
        month
        earned
        redeemed
      }
    }
  }
`;

export const COIN_TRANSACTIONS_TABLE = gql`
  query AdminCoinTransactionsTable($query: TableQueryInput, $pod_doc_id: ID) {
    coinTransactionsTable(query: $query, pod_doc_id: $pod_doc_id) {
      total
      rows {
        id
        user_id
        user_name
        user_email
        admin_name
        type
        amount
        balance_after
        source
        reason
        payment_id
        payment_total
        pods {
          id
          title
          slug
        }
        earn_pct
        spend_amount
        created_at
      }
    }
  }
`;

/** The currency the joined order totals are printed in. Read from the public
 * settings rather than re-running the admin stats query for one field. */
export const COIN_CURRENCY = gql`
  query AdminCoinCurrency {
    publicFinanceSettings {
      currency_symbol
    }
  }
`;

/** `include_deleted` matters: the ledger deliberately still names a cancelled
 * pod, so that pod has to stay selectable in the filter that audits it. */
export const COIN_POD_PICKER = gql`
  query AdminCoinPodPicker($query: TableQueryInput) {
    podsTable(query: $query, include_deleted: true) {
      rows {
        id
        pod_id
        pod_title
        club_slug
      }
    }
  }
`;

/** Names the pod a deep link arrived with — `podsTable` cannot be filtered by
 * document id, so a pod outside the first page would otherwise show as blank
 * while the table beneath it is scoped. */
export const COIN_POD_BY_ID = gql`
  query AdminCoinPodById($pod_doc_id: ID!) {
    pod(pod_doc_id: $pod_doc_id, include_deleted: true) {
      id
      pod_id
      pod_title
      club_slug
    }
  }
`;

export const COIN_SETTINGS = gql`
  query FinanceCoinSettings {
    coinSettings {
      pod_join_earn_pct
      shop_earn_pct
      coins_per_referral
      pod_feedback_coins
      updated_at
    }
  }
`;

export const UPDATE_COIN_SETTINGS = gql`
  mutation FinanceUpdateCoinSettings($input: CoinSettingsInput!) {
    updateCoinSettings(input: $input) {
      pod_join_earn_pct
      shop_earn_pct
      coins_per_referral
      pod_feedback_coins
      updated_at
    }
  }
`;

export const COIN_USER_SEARCH = gql`
  query FinanceCoinUserSearch($term: String!) {
    coinUserSearch(term: $term) {
      id
      full_name
      email
      balance
    }
  }
`;

export const ADJUST_USER_COINS = gql`
  mutation FinanceAdjustUserCoins(
    $user_id: ID!
    $direction: CoinAdjustDirection!
    $coins: Int!
    $reason: String!
  ) {
    adjustUserCoins(
      user_id: $user_id
      direction: $direction
      coins: $coins
      reason: $reason
    ) {
      user_id
      balance
      lifetime_earned
      applied
    }
  }
`;

/** How many pods the picker shows before the admin narrows it by typing, and
 * how many a search may return — searching is how you reach past the first ten. */
export const POD_PICKER_PAGE_SIZE = 10;
export const POD_PICKER_SEARCH_SIZE = 25;

/** Characters typed before the user picker asks the server, matching the
 * minimum the resolver itself enforces. */
export const USER_SEARCH_MIN_CHARS = 2;

export type CoinTileKey =
  | 'total_circulated'
  | 'total_redeemed'
  | 'total_outstanding'
  | 'holders_count'
  | 'transaction_count'
  | 'earn_pct'
  | 'shop_earn_pct';

export interface CoinTile {
  key: CoinTileKey;
  label: string;
  icon: SvgIconComponent;
  /** Literal CSS color — it is tinted via MUI `alpha()`, so a theme path breaks. */
  color: string;
  /** Percent tiles read as a rate; every other tile is a coin count. */
  percent?: boolean;
  /** Renders the coin count's rupee equivalence under the value. */
  showValueHint?: boolean;
  to?: string;
}

export const COIN_TILES: readonly CoinTile[] = [
  {
    key: 'total_circulated',
    label: 'Coins Circulated',
    icon: MonetizationOnIcon,
    color: '#2563eb',
    showValueHint: true,
  },
  {
    key: 'total_redeemed',
    label: 'Coins Redeemed',
    icon: RedeemIcon,
    color: '#0f766e',
    showValueHint: true,
  },
  {
    key: 'total_outstanding',
    label: 'Not Redeemed',
    icon: SavingsIcon,
    color: '#d97706',
    showValueHint: true,
  },
  { key: 'holders_count', label: 'Coin Holders', icon: GroupsIcon, color: '#7c3aed' },
  { key: 'transaction_count', label: 'Ledger Entries', icon: ReceiptLongIcon, color: '#0891b2' },
  {
    key: 'earn_pct',
    label: 'Pod Join Earn',
    icon: PercentIcon,
    color: '#dc2626',
    percent: true,
    to: '/duncit-coin/settings',
  },
  {
    key: 'shop_earn_pct',
    label: 'Shop Earn',
    icon: PercentIcon,
    color: '#db2777',
    percent: true,
    to: '/duncit-coin/settings',
  },
];

/** Coins are counted, not priced — the symbol belongs only on the value hint. */
export const coinCount = (value: number): string => formatMoney(value, { symbol: '' });

export const coinValue = (value: number, symbol: string): string =>
  `${formatMoney(value, { symbol })} of value`;
