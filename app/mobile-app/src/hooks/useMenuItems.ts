import type { ComponentProps } from 'react';
import type { MaterialIcons } from '@expo/vector-icons';

import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import type { MenuRoute } from '@/navigation/types';
import type { StudioMode } from '@/utils/studio-mode';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

export interface MenuItem {
  label: string;
  icon: IconName;
  route: MenuRoute;
}

// Home + Profile rows were removed on purpose: the logo already goes home and
// the user-summary card opens the profile — mirrors mWeb's drawer.
const SUPPORT: MenuItem = { label: 'Support', icon: 'support-agent', route: 'Support' };
const FAQS: MenuItem = { label: 'FAQs', icon: 'help-outline', route: 'Faqs' };

const studio = (yourX: MenuItem, dashboard: MenuRoute): MenuItem[] => [
  // The studio dashboard is the first stop in every role (B4-2).
  { label: 'Dashboard', icon: 'space-dashboard', route: dashboard },
  yourX,
  SUPPORT,
  { label: 'Verification', icon: 'verified-user', route: 'Verification' },
  FAQS,
];

/**
 * Account-drawer menu rows for the active studio mode — RN twin of mWeb's
 * `useMenuItems`. USER mode keeps the full app menu (+ Earn with Duncit); each
 * studio shows its own rows (the drawer adds Dark Mode / Policies / Logout).
 */
export function useMenuItems(mode: StudioMode = 'USER'): { items: MenuItem[] } {
  const showProducts = useFeatureFlag('is_product_visible');
  if (mode === 'HOST') {
    const items = studio(
      { label: 'Your Pods', icon: 'dashboard', route: 'HostManage' },
      'HostDashboard',
    );
    items.splice(2, 0, { label: 'Wallet', icon: 'account-balance-wallet', route: 'Wallet' });
    return { items };
  }
  if (mode === 'VENUE') {
    return {
      items: studio({ label: 'Your Venues', icon: 'store', route: 'VenueManage' }, 'VenueManage'),
    };
  }
  if (mode === 'ECOMM') {
    const items = studio(
      { label: 'Your Products', icon: 'inventory-2', route: 'ProductsManage' },
      'ProductsManage',
    );
    // With products gated off, hide the product-management row from the studio.
    return { items: showProducts ? items : items.filter((item) => item.label !== 'Your Products') };
  }
  return {
    items: [
      { label: 'Saved Items', icon: 'bookmark-border', route: 'Saved' },
      { label: 'Pod History', icon: 'history', route: 'PodHistory' },
      { label: 'Earn with Duncit', icon: 'volunteer-activism', route: 'Earn' },
      { label: 'Refer & Earn', icon: 'card-giftcard', route: 'Referral' },
      { label: 'Verification', icon: 'verified-user', route: 'Verification' },
      SUPPORT,
      { label: 'Pod Ideas', icon: 'lightbulb-outline', route: 'PodIdeas' },
      FAQS,
    ],
  };
}
