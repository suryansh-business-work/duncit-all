import type { ComponentProps } from 'react';
import type { MaterialIcons } from '@expo/vector-icons';

import type { MenuRoute } from '@/navigation/types';

/**
 * Static configuration for the consumer profile drawer's card layout — the RN
 * twin of mWeb's `profileSections.ts`. Labels + routes are reusable UI config
 * (not business data); every destination is an existing screen. The `icon` is a
 * MaterialIcons name (a plain string), so this module stays pure/unit-testable —
 * RN icons take a name, so the mWeb key→element indirection isn't needed here.
 */
type IconName = ComponentProps<typeof MaterialIcons>['name'];

export interface ProfileTile {
  key: string;
  label: string;
  caption: string;
  icon: IconName;
  route: MenuRoute;
}

/** The 2×2 quick-action grid — the four primary consumer destinations. */
export const PROFILE_GRID: readonly ProfileTile[] = [
  {
    key: 'pod-history',
    label: 'Pod History',
    caption: 'Your bookings & history',
    icon: 'receipt-long',
    route: 'PodHistory',
  },
  {
    key: 'support',
    label: 'Help & Support',
    caption: 'Get quick help',
    icon: 'support-agent',
    route: 'Support',
  },
  {
    key: 'earn',
    label: 'Earn with Duncit',
    caption: 'Host, list or sell',
    icon: 'volunteer-activism',
    route: 'Earn',
  },
  {
    key: 'ideas',
    label: 'Pod Ideas',
    caption: 'Get inspired',
    icon: 'lightbulb',
    route: 'PodIdeas',
  },
];

/** The full-width featured referral card. */
export const REFERRAL_TILE: ProfileTile = {
  key: 'referral',
  label: 'Refer & Earn',
  caption: 'Refer your friends and earn now',
  icon: 'card-giftcard',
  route: 'Referral',
};

/** The "Manage Account" grouped list — the destinations not in the grid.
 * `showPodPlans` gates the Pod Plans row. */
export function buildManageItems(showPodPlans: boolean): ProfileTile[] {
  const items: ProfileTile[] = [
    {
      key: 'account',
      label: 'Manage Account',
      caption: '',
      icon: 'manage-accounts',
      route: 'Account',
    },
    { key: 'shop', label: 'Pod Shop', caption: '', icon: 'storefront', route: 'Shop' },
    {
      key: 'orders',
      label: 'My Product Order History',
      caption: '',
      icon: 'local-shipping',
      route: 'OrdersHistory',
    },
    { key: 'saved', label: 'Saved Items', caption: '', icon: 'bookmark-border', route: 'Saved' },
    {
      key: 'verification',
      label: 'Verification',
      caption: '',
      icon: 'verified-user',
      route: 'Verification',
    },
    { key: 'faqs', label: 'FAQs', caption: '', icon: 'help-outline', route: 'Faqs' },
  ];
  if (showPodPlans) {
    // Pod Plans always slots in just before FAQs (the last row).
    items.splice(items.length - 1, 0, {
      key: 'plans',
      label: 'Pod Plans',
      caption: '',
      icon: 'category',
      route: 'PodPlans',
    });
  }
  return items;
}
