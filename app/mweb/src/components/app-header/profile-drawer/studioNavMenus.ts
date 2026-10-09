import { studioMenuSections as sharedSections, type StudioMenuSection, type StudioNavIcon } from '@duncit/utils';
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

/**
 * The switched-in studio's menu as drawer sections, from the ONE definition
 * the native app renders too (@duncit/utils studio-nav). This app only says
 * what a row is here: a path and a drawer icon.
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
    row: (item, label) => ({ key: item.key, label, caption: '', icon: ICON[item.icon], to: item.path }),
  });
}
