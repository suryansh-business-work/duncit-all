import { formatMoney } from './format-money';

/**
 * The Club Admin dashboard, as data.
 *
 * `clubAdminDashboard` answers sixteen numbers, a monthly trend and two lists.
 * WHICH numbers become cards, in WHAT groups and order, how each figure is
 * written and what the range select turns into a `from` boundary are decided
 * once, here, so the MUI stat cards in Partners and mWeb and the Tamagui tiles
 * in the native app read the same dashboard (rules 27 + 40).
 *
 * No user-facing word lives in this module: `club-admin-copy.ts` labels every
 * card, group, range and series from the caller's own bundle.
 */

/** Headline metrics across every club the admin runs. */
export interface ClubAdminKpis {
  assigned_clubs: number;
  total_pods: number;
  upcoming_pods: number;
  completed_pods: number;
  total_bookings: number;
  backed_out: number;
  total_attendees: number;
  total_spots: number;
  /** Occupancy: attendees / spots (0..1). */
  fill_rate: number;
  total_followers: number;
  new_followers: number;
  avg_rating: number;
  ratings_count: number;
  active_hosts: number;
  total_revenue: number;
  currency_symbol: string;
}

/** One month of the trend chart. */
export interface ClubAdminTrendPoint {
  label: string;
  pods: number;
  bookings: number;
  followers: number;
  revenue: number;
}

/** One row of the per-club breakdown. */
export interface ClubAdminClubRow {
  club_id: string;
  club_slug: string;
  club_name: string;
  total_pods: number;
  upcoming_pods: number;
  completed_pods: number;
  followers: number;
  rating: number;
  revenue: number;
}

/** One tile of the category card: a category the admin's clubs run under. */
export interface ClubAdminCategoryRow {
  category_id: string;
  name: string;
  super_category: string | null;
  clubs: number;
  pods: number;
}

export interface ClubAdminDashboard {
  kpis: ClubAdminKpis;
  trend: ClubAdminTrendPoint[];
  clubs: ClubAdminClubRow[];
  categories: ClubAdminCategoryRow[];
}

/** The figures before the query answers — every number at zero, in rupees. */
export const emptyClubAdminKpis: ClubAdminKpis = {
  assigned_clubs: 0,
  total_pods: 0,
  upcoming_pods: 0,
  completed_pods: 0,
  total_bookings: 0,
  backed_out: 0,
  total_attendees: 0,
  total_spots: 0,
  fill_rate: 0,
  total_followers: 0,
  new_followers: 0,
  avg_rating: 0,
  ratings_count: 0,
  active_hosts: 0,
  total_revenue: 0,
  currency_symbol: '₹',
};

export const emptyClubAdminDashboard: ClubAdminDashboard = {
  kpis: emptyClubAdminKpis,
  trend: [],
  clubs: [],
  categories: [],
};

/** The four titled groups the cards sit under, in order. */
export type ClubAdminKpiGroupKey = 'overview' | 'engagement' | 'community' | 'revenue';

/** The figures that become cards. `ratings_count` rides on the rating card and
 * `currency_symbol` formats the money one; neither is a card of its own. */
export type ClubAdminKpiCardKey = Exclude<keyof ClubAdminKpis, 'ratings_count' | 'currency_symbol'>;

/** How a card's number is written. */
export type ClubAdminKpiKind = 'count' | 'money' | 'percent' | 'rating';

export interface ClubAdminKpiCard {
  key: ClubAdminKpiCardKey;
  kind: ClubAdminKpiKind;
  value: number;
  /** The rating card only: how many ratings the average is over. */
  count?: number;
}

export interface ClubAdminKpiGroup {
  key: ClubAdminKpiGroupKey;
  cards: ClubAdminKpiCard[];
}

type CardSpec = Pick<ClubAdminKpiCard, 'key' | 'kind'>;

/** Four groups, fourteen cards — the order every surface draws them in. */
const GROUPS: ReadonlyArray<{ key: ClubAdminKpiGroupKey; cards: readonly CardSpec[] }> = [
  {
    key: 'overview',
    cards: [
      { key: 'assigned_clubs', kind: 'count' },
      { key: 'total_pods', kind: 'count' },
      { key: 'upcoming_pods', kind: 'count' },
      { key: 'completed_pods', kind: 'count' },
    ],
  },
  {
    key: 'engagement',
    cards: [
      { key: 'total_bookings', kind: 'count' },
      { key: 'total_attendees', kind: 'count' },
      { key: 'fill_rate', kind: 'percent' },
      { key: 'backed_out', kind: 'count' },
    ],
  },
  {
    key: 'community',
    cards: [
      { key: 'total_followers', kind: 'count' },
      { key: 'new_followers', kind: 'count' },
      { key: 'avg_rating', kind: 'rating' },
      { key: 'active_hosts', kind: 'count' },
    ],
  },
  {
    key: 'revenue',
    cards: [
      { key: 'total_revenue', kind: 'money' },
      { key: 'total_spots', kind: 'count' },
    ],
  },
];

