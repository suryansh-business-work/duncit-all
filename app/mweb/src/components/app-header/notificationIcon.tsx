import type { SvgIconComponent } from '@mui/icons-material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CelebrationIcon from '@mui/icons-material/Celebration';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ChatIcon from '@mui/icons-material/Chat';
import EventIcon from '@mui/icons-material/Event';
import MarkunreadMailboxIcon from '@mui/icons-material/MarkunreadMailbox';
import MicIcon from '@mui/icons-material/Mic';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PaymentIcon from '@mui/icons-material/Payment';
import PersonIcon from '@mui/icons-material/Person';
import StarIcon from '@mui/icons-material/Star';

/**
 * Contextual notification categories. The server stores no notification "type",
 * so the category is derived from the title — this lets the list show a relevant
 * icon per row instead of repeating the generic bell. Mirrors the mobile app's
 * `notification-icon` util 1:1 so both platforms classify identically.
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

/** MUI icon component per category. */
const ICON_BY_CATEGORY: Record<NotificationCategory, SvgIconComponent> = {
  review: StarIcon,
  meeting: EventIcon,
  approval: CheckCircleIcon,
  request: MarkunreadMailboxIcon,
  achievement: CelebrationIcon,
  support: ChatIcon,
  payment: PaymentIcon,
  club: AccountBalanceIcon,
  pod: MicIcon,
  account: PersonIcon,
  general: NotificationsActiveIcon,
};

/** Contextual MUI icon component for a notification's title. */
export function notificationIcon(title: string | null | undefined): SvgIconComponent {
  return ICON_BY_CATEGORY[notificationCategory(title)];
}
