import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, useLocation } from 'react-router';
import type { ReactNode } from 'react';
import { mountDirectoryPortal } from '../mountDirectoryPortal';
import type { DirectorySpec } from '../types';

const calls = vi.hoisted(() => ({
  runtimeArgs: null as unknown[] | null,
  authedOptions: null as { getToken: unknown; wrap: (el: ReactNode) => ReactNode } | null,
  mountArgs: null as Record<string, unknown> | null,
}));

vi.mock('@duncit/shell', () => ({
  createPortalRuntime: (...args: unknown[]) => {
    calls.runtimeArgs = args;
    return {
      AppShell: ({ children }: { children: ReactNode }) => <div data-testid="shell">{children}</div>,
      LoginPage: () => <div data-testid="login" />,
      session: { getToken: 'token-getter' },
      apolloClient: 'apollo-client',
    };
  },
  createAuthed: (options: NonNullable<typeof calls.authedOptions>) => {
    calls.authedOptions = options;
    return (element: ReactNode) => options.wrap(element);
  },
  mountPortal: (args: Record<string, unknown>) => {
    calls.mountArgs = args;
  },
  ProfilePage: () => <div data-testid="profile" />,
}));
vi.mock('@duncit/user-context', () => ({
  createSessionUserLoader: (client: unknown) => `loader(${String(client)})`,
}));
vi.mock('@duncit/app-settings', () => ({
  DIRECTORY_BUNDLE: { directory: { title: 'T' } },
  flattenCatalogue: (bundle: unknown) => ({ flattened: bundle }),
}));
vi.mock('../EntityDashboard', () => ({
  default: ({ spec, listPath }: { spec: { entity: string }; listPath?: string }) => (
    <div data-testid="dashboard">{`${spec.entity}|${listPath ?? 'none'}`}</div>
  ),
}));

const spec = { entity: 'venues' } as unknown as DirectorySpec;
const appConfig = { nav: [{ label: 'Dashboard', to: '/' }] } as never;

const base = {
  appConfig,
  spec,
  devPort: 5123,
  subdomain: 'venues',
  logsPortal: 'venues' as never,
};

/** Renders what was handed to `mountPortal` as `children`, at `path`. */
function renderApp(path: string) {
  function Where() {
    return <span data-testid="where">{useLocation().pathname}</span>;
  }
  return render(
    <MemoryRouter initialEntries={[path]}>
      {calls.mountArgs?.children as ReactNode}
      <Where />
    </MemoryRouter>,
  );
}

describe('mountDirectoryPortal', () => {
  beforeEach(() => {
    calls.runtimeArgs = null;
    calls.authedOptions = null;
    calls.mountArgs = null;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('boots the portal runtime against the local server and dev port while developing', () => {
    mountDirectoryPortal(base);
    expect(calls.runtimeArgs).toEqual([appConfig, 'http://localhost:2001/graphql']);
    expect(calls.mountArgs).toMatchObject({
      graphqlUrl: 'http://localhost:2001/graphql',
      apolloClient: 'apollo-client',
      logsPortal: 'venues',
      loadUser: 'loader(apollo-client)',
      i18nFallback: { flattened: { directory: { title: 'T' } } },
    });
  });

  it('points at the production server when built, whichever port it was developed on', () => {
    vi.stubEnv('DEV', false);
    mountDirectoryPortal(base);
    expect(calls.runtimeArgs?.[1]).toBe('https://server.duncit.com/graphql');
  });

  it('lets VITE_GRAPHQL_URL override both environments (the e2e build)', () => {
    vi.stubEnv('VITE_GRAPHQL_URL', '/graphql');
    mountDirectoryPortal(base);
    expect(calls.runtimeArgs?.[1]).toBe('/graphql');
  });

  it('appends the console\'s nav after the shell\'s own entries', () => {
    const nav = [{ label: 'Venues', to: '/venues' }] as never;
    mountDirectoryPortal({ ...base, console: { routes: () => null, nav } });
    const config = calls.runtimeArgs?.[0] as { nav: unknown[] };
    expect(config.nav).toEqual([...(appConfig as { nav: unknown[] }).nav, ...(nav as unknown[])]);
  });

  it('leaves the config untouched when the console adds no nav', () => {
    mountDirectoryPortal({ ...base, console: { routes: () => null, nav: [] } });
    expect(calls.runtimeArgs?.[0]).toBe(appConfig);
  });

  it('serves the dashboard at / inside the guard and shell, linking tiles to the list', () => {
    mountDirectoryPortal({ ...base, console: { routes: () => null, listPath: '/venues' } });
    renderApp('/');
    expect(screen.getByTestId('shell')).toContainElement(screen.getByTestId('dashboard'));
    expect(screen.getByTestId('dashboard')).toHaveTextContent('venues|/venues');
    expect(calls.authedOptions?.getToken).toBe('token-getter');
  });

  it('shows plain tiles when the console ships no list yet', () => {
    mountDirectoryPortal(base);
    renderApp('/');
    expect(screen.getByTestId('dashboard')).toHaveTextContent('venues|none');
  });

  it('mounts the console\'s routes through the same auth guard', () => {
    mountDirectoryPortal({
      ...base,
      console: {
        routes: (authed) => <Route path="/venues" element={authed(<div data-testid="list" />)} />,
      },
    });
    renderApp('/venues');
    expect(screen.getByTestId('shell')).toContainElement(screen.getByTestId('list'));
  });

  it('serves login unguarded and the profile page guarded', () => {
    mountDirectoryPortal(base);
    const { unmount } = renderApp('/login');
    expect(screen.getByTestId('login')).toBeInTheDocument();
    expect(screen.queryByTestId('shell')).not.toBeInTheDocument();
    unmount();

    renderApp('/profile');
    expect(screen.getByTestId('shell')).toContainElement(screen.getByTestId('profile'));
  });

  it('sends an unknown path back to the dashboard', () => {
    mountDirectoryPortal(base);
    renderApp('/nowhere/at/all');
    expect(screen.getByTestId('where')).toHaveTextContent('/');
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });
});
