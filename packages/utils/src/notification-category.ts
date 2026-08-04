/**
 * Notification classification — the framework-free half of the notifications
 * list, shared by mWeb and the native app (rule 27/40).
 *
 * The server stores no notification "type", so a category is derived from the
 * title. Both surfaces used to carry a byte-identical copy of these rules, each
 * with a header comment naming the other as its twin; the chip filter needed a
 * third copy, so the derivation lives here and each app keeps only its own icon
 * map (MUI vs MaterialIcons — that part is UI, and stays split).
 */

export type NotificationCategory =
  | 'review'
  | 'meeting'
  | 'approval'
  | 'request'
  | 'achievement'
  | 'support'
  | 'payment'
  | 'club'
  | 'pod'
  | 'account'
  | 'general';

/**
 * Ordered title-keyword rules — the first category whose token appears in the
 * lowercased title wins; a title matching nothing falls back to "general". The
 * tokens are drawn from the server's notification titles (payment, meeting,
 * approval, request, achievement, support, club, pod, account producers).
 */
const CATEGORY_RULES: readonly (readonly [NotificationCategory, readonly string[]])[] = [
  ['payment', ['payment', 'paid', 'refund', 'payout', 'withdraw', 'invoice', 'wallet', '₹']],
  ['review', ['feedback', 'review', 'rating', '★', 'testimonial']],
  ['meeting', ['meeting', 'reschedul']],
  [
    'approval',
    ['approved', 'approval', 'confirmed', 'accepted', 'declined', 'verified', 'granted'],
  ],
  ['request', ['request', 'submitted', 'received', 'applied', 'application']],
  [
    'achievement',
    ['congrat', 'achievement', 'unlock', 'milestone', 'badge', 'reward', '🎉', 'welcome'],
  ],
  ['support', ['support', 'ticket', 'sos', 'chat', 'message', 'reply', 'callback']],
  ['club', ['club', 'community']],
  ['pod', ['pod', 'slot', 'session', 'event']],
  ['account', ['follower', 'follow', 'profile', 'account', 'password', 'login', 'security']],
];

/** Classify a notification by its title into a contextual category. */
export function notificationCategory(title: string | null | undefined): NotificationCategory {
  const hay = (title ?? '').toLowerCase();
  for (const [category, tokens] of CATEGORY_RULES) {
    if (tokens.some((token) => hay.includes(token))) return category;
  }
  return 'general';
}

/** Chip order — the rule order, with the catch-all last. One source of truth. */
export const NOTIFICATION_CATEGORY_ORDER: readonly NotificationCategory[] = [
  ...CATEGORY_RULES.map(([category]) => category),
  'general',
];

/** Chip copy per category. */
export const NOTIFICATION_CATEGORY_LABEL: Record<NotificationCategory, string> = {
  payment: 'Payments',
  review: 'Reviews',
  meeting: 'Meetings',
  approval: 'Approvals',
  request: 'Requests',
  achievement: 'Achievements',
  support: 'Support',
  club: 'Clubs',
  pod: 'Pods',
  account: 'Account',
  general: 'Other',
};

/** 'all' plus the real categories — the filter key a chip carries. */
export type NotificationFilterKey = 'all' | NotificationCategory;

export interface NotificationChip {
  key: NotificationFilterKey;
  label: string;
  count: number;
}

/**
 * The chips to render for a list of notification titles: "All" first, then only
 * the categories actually present, each with its count. Rendering all eleven
 * would leave most of them permanently empty.
 */
export function notificationChips(titles: readonly (string | null | undefined)[]): NotificationChip[] {
  const counts = new Map<NotificationCategory, number>();
  for (const title of titles) {
    const category = notificationCategory(title);
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  const chips: NotificationChip[] = [{ key: 'all', label: 'All', count: titles.length }];
  for (const category of NOTIFICATION_CATEGORY_ORDER) {
    const count = counts.get(category) ?? 0;
    if (count > 0) chips.push({ key: category, label: NOTIFICATION_CATEGORY_LABEL[category], count });
  }
  return chips;
}

/** Does a notification with this title belong under the selected chip? */
export function matchesNotificationFilter(
  title: string | null | undefined,
  key: NotificationFilterKey
): boolean {
  return key === 'all' || notificationCategory(title) === key;
}
