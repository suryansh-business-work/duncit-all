/**
 * The shipped membership catalogue — the tiers and the comparison matrix a
 * fresh database starts with.
 *
 * Seeded with `$setOnInsert`, so this is a STARTING POINT and never an
 * overwrite: once a row exists, Admin > Membership owns it and a redeploy
 * leaves the edited copy alone. Prices are text because a tier can read "Free"
 * or "Invite only", and every one of them is provisional — the tiers ship as
 * coming soon and nothing here bills anyone.
 */

export const MEMBERSHIP_PLAN_KEYS = ['free', 'access', 'connect', 'elite', 'luxe'] as const;

/** Cell values the apps render as an icon instead of text. */
export const BENEFIT_YES = '✓';
export const BENEFIT_NO = '—';

export const DEFAULT_MEMBERSHIP_PLANS = [
  {
    key: 'free',
    name: 'Free',
    tagline: 'Everything you use on Duncit today.',
    price_label: '₹0',
    price_note: 'Always',
    badge_label: '',
    accent_color: '#7D8694',
    cta_label: 'Your current plan',
    sort_order: 0,
    is_active: true,
  },
  {
    key: 'access',
    name: 'Access',
    tagline: 'No booking fee and a head start on every pod.',
    price_label: '₹499',
    price_note: '/ year',
    badge_label: '',
    accent_color: '#C08414',
    cta_label: 'Notify me',
    sort_order: 1,
    is_active: true,
  },
  {
    key: 'connect',
    name: 'Connect',
    tagline: 'Held spots, member-only pods and guest passes.',
    price_label: '₹1,499',
    price_note: '/ year · or ₹199 / mo',
    badge_label: 'Most popular',
    accent_color: '#B4532A',
    cta_label: 'Notify me',
    sort_order: 2,
    is_active: true,
  },
  {
    key: 'elite',
    name: 'Elite',
    tagline: 'For regulars and hosts who live on the platform.',
    price_label: '₹5,999',
    price_note: '/ year · or ₹749 / mo',
    badge_label: '',
    accent_color: '#8C2F39',
    cta_label: 'Notify me',
    sort_order: 3,
    is_active: true,
  },
  {
    key: 'luxe',
    name: 'Luxe',
    tagline: 'Bespoke private pods and a named relationship manager.',
    price_label: 'Invite only',
    price_note: 'By application',
    badge_label: 'Invite only',
    accent_color: '#5B2440',
    cta_label: 'Request an invite',
    sort_order: 4,
    is_active: true,
  },
];

/** `cells` is in MEMBERSHIP_PLAN_KEYS order — one per column, so a row that
 * forgets a tier is visible at a glance instead of silently rendering blank. */
interface SeedBenefit {
  group: string;
  label: string;
  cells: readonly [string, string, string, string, string];
}

const N = BENEFIT_NO;
const Y = BENEFIT_YES;

const SEED_BENEFITS: readonly SeedBenefit[] = [
  // Getting a spot — the scarcity the membership actually sells.
  { group: 'Getting a spot', label: 'Early booking window', cells: [N, '12h', '24h', '48h', '48h'] },
  { group: 'Getting a spot', label: 'Spots held for members', cells: [N, N, '10%', '10% + claim', 'Guaranteed'] },
  { group: 'Getting a spot', label: 'Waitlist / spot-fill priority', cells: [N, N, Y, Y, Y] },
  { group: 'Getting a spot', label: 'Member-only pods', cells: [N, N, Y, Y, Y] },
  { group: 'Getting a spot', label: 'Private / bespoke pods', cells: [N, N, N, N, Y] },
  // Money.
  { group: 'Money', label: 'Convenience fee / booking', cells: ['₹29', '₹0', '₹0', '₹0', '₹0'] },
  { group: 'Money', label: 'Coins earned', cells: ['10%', '10%', '10%', '10%', '10%'] },
  { group: 'Money', label: 'Monthly coin drop', cells: [N, N, N, '500', '2,000'] },
  { group: 'Money', label: 'Shop delivery', cells: ['₹49', 'Free >₹499', 'Free', 'Free', 'Free'] },
  // Flexibility.
  { group: 'Flexibility', label: 'Free cancellations', cells: [N, '2 / yr', '2 / mo', 'Unlimited*', 'Unlimited*'] },
  { group: 'Flexibility', label: 'Guest passes (+1)', cells: [N, N, '2 / mo', '4 / mo', 'Always'] },
  // Standing.
  { group: 'Standing', label: 'Member badge', cells: [N, Y, Y, Y, Y] },
  { group: 'Standing', label: 'Leaderboard points', cells: ['1×', '1×', '1.25×', '1.5×', '1.5×'] },
  { group: 'Standing', label: 'Discovery boost', cells: [N, N, Y, Y, Y] },
  // Service.
  { group: 'Service', label: 'Support', cells: ['Standard', 'Standard', 'Priority', 'Concierge', 'Named RM'] },
  { group: 'Service', label: 'Partner venue perks', cells: [N, N, N, Y, Y] },
  // Host-side — the same membership, read by someone who also runs pods.
  { group: 'If you also host', label: 'Host commission relief', cells: [N, N, N, Y, Y] },
  { group: 'If you also host', label: 'Featured pod', cells: [N, N, N, '1 / mo', 'Unlimited*'] },
  { group: 'If you also host', label: 'Priority venue-slot approval', cells: [N, N, N, Y, Y] },
];

/** The seed rows in storage shape: cells positionally zipped onto plan keys. */
export const DEFAULT_MEMBERSHIP_BENEFITS = SEED_BENEFITS.map((row, index) => ({
  group: row.group,
  label: row.label,
  values: MEMBERSHIP_PLAN_KEYS.map((plan_key, column) => ({
    plan_key,
    value: row.cells[column] ?? BENEFIT_NO,
  })),
  sort_order: index,
  is_active: true,
}));

/** Footnote under the table, explaining the `*` the seed rows use. */
export const MEMBERSHIP_FOOTNOTE_MARKER = '*';
