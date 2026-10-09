import { studioNavFor, type StudioNavIcon } from '@duncit/utils';
import type { StudioMode } from '../../../studio-mode';
import type { ProfileIconKey, ProfileTile } from './profileSections';

/** The shared menu's semantic icons, drawn with this drawer's own glyphs. */
const ICON: Record<StudioNavIcon, ProfileIconKey> = {
  dashboard: 'dashboard',
  pods: 'host',
  autopods: 'autopods',
  requests: 'requests',
  change: 'change',
  nearby: 'nearby',
  wallet: 'wallet',
  venue: 'venue',
  availability: 'availability',
  settings: 'settings',
  earnings: 'insights',
  calendar: 'calendar',
  monitoring: 'monitoring',
  ecomm: 'ecomm',
};

/** One drawer section of the studio menu. */
export interface StudioMenuSection {
  key: string;
  title: string;
  items: ProfileTile[];
}

/**
 * The switched-in studio's menu as drawer sections — Dashboard, Pods (or
 * Clubs), Venues, Requests, Withdrawal — from the ONE definition the native
 * app renders too (@duncit/utils studio-nav). Empty in User mode, or when the
 * studio's role is gone.
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
      to: item.path,
    })),
  }));
}