function toCard(kpis: ClubAdminKpis, spec: CardSpec): ClubAdminKpiCard {
  const card: ClubAdminKpiCard = { key: spec.key, kind: spec.kind, value: kpis[spec.key] };
  if (spec.kind === 'rating') card.count = kpis.ratings_count;
  return card;
}

/** The dashboard's cards, grouped and ordered, each with its figure and how to write it. */
export function clubAdminKpiGroups(kpis: ClubAdminKpis): ClubAdminKpiGroup[] {
  return GROUPS.map((group) => ({
    key: group.key,
    cards: group.cards.map((spec) => toCard(kpis, spec)),
  }));
}

const COUNT_FORMAT = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** A whole number with en-IN grouping: 125000 → "1,25,000". */
export const formatCount = (value: number): string => COUNT_FORMAT.format(Number(value || 0));

/** A 0..1 fraction as a whole percentage: 0.734 → "73%". */
export const formatPercent = (fraction: number): string =>
  `${Math.round(Number(fraction || 0) * 100)}%`;

/** A rating to one decimal: 4.36 → "4.4". */
export const formatRating = (value: number): string => Number(value || 0).toFixed(1);

/** The figure a card shows, written the way every surface writes it. */
export function clubAdminKpiValue(card: ClubAdminKpiCard, symbol: string): string {
  if (card.kind === 'money') return formatMoney(card.value, { symbol });
  if (card.kind === 'percent') return formatPercent(card.value);
  if (card.kind === 'rating') return `${formatRating(card.value)} (${formatCount(card.count ?? 0)})`;
  return formatCount(card.value);
}

/** The windows the dashboard can be put into. */
export type ClubAdminRange = '30d' | 'month' | '12m' | 'all';

/** What the dashboard opens on. */
export const DEFAULT_CLUB_ADMIN_RANGE: ClubAdminRange = '12m';

const daysBefore = (now: Date, days: number): string => {
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  return start.toISOString();
};

const startOfMonth = (now: Date): string =>
  new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

/** The same day of the month, `months` earlier, clamped to that month's length (29 Feb → 28 Feb). */
const monthsBefore = (now: Date, months: number): string => {
  const start = new Date(now);
  const day = start.getDate();
  start.setDate(1);
  start.setMonth(start.getMonth() - months);
  const lastDay = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  start.setDate(Math.min(day, lastDay));
  return start.toISOString();
};

/** Each range's `from` boundary as ISO, or null for no lower bound. */
const RANGE_FROM: Record<ClubAdminRange, (now: Date) => string | null> = {
  '30d': (now) => daysBefore(now, 30),
  month: (now) => startOfMonth(now),
  '12m': (now) => monthsBefore(now, 12),
  all: () => null,
};

export interface ClubAdminRangeOption {
  value: ClubAdminRange;
  from: (now: Date) => string | null;
}

/** The range select's rows, in order, each answering its own `from` boundary. */
export const clubAdminRanges: readonly ClubAdminRangeOption[] = (
  ['30d', 'month', '12m', 'all'] as const
).map((value) => ({ value, from: RANGE_FROM[value] }));

/** The `from` argument `clubAdminDashboard` takes for a range: ISO, or null for all time. */
export function clubAdminRangeFrom(range: ClubAdminRange, now: Date = new Date()): string | null {
  return RANGE_FROM[range](now);
}

/** The four lines of the monthly trend. */
export type ClubAdminTrendKey = 'pods' | 'bookings' | 'followers' | 'revenue';

/** Which theme colour a line takes; each surface resolves it from its own palette. */
export type ClubAdminTrendPalette = 'primary' | 'success' | 'info' | 'warning';

export interface ClubAdminTrendSeries {
  key: ClubAdminTrendKey;
  palette: ClubAdminTrendPalette;
}

export const clubAdminTrendSeries: readonly ClubAdminTrendSeries[] = [
  { key: 'pods', palette: 'primary' },
  { key: 'bookings', palette: 'success' },
  { key: 'followers', palette: 'info' },
  { key: 'revenue', palette: 'warning' },
];
