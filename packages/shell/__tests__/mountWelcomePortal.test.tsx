import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactElement, ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

/**
 * The helper wires shared pieces into one route table, so the test asserts the
 * WIRING: the runtime and `mountPortal` receive this console's own config and
 * address, and each route renders the right page inside (or outside) the
 * chrome. What those pieces do once wired is their own tests' business.
 */
const mocks = vi.hoisted(() => ({
  mountOptions: null as Record<string, unknown> | null,
  runtimeArgs: null as unknown[] | null,
  token: 'analytics-token' as string | null,
  dashboardProps: null as Record<string, unknown> | null,
  loaderClient: null as unknown,
}));

vi.mock('../src/mountPortal', () => ({
  mountPortal: (opts: Record<string, unknown>) => {
    mocks.mountOptions = opts;
  },
}));

vi.mock('../src/lib/portal-runtime', () => ({
  createPortalRuntime: (...args: unknown[]) => {
    mocks.runtimeArgs = args;
    return {
      apolloClient: { __client: 'analytics' },
      session: { getToken: () => mocks.token },
      AppShell: ({ children }: { children: ReactNode }) => <div data-testid="chrome">{children}</div>,
      LoginPage: () => <div data-testid="login" />,
    };
  },
}));

vi.mock('../src/dashboard/WelcomeDashboard', () => ({
  WelcomeDashboard: (props: Record<string, unknown>) => {
    mocks.dashboardProps = props;
    return <div data-testid="welcome" />;
  },
}));

vi.mock('../src/chrome/ProfilePage', () => ({
  ProfilePage: () => <div data-testid="profile" />,
}));

vi.mock('../src/i18n/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => `translated ${key}` }),
}));

vi.mock('@duncit/user-context', () => ({
  createSessionUserLoader: (client: unknown) => {
    mocks.loaderClient = client;
    return 'session-loader';
  },
}));

import { mountWelcomePortal, resolvePortalGraphqlUrl } from '../src/mountWelcomePortal';
import type { AppConfig, MountPortalOptions } from '../src/types';

const config: AppConfig = {
  key: 'analytics',
  name: 'Analytics',
  fullName: 'Duncit Analytics',
  tagline: 'Every number Duncit runs on.',
  taglineKey: 'shell.portal.analytics.tagline',
  promoTitle: 'Every number, one place',
  promoText: 'Bookings, revenue and growth across Duncit.',
  portalLabel: 'Analytics Portal',
  loginImage: 'https://images.pexels.com/photos/590022/pexels-photo-590022.jpeg',
  requiredRoles: ['ANALYTICS_MANAGER'],
  tokenKey: 'analytics_token',
  colorModeKey: 'analytics_color_mode',
  nav: [{ label: 'Dashboard', to: '/', icon: 'dashboard' }],
  modules: [],
};

const logsPortal = { info: vi.fn() } as unknown as MountPortalOptions['logsPortal'];

function mount(appConfig: AppConfig = config) {
  mountWelcomePortal({
    appConfig,
    env: { DEV: false, VITE_GRAPHQL_URL: 'https://staging.server.duncit.com/graphql' },
    logsPortal,
  });
  return mocks.mountOptions as Record<string, unknown>;
}

function renderAt(path: string, appConfig: AppConfig = config) {
  const routes = mount(appConfig).children as ReactElement;
  return render(<MemoryRouter initialEntries={[path]}>{routes}</MemoryRouter>);
}

describe('resolvePortalGraphqlUrl', () => {
  it('uses the address the build baked in', () => {
    expect(
      resolvePortalGraphqlUrl({ DEV: true, VITE_GRAPHQL_URL: 'https://staging.server.duncit.com/graphql' })
    ).toBe('https://staging.server.duncit.com/graphql');
  });

  it('answers the local server under vite dev when none was set', () => {
    expect(resolvePortalGraphqlUrl({ DEV: true, VITE_GRAPHQL_URL: '' })).toBe('http://localhost:2001/graphql');
  });

  it('answers production in a build without one, ignoring a non-string value', () => {
    expect(resolvePortalGraphqlUrl({ DEV: false, VITE_GRAPHQL_URL: true })).toBe(
      'https://server.duncit.com/graphql'
    );
  });
});

describe('mountWelcomePortal', () => {
  beforeEach(() => {
    mocks.mountOptions = null;
    mocks.runtimeArgs = null;
    mocks.dashboardProps = null;
    mocks.loaderClient = null;
    mocks.token = 'analytics-token';
  });

  it('boots the runtime and the provider stack with this console and its address', () => {
    const options = mount();

    expect(mocks.runtimeArgs).toEqual([config, 'https://staging.server.duncit.com/graphql']);
    expect(options.config).toBe(config);
    expect(options.apolloClient).toEqual({ __client: 'analytics' });
    expect(options.graphqlUrl).toBe('https://staging.server.duncit.com/graphql');
    expect(options.logsPortal).toBe(logsPortal);
    expect(options.loadUser).toBe('session-loader');
    expect(mocks.loaderClient).toEqual({ __client: 'analytics' });
  });

  it('renders the welcome dashboard inside the chrome at /, with the translated tagline', () => {
    renderAt('/');

    expect(screen.getByTestId('chrome')).toContainElement(screen.getByTestId('welcome'));
    expect(mocks.dashboardProps).toEqual({
      dashboardId: 'analytics.overview',
      name: 'Analytics',
      tagline: 'translated shell.portal.analytics.tagline',
      modules: [],
    });
  });

  it('shows the literal tagline when the console has no key for it', () => {
    renderAt('/', { ...config, taglineKey: undefined });

    expect(mocks.dashboardProps?.tagline).toBe('Every number Duncit runs on.');
  });

  it('renders the login page without the chrome', () => {
    renderAt('/login');

    expect(screen.getByTestId('login')).toBeInTheDocument();
    expect(screen.queryByTestId('chrome')).not.toBeInTheDocument();
  });

  it('renders the profile page inside the chrome', () => {
    renderAt('/profile');

    expect(screen.getByTestId('chrome')).toContainElement(screen.getByTestId('profile'));
  });

  it('sends an unknown path to the dashboard', () => {
    renderAt('/reports/weekly');

    expect(screen.getByTestId('welcome')).toBeInTheDocument();
  });

  it('sends a visitor without a session to the login page', () => {
    mocks.token = null;
    renderAt('/');

    expect(screen.getByTestId('login')).toBeInTheDocument();
    expect(screen.queryByTestId('welcome')).not.toBeInTheDocument();
  });
});
