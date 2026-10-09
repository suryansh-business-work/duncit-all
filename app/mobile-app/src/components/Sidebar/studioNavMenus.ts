import type { ComponentProps } from 'react';
import type { MaterialIcons } from '@expo/vector-icons';
import { studioNavFor, type StudioNavIcon } from '@duncit/utils';

import type { MenuRoute } from '@/navigation/types';
import type { StudioMode } from '@/utils/studio-mode';
import type { ProfileTile } from './profileSections';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

/** The shared menu's semantic icons, drawn with this sidebar's own glyphs. */
const ICON: Record<StudioNavIcon, IconName> = {
  dashboard: 'space-dashboard',
  pods: 'event',
  autopods: 'auto-awesome',
  requests: 'move-to-inbox',
  change: 'swap-horiz',
  nearby: 'travel-explore',
  wallet: 'account-balance-wallet',
  venue: 'store',
  availability: 'event-repeat',
  settings: 'settings',
  earnings: 'insights',
  calendar: 'event-available',
  monitoring: 'monitor-heart',
  ecomm: 'inventory-2',
};

/** One sidebar section of the studio menu. */
export interface StudioMenuSection {
  key: string;
  title: string;
  items: ProfileTile[];
}

/**
 * The switched-in studio's menu as sidebar sections — Dashboard, Pods (or
 * Clubs), Venues, Requests, Withdrawal — from the ONE definition mWeb renders
 * too (@duncit/utils studio-nav). Empty in User mode, or when the studio's
 * role is gone. RN twin of mWeb's profile-drawer/studioNavMenus.
 */
export function studioMenuSections(
  mode: StudioMode,
  roles: readonly string[],
  autoPods: boolean,
  t: (key: string) => string,
): StudioMenuSection[] {
  return studioNavFor(mode, roles, { autoPods }).map((group) => ({
    key: group.key,
    title: t(group.labelKey),
    items: group.items.map((item) => ({
      key: item.key,
      label: t(item.labelKey),
      caption: '',
      icon: ICON[item.icon],
      // The shared module is framework-free, so its route is a plain string;
      // studioNavMenus.test pins every one to a registered screen.
      route: item.route as MenuRoute,
    })),
  }));
}
