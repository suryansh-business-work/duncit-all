import { STUDIO_OPTION_LIST, STUDIO_OPTIONS_ENTRY } from '@duncit/utils';
import { partnerPortalUrl } from '@duncit/onboarding';

import { linking } from '@/navigation/linking';
import { studioOptionTarget } from '../studioOptionTarget';

jest.mock('expo-linking', () => ({ createURL: (path: string) => `duncit://${path}` }));

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

const EVERY_OPTION = Object.values(STUDIO_OPTION_LIST).flat();

describe('studioOptionTarget', () => {
  it('opens an option with a native route on that screen', () => {
    const dashboard = STUDIO_OPTION_LIST.VENUE.find((item) => item.key === 'dashboard');
    expect(dashboard && studioOptionTarget(dashboard)).toEqual({
      kind: 'route',
      route: 'VenueManage',
    });
  });

  it('opens an option the app has no screen for in the Partner console', () => {
    const brands = STUDIO_OPTION_LIST.ECOMM.find((item) => item.key === 'brands');
    expect(brands && studioOptionTarget(brands)).toEqual({
      kind: 'portal',
      url: partnerPortalUrl('/ecomm-brand'),
    });
  });

  it('only points at screens the app registers a deep link for', () => {
    const known = new Set(linkedScreens(linking.config?.screens));
    const routes = [
      ...Object.values(STUDIO_OPTIONS_ENTRY).map((entry) => entry.route),
      ...EVERY_OPTION.flatMap((item) => (item.route ? [item.route] : [])),
    ];
    expect(routes.length).toBeGreaterThan(0);
    expect(routes.filter((route) => !known.has(route))).toEqual([]);
  });

  it('deep-links the Options pages and the venue pages on mWeb’s paths', () => {
    const screens = linking.config?.screens ?? {};
    expect(screens).toMatchObject({
      VenueOptions: 'venues/options',
      HostOptions: 'host/options',
      ClubOptions: 'clubs/options',
      BrandOptions: 'products/options',
      VenueList: 'venues/list',
      VenuePublish: 'venues/publish',
      HostPublish: 'host/publish',
      VenuePods: 'venues/pods',
    });
  });
});
