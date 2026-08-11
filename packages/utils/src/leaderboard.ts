/**
 * Leaderboard metadata shared by mWeb and the native app (rule 27/40): the
 * board list, the i18n key per board, and the config field that prices each
 * board's action. Framework-free — the MUI and Tamagui views stay in their
 * apps and render from this one vocabulary, so the two surfaces can never
 * disagree about what a board is called or which number prices it.
 *
 * The i18n keys are written out as literals (never assembled from the
 * category) so the translation-key gate can see every key in source.
 */

export const LEADERBOARD_CATEGORIES = ['USER', 'HOST', 'CLUB_ADMIN', 'VENUE', 'BRAND'] as const;
export type LeaderboardCategory = (typeof LEADERBOARD_CATEGORIES)[number];

export const LEADERBOARD_PERIODS = ['MONTH', 'YEAR', 'ALL'] as const;
export type LeaderboardPeriodKey = (typeof LEADERBOARD_PERIODS)[number];

/** Tab label key per board. */
export const LEADERBOARD_TAB_KEY: Record<LeaderboardCategory, string> = {
  USER: 'mweb.leaderboard.tabUser',
  HOST: 'mweb.leaderboard.tabHost',
  CLUB_ADMIN: 'mweb.leaderboard.tabClubAdmin',
  VENUE: 'mweb.leaderboard.tabVenue',
  BRAND: 'mweb.leaderboard.tabBrand',
};

/** "How to increase your points" line key per board. */
export const LEADERBOARD_EARN_KEY: Record<LeaderboardCategory, string> = {
  USER: 'mweb.leaderboard.earnJoin',
  HOST: 'mweb.leaderboard.earnHost',
  CLUB_ADMIN: 'mweb.leaderboard.earnClubAdmin',
  VENUE: 'mweb.leaderboard.earnVenue',
  BRAND: 'mweb.leaderboard.earnBrand',
};

/** Period toggle label key per ranking window. */
export const LEADERBOARD_PERIOD_KEY: Record<LeaderboardPeriodKey, string> = {
  MONTH: 'mweb.leaderboard.periodMonth',
  YEAR: 'mweb.leaderboard.periodYear',
  ALL: 'mweb.leaderboard.periodAll',
};

/** Which `leaderboardConfig` field prices each board's action. */
export const LEADERBOARD_POINTS_FIELD = {
  USER: 'points_per_join',
  HOST: 'points_per_host',
  CLUB_ADMIN: 'points_per_club_pod',
  VENUE: 'points_per_venue_pod',
  BRAND: 'points_per_product_sale',
} as const satisfies Record<LeaderboardCategory, string>;

export type LeaderboardMedal = 'gold' | 'silver' | 'bronze';

/** Podium tint for a rank, or null past the podium. */
export function leaderboardMedal(rank: number): LeaderboardMedal | null {
  if (rank === 1) return 'gold';
  if (rank === 2) return 'silver';
  if (rank === 3) return 'bronze';
  return null;
}
