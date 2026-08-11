/**
 * Enum orderings and their localization keys, shared by the three Leaderboard
 * pages. Keys are full literals so the translation-key gate can see each one.
 */
import type { LeaderboardCategory, LeaderboardPeriod, LeaderboardRewardPeriod } from './queries';

/** The slice of the shared translator these pages need. */
export type TranslateFn = (key: string) => string;

export const CATEGORIES: readonly LeaderboardCategory[] = [
  'USER',
  'HOST',
  'CLUB_ADMIN',
  'VENUE',
  'BRAND',
];

export const CATEGORY_LABEL_KEYS: Record<LeaderboardCategory, string> = {
  USER: 'admin.leaderboard.catUser',
  HOST: 'admin.leaderboard.catHost',
  CLUB_ADMIN: 'admin.leaderboard.catClubAdmin',
  VENUE: 'admin.leaderboard.catVenue',
  BRAND: 'admin.leaderboard.catBrand',
};

export const PERIODS: readonly LeaderboardPeriod[] = ['MONTH', 'YEAR', 'ALL'];

export const PERIOD_LABEL_KEYS: Record<LeaderboardPeriod, string> = {
  MONTH: 'admin.leaderboard.periodMonth',
  YEAR: 'admin.leaderboard.periodYear',
  ALL: 'admin.leaderboard.periodAll',
};

export const REWARD_PERIODS: readonly LeaderboardRewardPeriod[] = ['MONTHLY', 'YEARLY'];

export const REWARD_PERIOD_LABEL_KEYS: Record<LeaderboardRewardPeriod, string> = {
  MONTHLY: 'admin.leaderboard.rewardMonthly',
  YEARLY: 'admin.leaderboard.rewardYearly',
};

/** Ledger source types, straight from the server's award writers. */
export const SOURCE_TYPES = [
  'POD_JOIN',
  'POD_HOSTED',
  'CLUB_POD_COMPLETED',
  'VENUE_POD_COMPLETED',
  'PRODUCT_SALE',
] as const;
