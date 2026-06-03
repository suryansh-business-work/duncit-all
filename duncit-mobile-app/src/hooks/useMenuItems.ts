import type { ComponentProps } from 'react';
import type { MaterialIcons } from '@expo/vector-icons';

import type { MenuRoute } from '@/navigation/types';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

export interface MenuItem {
  label: string;
  icon: IconName;
  route: MenuRoute;
}

/**
 * Account-drawer menu config — the RN twin of mWeb's `useMenuItems`. Same
 * labels and role-conditional host/venue rows; icons map to MaterialIcons.
 * Routes are React Navigation screen names.
 */
export function useMenuItems(roles: string[]) {
  const isHost = roles.includes('HOST');
  const isVenue = roles.includes('VENUE_OWNER');

  const baseItems: MenuItem[] = [
    { label: 'Home', icon: 'home', route: 'Home' },
    { label: 'Profile', icon: 'person-outline', route: 'Profile' },
    { label: 'Saved Items', icon: 'bookmark-border', route: 'Saved' },
    { label: 'Pod History', icon: 'history', route: 'PodHistory' },
  ];

  const hostItem: MenuItem = isHost
    ? { label: 'Hosts Management', icon: 'dashboard', route: 'HostManage' }
    : { label: 'Be a host', icon: 'storefront', route: 'BecomeHost' };

  const venueItem: MenuItem = isVenue
    ? { label: 'Venue Management', icon: 'store', route: 'VenueManage' }
    : { label: 'Be a Venue Owner', icon: 'add-business', route: 'RegisterVenue' };

  const supportItems: MenuItem[] = [
    { label: 'Pod Plans', icon: 'category', route: 'PodPlans' },
    { label: 'Support', icon: 'support-agent', route: 'Support' },
    { label: 'Pod Ideas', icon: 'lightbulb-outline', route: 'PodIdeas' },
    { label: 'FAQs', icon: 'help-outline', route: 'Faqs' },
  ];

  return { baseItems, hostItem, venueItem, supportItems };
}
