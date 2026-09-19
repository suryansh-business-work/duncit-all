import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactElement, ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route } from 'react-router';

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

type ExtraOptions = Pick<Parameters<typeof mountWelcomePortal>[0], 'routes' | 'home' | 'i18nFallback'>;

function mount(appConfig: AppConfig = config, extra: ExtraOptions = {}) {
  mountWelcomePortal({
    appConfig,
    env: { DEV: false, VITE_GRAPHQL_URL: 'https://staging.server.duncit.com/graphql' },
    logsPortal,
    ...extra,
  });
  return mocks.mountOptions as Record<string, unknown>;
}

function renderAt(path: string, appConfig: AppConfig = config, extra: ExtraOptions = {}) {
  const routes = mount(appConfig, extra).children as ReactElement;
  return render(<MemoryRouter initialEntries={[path]}>{routes}</MemoryRouter>);
}

// A console's own screen, as the Logs console hands its log pages in.
const logRoutes: ExtraOptions['routes'] = (authed) => (
  <Route path="/telemetry/logs" element={authed(<div data-testid="telemetry-logs" />)} />
);

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

  it("renders the console's own home at / inside the chrome, in place of the welcome dashboard", () => {
    renderAt('/', config, { home: <div data-testid="logs-dashboard" /> });

    expect(screen.getByTestId('chrome')).toContainElement(screen.getByTestId('logs-dashboard'));
    expect(screen.queryByTestId('welcome')).not.toBeInTheDocument();
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

  it('passes no copy of its own when the console hands none in', () => {
    expect(mount().i18nFallback).toBeUndefined();
  });

  it('hands the console copy it was given to the provider stack', () => {
    const i18nFallback = { 'tech.telemetryLogs.telemetryLogs': 'Telemetry Logs' };

    expect(mount(config, { i18nFallback }).i18nFallback).toBe(i18nFallback);
  });

  it("renders a console's own screen inside the chrome", () => {
    renderAt('/telemetry/logs', config, { routes: logRoutes });

    expect(screen.getByTestId('chrome')).toContainElement(screen.getByTestId('telemetry-logs'));
  });

  it("keeps the console's own screens behind the login gate", () => {
    mocks.token = null;
    renderAt('/telemetry/logs', config, { routes: logRoutes });

    expect(screen.getByTestId('login')).toBeInTheDocument();
    expect(screen.queryByTestId('telemetry-logs')).not.toBeInTheDocument();
  });

  it('still sends an unknown path to the dashboard beside those screens', () => {
    renderAt('/reports/weekly', config, { routes: logRoutes });

    expect(screen.getByTestId('welcome')).toBeInTheDocument();
    expect(screen.queryByTestId('telemetry-logs')).not.toBeInTheDocument();
  });
});
