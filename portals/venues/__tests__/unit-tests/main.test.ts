import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * The console's own slice of the directory portal: its sidebar and its routes.
 *
 * The portal frame (chrome, login, logs) is @duncit/entity-consoles' subject;
 * what this console owns is the options it hands mountDirectoryPortal, so the
 * mount is captured rather than run.
 */
const captured = vi.hoisted(() => ({ options: null as unknown }));
const stubs = vi.hoisted(() => ({
  EventRequestsPage: () => null,
  VenueEditorPage: () => null,
  VenuesPage: () => null,
  VenueRecordPage: () => null,
  VenueKitPage: () => null,
}));

vi.mock('@duncit/entity-consoles', () => ({
  mountDirectoryPortal: (options: unknown) => {
    captured.options = options;
  },
  VenueEditorPage: stubs.VenueEditorPage,
  VenuesPage: stubs.VenuesPage,
  VENUES_SPEC: { key: 'venues-spec' },
}));
vi.mock('@duncit/logs', () => ({ logs: { portal: { venues: 'venues-logs' } } }));
vi.mock('@duncit/shell', () => ({ EventRequestsPage: stubs.EventRequestsPage }));
vi.mock('../../src/config/app-config', () => ({ appConfig: { key: 'venues' } }));
vi.mock('../../src/VenueRecordPage', () => ({ default: stubs.VenueRecordPage }));
vi.mock('../../src/pages/venue-kit', () => ({ default: stubs.VenueKitPage }));
vi.mock('@duncit/app-settings', () => ({ VENUE_KIT_BUNDLE: { venueKit: { name: 'Duncit Venue Kit' } } }));

interface NavEntry {
  label: string;
  labelKey: string;
  to: string;
  icon: string;
}
interface MountOptions {
  i18nFallback: unknown;
  console: {
    listPath: string;
    nav: NavEntry[];
    routes: (authed: (element: ReactNode) => ReactNode) => ReactElement<{ children: ReactNode }>;
  };
}

/** The console's routes as [path, element], with `authed` marking what it guarded. */
const routesOf = (options: MountOptions) => {
  const authed = (element: ReactNode) => ({ guarded: element });
  const fragment = options.console.routes(authed);
  return (fragment.props.children as ReactElement<{ path: string; element: { guarded: ReactElement } }>[])
    .filter(isValidElement)
    .map((route) => [route.props.path, route.props.element] as const);
};

let options: MountOptions;

beforeAll(async () => {
  await import('../../src/main');
  options = captured.options as MountOptions;
});

describe('Venues console mount', () => {
  it('lists Venues, Event Requests, then Venue Kit, each with a localization key', () => {
    expect(options.console.nav).toEqual([
      { label: 'Venues', labelKey: 'shell.nav.venues', to: '/venues', icon: 'storefront' },
      { label: 'Event Requests', labelKey: 'shell.nav.eventRequests', to: '/event-requests', icon: 'calendar' },
      { label: 'Venue Kit', labelKey: 'shell.nav.venueKit', to: '/venue-kit', icon: 'inventory' },
    ]);
  });

  it('gives every sidebar entry a route', () => {
    const paths = routesOf(options).map(([path]) => path);
    for (const entry of options.console.nav) expect(paths).toContain(entry.to);
  });

  it('opens Event Requests as the shared page, scoped to venues across the console', () => {
    const route = routesOf(options).find(([path]) => path === '/event-requests');
    const page = route?.[1].guarded;

    expect(page?.type).toBe(stubs.EventRequestsPage);
    // "console" is every venue's requests; "owner" is the partner's own only.
    expect(page?.props).toEqual({ targetType: 'VENUE', scope: 'console' });
  });

  it('opens Venue Kit as its own page and ships its venueKit copy as local fallback', () => {
    const route = routesOf(options).find(([path]) => path === '/venue-kit');
    expect(route?.[1].guarded.type).toBe(stubs.VenueKitPage);
    expect(options.i18nFallback).toEqual({ venueKit: { name: 'Duncit Venue Kit' } });
  });

  it('keeps every route behind the sign-in gate', () => {
    const routes = routesOf(options);
    expect(routes.map(([path]) => path)).toEqual([
      '/venues/new',
      '/venues',
      '/venue-kit',
      '/event-requests',
      '/venues/:venueId',
      '/venues/:venueId/edit',
    ]);
    for (const [, element] of routes) expect(element).toHaveProperty('guarded');
  });
});
