import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * The runtime wires four shared pieces together, so the test asserts the
 * WIRING: that each piece is handed this portal's own config and session, and
 * that logging out clears the token, tells the user context, and leaves for the
 * login route. What those pieces do once wired is their own tests' business.
 */
const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  ctxLogout: vi.fn(),
  userData: {
    user: { roles: ['ALL_VENUES_ACCESS'], email: 'ops@duncit.com' } as
      | { roles: string[]; email: string }
      | null,
    loading: false,
    logout: vi.fn(),
  },
  appShellProps: null as Record<string, unknown> | null,
  loginProps: null as Record<string, unknown> | null,
  createdClient: null as Record<string, unknown> | null,
}));

vi.mock('react-router', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('@duncit/user-context', () => ({
  useUserData: () => ({ ...mocks.userData, logout: mocks.ctxLogout }),
  emitAuthChanged: vi.fn(),
}));

vi.mock('../src/chrome/AppShell', () => ({
  AppShell: (props: Record<string, unknown>) => {
    mocks.appShellProps = props;
    return <div data-testid="chrome">{props.children as React.ReactNode}</div>;
  },
}));

vi.mock('../src/portal-login', () => ({
  PortalLoginPage: (props: Record<string, unknown>) => {
    mocks.loginProps = props;
    return <div data-testid="login" />;
  },
}));

vi.mock('../src/lib/apollo', () => ({
  createApolloClient: (opts: Record<string, unknown>) => {
    mocks.createdClient = opts;
    return { __client: true };
  },
}));

import { createPortalRuntime } from '../src/lib/portal-runtime';
import type { AppConfig } from '../src/types';

const config = {
  key: 'venues',
  name: 'Venues',
  fullName: 'Duncit Venues',
  tokenKey: 'venues_token',
  colorModeKey: 'venues_color_mode',
  requiredRoles: ['ALL_VENUES_ACCESS'],
  accent: { light: '#5eead4', main: '#0d9488', hover: '#0f766e', active: '#115e59' },
  nav: [{ label: 'Dashboard', to: '/', icon: 'dashboard' }],
  modules: [],
} as unknown as AppConfig;

const GRAPHQL = 'https://server.duncit.com/graphql';

describe('createPortalRuntime', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.navigate.mockClear();
    mocks.ctxLogout.mockClear();
    mocks.appShellProps = null;
    mocks.loginProps = null;
    mocks.createdClient = null;
    mocks.userData.user = { roles: ['ALL_VENUES_ACCESS'], email: 'ops@duncit.com' };
    mocks.userData.loading = false;
  });

  it('names the console on its Apollo client so the rate limiter can tell it apart', () => {
    const runtime = createPortalRuntime(config, GRAPHQL);
    expect(runtime.apolloClient).toEqual({ __client: true });
    expect(mocks.createdClient).toMatchObject({ graphqlUrl: GRAPHQL, app: 'venues' });
    // The client reads the token through the session, not a captured value.
    expect(typeof (mocks.createdClient as { getToken: unknown }).getToken).toBe('function');
  });

  it('builds the session on this portal own token key', () => {
    const runtime = createPortalRuntime(config, GRAPHQL);
    runtime.session.setToken('tok-123');
    expect(localStorage.getItem('venues_token')).toBe('tok-123');
    expect(runtime.session.getToken()).toBe('tok-123');
    expect(runtime.session.hasAppAccess(['ALL_VENUES_ACCESS'])).toBe(true);
    expect(runtime.session.hasAppAccess(['SOMETHING_ELSE'])).toBe(false);
  });

  it('hands the chrome this portal config, nav and the signed-in user', () => {
    const runtime = createPortalRuntime(config, GRAPHQL);
    const { AppShell } = runtime;
    render(<AppShell>page</AppShell>);

    expect(screen.getByTestId('chrome')).toHaveTextContent('page');
    expect(mocks.appShellProps).toMatchObject({
      config,
      nav: config.nav,
      profileTo: '/profile',
      hasAccess: true,
      loading: false,
    });
  });

  it('leaves hasAccess undecided until the user has loaded', () => {
    mocks.userData.user = null;
    mocks.userData.loading = true;
    const runtime = createPortalRuntime(config, GRAPHQL);
    const { AppShell } = runtime;
    render(<AppShell>page</AppShell>);
    // Not `false`: refusing access before the roles are known would bounce a
    // signed-in reader on every reload.
    expect(mocks.appShellProps?.hasAccess).toBeUndefined();
    expect(mocks.appShellProps?.loading).toBe(true);
  });

  it('logging out clears the token, tells the user context, and goes to /login', () => {
    const runtime = createPortalRuntime(config, GRAPHQL);
    runtime.session.setToken('tok-123');
    const { AppShell } = runtime;
    render(<AppShell>page</AppShell>);

    const onLogout = mocks.appShellProps?.onLogout as () => void;
    onLogout();

    expect(localStorage.getItem('venues_token')).toBeNull();
    expect(mocks.ctxLogout).toHaveBeenCalledTimes(1);
    expect(mocks.navigate).toHaveBeenCalledWith('/login', { replace: true });
  });

  it('clears the token when the chrome reports access denied', () => {
    const runtime = createPortalRuntime(config, GRAPHQL);
    runtime.session.setToken('tok-123');
    const { AppShell } = runtime;
    render(<AppShell>page</AppShell>);

    (mocks.appShellProps?.onDenied as () => void)();
    expect(localStorage.getItem('venues_token')).toBeNull();
  });

  it('hands the login page this portal config and its session writers', () => {
    const runtime = createPortalRuntime(config, GRAPHQL);
    const { LoginPage } = runtime;
    render(<LoginPage />);

    expect(screen.getByTestId('login')).toBeInTheDocument();
    expect(mocks.loginProps?.appConfig).toBe(config);
    const session = mocks.loginProps?.session as {
      setToken: (t: string) => void;
      hasAppAccess: (r: string[]) => boolean;
      accessDeniedMessage: unknown;
    };
    session.setToken('from-login');
    expect(localStorage.getItem('venues_token')).toBe('from-login');
    expect(session.hasAppAccess(['ALL_VENUES_ACCESS'])).toBe(true);
    expect(session.accessDeniedMessage).toBeDefined();
  });
});
