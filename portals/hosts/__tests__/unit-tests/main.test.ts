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
  HostDetailsPage: () => null,
  HostEditorPage: () => null,
  HostsPage: () => null,
}));

vi.mock('@duncit/entity-consoles', () => ({
  mountDirectoryPortal: (options: unknown) => {
    captured.options = options;
  },
  HostDetailsPage: stubs.HostDetailsPage,
  HostEditorPage: stubs.HostEditorPage,
  HostsPage: stubs.HostsPage,
  HOSTS_SPEC: { key: 'hosts-spec' },
}));
vi.mock('@duncit/logs', () => ({ logs: { portal: { hosts: 'hosts-logs' } } }));
vi.mock('@duncit/shell', () => ({ EventRequestsPage: stubs.EventRequestsPage }));
vi.mock('../../src/config/app-config', () => ({ appConfig: { key: 'hosts' } }));

interface NavEntry {
  label: string;
  labelKey: string;
  to: string;
  icon: string;
}
interface MountOptions {
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

describe('Hosts console mount', () => {
  it('lists Hosts first, then Event Requests, each with a localization key', () => {
    expect(options.console.nav).toEqual([
      { label: 'Hosts', labelKey: 'shell.nav.hosts', to: '/hosts', icon: 'people' },
      { label: 'Event Requests', labelKey: 'shell.nav.eventRequests', to: '/event-requests', icon: 'calendar' },
    ]);
  });

  it('gives every sidebar entry a route', () => {
    const paths = routesOf(options).map(([path]) => path);
    for (const entry of options.console.nav) expect(paths).toContain(entry.to);
  });

  it('opens Event Requests as the shared page, scoped to hosts across the console', () => {
    const route = routesOf(options).find(([path]) => path === '/event-requests');
    const page = route?.[1].guarded;

    expect(page?.type).toBe(stubs.EventRequestsPage);
    // "console" is every host's requests; "owner" is the partner's own only.
    expect(page?.props).toEqual({ targetType: 'HOST', scope: 'console' });
  });

  it('keeps every route behind the sign-in gate', () => {
    const routes = routesOf(options);
    expect(routes.map(([path]) => path)).toEqual([
      '/hosts/new',
      '/hosts',
      '/event-requests',
      '/hosts/:hostId',
      '/hosts/:hostId/edit',
    ]);
    for (const [, element] of routes) expect(element).toHaveProperty('guarded');
  });
});
