import type { ComponentProps } from 'react';
import type { MaterialIcons } from '@expo/vector-icons';
import {
  studioMenuSections as sharedSections,
  type StudioMenuSection,
  type StudioNavIcon,
} from '@duncit/utils';

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

/**
 * The switched-in studio's menu as sidebar sections, from the ONE definition
 * mWeb renders too (@duncit/utils studio-nav). This app only says what a row
 * is here: a route and a vector icon.
 */
export function studioMenuSections(
  mode: StudioMode,
  roles: readonly string[],
  autoPods: boolean,
  t: (key: string) => string,
): StudioMenuSection<ProfileTile>[] {
  return sharedSections<ProfileTile>(mode, roles, {
    autoPods,
    t,
    // The shared module is framework-free, so its route is a plain string;
    // studioNavMenus.test pins every one to a deep-linked screen.
    row: (item, label) => ({
      key: item.key,
      label,
      caption: '',
      icon: ICON[item.icon],
      route: item.route as MenuRoute,
    }),
  });
}
