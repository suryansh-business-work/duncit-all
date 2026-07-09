import type { ComponentProps } from 'react';
import type { MaterialIcons } from '@expo/vector-icons';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

/**
 * Contextual notification categories. The server stores no notification "type",
 * so the category is derived from the title — this lets the list show a relevant
 * icon per row instead of repeating the generic bell. Mirrors mWeb's
 * `notificationIcon` util 1:1 so both apps classify identically.
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

/** MaterialIcons glyph per category (native app + native web). */
const ICON_BY_CATEGORY: Record<NotificationCategory, MaterialIconName> = {
  review: 'star',
  meeting: 'event',
  approval: 'check-circle',
  request: 'markunread-mailbox',
  achievement: 'celebration',
  support: 'chat',
  payment: 'payment',
  club: 'account-balance',
  pod: 'mic',
  account: 'person',
  general: 'notifications-active',
};

/** Contextual MaterialIcons glyph name for a notification's title. */
export function notificationIconName(title: string | null | undefined): MaterialIconName {
  return ICON_BY_CATEGORY[notificationCategory(title)];
}
