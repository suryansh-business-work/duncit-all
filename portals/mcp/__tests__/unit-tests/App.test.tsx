import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';

const m = vi.hoisted(() => ({ token: null as string | null }));

/** The login page, showing where it would send the person back to. */
function LoginProbe() {
  const location = useLocation();
  return <div data-testid="login">{new URLSearchParams(location.search).get('redirect')}</div>;
}

vi.mock('../../src/runtime', () => ({
  graphqlUrl: 'http://localhost:2001/graphql',
  runtime: {
    LoginPage: LoginProbe,
    session: { getToken: () => m.token, clearToken: vi.fn(), hasAppAccess: () => true },
  },
}));
vi.mock('../../src/components/McpAppShell', () => ({
  default: ({ children }: { children: ReactNode }) => <div data-testid="chrome">{children}</div>,
}));
/** A screen stand-in that names itself. A declaration, so the hoisted mocks can call it. */
function page(name: string) {
  return { default: () => <div data-testid="page">{name}</div> };
}
vi.mock('../../src/pages/dashboard/DashboardPage', () => page('dashboard'));
vi.mock('../../src/pages/activity/ActivityPage', () => page('activity'));
vi.mock('../../src/pages/tools/ToolsPage', () => page('tools'));
vi.mock('../../src/pages/connect/ConnectPage', () => ({
  default: () => {
    const location = useLocation();
    return <div data-testid="page">connect{location.search}</div>;
  },
}));
vi.mock('../../src/pages/connections/ConnectionsPage', () => page('connections'));
vi.mock('../../src/pages/settings/SettingsPage', () => page('settings'));
vi.mock('../../src/pages/guide/GuidePage', () => ({ default: () => <div data-testid="guide">guide</div> }));

import App from '../../src/App';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

beforeEach(() => {
  m.token = 'tok-1';
});

describe('App routes', () => {
  it.each([
    ['/', 'dashboard'],
    ['/activity', 'activity'],
    ['/tools', 'tools'],
    ['/connections', 'connections'],
    ['/settings', 'settings'],
  ])('opens %s inside the console chrome', (path, name) => {
    renderAt(path);
    expect(screen.getByTestId('chrome')).toHaveTextContent(name);
  });

  it('sends anyone signed out to the login page, remembering where they were going', () => {
    m.token = null;
    renderAt('/activity');
    expect(screen.getByTestId('login')).toHaveTextContent('/activity');
    expect(screen.queryByTestId('page')).not.toBeInTheDocument();
  });

  it('keeps the OAuth request through sign-in, so the consent screen opens after it', () => {
    m.token = null;
    renderAt('/connect?request=req-1');
    expect(screen.getByTestId('login')).toHaveTextContent('/connect?request=req-1');
  });

  it('opens the consent screen with its request for a signed-in person', () => {
    renderAt('/connect?request=req-1');
    expect(screen.getByTestId('chrome')).toHaveTextContent('connect?request=req-1');
  });

  it('shows the Guide without signing in, outside the console chrome', () => {
    m.token = null;
    renderAt('/guide');
    expect(screen.getByTestId('guide')).toBeInTheDocument();
    expect(screen.queryByTestId('chrome')).not.toBeInTheDocument();
    expect(screen.queryByTestId('login')).not.toBeInTheDocument();
  });

  it('shows the Guide inside the chrome for a signed-in reader', () => {
    renderAt('/guide');
    expect(screen.getByTestId('chrome')).toHaveTextContent('guide');
  });

  it('lands an unknown path on the dashboard', () => {
    renderAt('/no-such-page');
    expect(screen.getByTestId('chrome')).toHaveTextContent('dashboard');
  });
});
