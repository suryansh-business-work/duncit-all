import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import App from '../../src/App';
import { byTestId, mount, queryTestId } from '../dom';

const session = vi.hoisted(() => ({ token: null as string | null }));

// The runtime is the shell's own (see runtime.test); here it only has to say
// whether someone is signed in and wrap the page in something recognisable.
vi.mock('../../src/runtime', () => ({
  graphqlUrl: 'http://localhost:2001/graphql',
  runtime: {
    session: { getToken: () => session.token },
    AppShell: ({ children }: Readonly<{ children: ReactNode }>) => <div data-testid="app-shell">{children}</div>,
    LoginPage: () => <div data-testid="login-page" />,
  },
}));
vi.mock('../../src/pages/entity-analytics/EntityAnalyticsPage', () => ({
  default: ({ page }: Readonly<{ page: { path: string; entity: string } }>) => (
    <div data-testid="analytics-page">{page.entity}</div>
  ),
}));
vi.mock('@duncit/shell', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/shell')>()),
  ProfilePage: () => <div data-testid="profile-page" />,
}));

afterEach(() => {
  session.token = null;
});

const open = (path: string) =>
  mount(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

describe('Analytics routes', () => {
  it('serves the login page', async () => {
    await open('/login');
    expect(queryTestId('login-page')).not.toBeNull();
  });

  it('sends a signed-out reader to the login page', async () => {
    await open('/pods');
    expect(queryTestId('login-page')).not.toBeNull();
    expect(queryTestId('app-shell')).toBeNull();
  });

  it.each([
    ['/users', 'USERS'],
    ['/pods', 'PODS'],
    ['/clubs', 'CLUBS'],
    ['/club-admins', 'CLUB_ADMINS'],
    ['/hosts', 'HOSTS'],
  ])('opens the %s dashboard inside the chrome', async (path, entity) => {
    session.token = 'fixture-session';
    await open(path);
    expect(byTestId('app-shell').contains(byTestId('analytics-page'))).toBe(true);
    expect(byTestId('analytics-page').textContent).toBe(entity);
  });

  it('serves the profile page behind the same gate', async () => {
    session.token = 'fixture-session';
    await open('/profile');
    expect(queryTestId('profile-page')).not.toBeNull();
  });

  it.each(['/', '/reports/old'])('lands %s on the first dashboard', async (path) => {
    session.token = 'fixture-session';
    await open(path);
    expect(byTestId('analytics-page').textContent).toBe('USERS');
  });
});
