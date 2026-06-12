import type { ComponentProps } from 'react';
import type { MaterialIcons } from '@expo/vector-icons';

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

const studio = (yourX: MenuItem, verify: MenuRoute): MenuItem[] => [
  yourX,
  SUPPORT,
  { label: 'Verification', icon: 'verified-user', route: verify },
  FAQS,
];

/**
 * Account-drawer menu rows for the active studio mode — RN twin of mWeb's
 * `useMenuItems`. USER mode keeps the full app menu (+ Earn with Duncit); each
 * studio shows its own rows (the drawer adds Dark Mode / Policies / Logout).
 */
export function useMenuItems(mode: StudioMode = 'USER'): { items: MenuItem[] } {
  if (mode === 'HOST') {
    return {
      items: studio({ label: 'Your Pods', icon: 'dashboard', route: 'HostManage' }, 'BecomeHost'),
    };
  }
  if (mode === 'VENUE') {
    return {
      items: studio({ label: 'Your Venues', icon: 'store', route: 'VenueManage' }, 'RegisterVenue'),
    };
  }
  if (mode === 'ECOMM') {
    return {
      items: studio(
        { label: 'Your Products', icon: 'inventory-2', route: 'ProductsManage' },
        'ListProduct',
      ),
    };
  }
  return {
    items: [
      { label: 'Saved Items', icon: 'bookmark-border', route: 'Saved' },
      { label: 'Pod History', icon: 'history', route: 'PodHistory' },
      { label: 'Earn with Duncit', icon: 'volunteer-activism', route: 'Earn' },
      SUPPORT,
      { label: 'Pod Ideas', icon: 'lightbulb-outline', route: 'PodIdeas' },
      FAQS,
    ],
  };
}
