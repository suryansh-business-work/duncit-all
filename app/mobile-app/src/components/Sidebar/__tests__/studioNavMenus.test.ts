import { STUDIO_NAV } from '@duncit/utils';

import { linking } from '@/navigation/linking';
import { studioMenuSections } from '../studioNavMenus';

jest.mock('expo-linking', () => ({ createURL: (path: string) => `duncit://${path}` }));

/** Echo translator: a row's label is its key, so the test pins the keys. */
const t = (key: string) => `t:${key}`;
const EVERY_ROLE = ['HOST', 'VENUE_OWNER', 'ECOMM_MANAGER', 'CLUB_ADMIN'];

/** Every screen name the deep-link config knows, at any depth. */
function linkedScreens(node: unknown): string[] {
  if (!node || typeof node !== 'object') return [];
  return Object.entries(node).flatMap(([name, value]) => [
    name,
    ...(value && typeof value === 'object' && 'screens' in value
      ? linkedScreens(value.screens)
      : []),
  ]);
}

describe('studioMenuSections', () => {
  it('is empty in User mode and once the studio role is revoked', () => {
    expect(studioMenuSections('USER', EVERY_ROLE, true, t)).toEqual([]);
    expect(studioMenuSections('CLUB', ['HOST'], true, t)).toEqual([]);
  });

  it('draws the Venue studio as Dashboard, Venues, Pods, Requests, Withdrawal', () => {
    const sections = studioMenuSections('VENUE', ['VENUE_OWNER'], true, t);
    expect(sections.map((section) => section.title)).toEqual([
      't:mweb.studioNav.dashboardGroup',
      't:mweb.studioNav.venuesGroup',
      't:mweb.studioNav.podsGroup',
      't:mweb.studioNav.requestsGroup',
      't:mweb.studioNav.withdrawalGroup',
    ]);
    expect(sections.flatMap((section) => section.items.map((item) => item.route))).toEqual([
      'VenueManage',
      'VenueAvailability',
      'VenueSettings',
      'VenueEarnings',
      'VenueSlotRequests',
      'VenueAutoPods',
      'VenuePodRequests',
      'ChangeRequests',
      'NearbyHosts',
      'Wallet',
    ]);
  });

  it('gives each row a native icon, a translated label and no caption', () => {
    const [dashboard] = studioMenuSections('HOST', ['HOST'], false, t);
    expect(dashboard?.items).toEqual([
      {
        key: 'host-dashboard',
        label: 't:mweb.studioNav.dashboard',
        caption: '',
        icon: 'space-dashboard',
        route: 'HostDashboard',
      },
    ]);
  });

  it('drops the Auto Pods rows while the flag is off', () => {
    const routes = studioMenuSections('CLUB', ['CLUB_ADMIN'], false, t).flatMap((section) =>
      section.items.map((item) => item.route),
    );
    expect(routes).toEqual([
      'ClubAdminDashboard',
      'ClubManage',
      'ClubPodMonitoring',
      'ChangeRequests',
      'Wallet',
    ]);
  });

  it('only points at screens the app registers a deep link for', () => {
    const known = new Set(linkedScreens(linking.config?.screens));
    const routes = Object.values(STUDIO_NAV).flatMap((groups) =>
      groups.flatMap((group) => group.items.map((item) => item.route)),
    );
    expect(routes.filter((route) => !known.has(route))).toEqual([]);
  });
});
