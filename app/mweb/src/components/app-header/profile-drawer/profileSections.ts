/**
 * Static configuration for the consumer profile drawer's card layout. Labels +
 * routes are reusable UI config (not business data); every destination is an
 * existing Duncit route. The icon is a key resolved to an MUI icon in the view,
 * so this module stays pure and unit-testable.
 */
export type ProfileIconKey =
  | 'bookings'
  | 'saved'
  | 'verification'
  | 'support'
  | 'referral'
  | 'account'
  | 'earn'
  | 'ideas'
  | 'plans'
  | 'faqs';

export interface ProfileTile {
  key: string;
  label: string;
  caption: string;
  icon: ProfileIconKey;
  to: string;
}

/** The 2×2 quick-action grid — the four primary consumer destinations. */
export const PROFILE_GRID: readonly ProfileTile[] = [
  { key: 'bookings', label: 'My Bookings', caption: 'View all bookings', icon: 'bookings', to: '/pod-history' },
  { key: 'saved', label: 'Saved Items', caption: 'Your saved pods', icon: 'saved', to: '/saved' },
  { key: 'verification', label: 'Verification', caption: 'Verify your account', icon: 'verification', to: '/verification' },
  { key: 'support', label: 'Help & Support', caption: 'Get quick help', icon: 'support', to: '/support' },
];

/** The full-width featured referral card. */
export const REFERRAL_TILE: ProfileTile = {
  key: 'referral',
  label: 'Refer & Earn',
  caption: 'Refer your friends and earn now',
  icon: 'referral',
  to: '/referral',
};

/** The "Manage Account" grouped list. `showPodPlans` gates the Pod Plans row. */
export function buildManageItems(showPodPlans: boolean): ProfileTile[] {
  const items: ProfileTile[] = [
    { key: 'account', label: 'Manage Account', caption: '', icon: 'account', to: '/account' },
    { key: 'earn', label: 'Earn with Duncit', caption: '', icon: 'earn', to: '/earn' },
    { key: 'ideas', label: 'Pod Ideas', caption: '', icon: 'ideas', to: '/pod-ideas' },
    { key: 'faqs', label: 'FAQs', caption: '', icon: 'faqs', to: '/faqs' },
  ];
  if (showPodPlans) {
    items.splice(3, 0, { key: 'plans', label: 'Pod Plans', caption: '', icon: 'plans', to: '/pod-plans' });
  }
  return items;
}
