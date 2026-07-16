import { afterEach, describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router-dom';
import { screen, fireEvent } from '@testing-library/react';
import AppShell from '../../src/components/AppShell';
import { appConfig } from '../../src/config/app-config';
import { getToken, setToken, clearToken } from '../../src/lib/session';
import { renderWithProviders } from './testkit';

const userMock = vi.hoisted(() => ({
  value: { user: null as unknown, loading: false, logout: vi.fn() },
}));
const flag = vi.hoisted(() => ({ value: true }));

vi.mock('@duncit/user-context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/user-context')>()),
  useUserData: () => userMock.value,
}));
vi.mock('@duncit/app-settings', () => ({ useFeatureFlag: () => flag.value }));

// Probe replacing the shared shell chrome to surface the adapter's computed props.
const navProbe = vi.hoisted(() => ({ nav: [] as Array<{ to?: string }> }));
vi.mock('@duncit/shell', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/shell')>();
  return {
    ...actual,
    AppShell: (props: Record<string, any>) => {
      navProbe.nav = props.nav;
      return (
        <div data-testid="shell">
          <span data-testid="has-access">{String(props.hasAccess)}</span>
          <span data-testid="loading">{String(props.loading)}</span>
          <span data-testid="has-user">{String(!!props.user)}</span>
          <span data-testid="nav-count">{String(props.nav.length)}</span>
          <button onClick={props.onLogout}>logout</button>
          {props.children}
        </div>
      );
    },
  };
});

const renderShell = () =>
  renderWithProviders(<></>, {
    initialEntries: ['/'],
    routes: (
      <>
        <Route path="/" element={<AppShell>content</AppShell>} />
        <Route path="/login" element={<div>LOGIN ROUTE</div>} />
      </>
    ),
  });

afterEach(() => {
  clearToken();
  userMock.value = { user: null, loading: false, logout: vi.fn() };
  flag.value = true;
});

describe('AppShell adapter', () => {
  it('grants access and passes the user through when a manager is signed in', () => {
    userMock.value = { user: { roles: ['PRODUCTS_MANAGER'] }, loading: false, logout: vi.fn() };
    renderShell();
    expect(screen.getByTestId('has-access')).toHaveTextContent('true');
    expect(screen.getByTestId('has-user')).toHaveTextContent('true');
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('leaves access undefined and clears the user when signed out', () => {
    userMock.value = { user: null, loading: true, logout: vi.fn() };
    renderShell();
    expect(screen.getByTestId('has-access')).toHaveTextContent('undefined');
    expect(screen.getByTestId('has-user')).toHaveTextContent('false');
    expect(screen.getByTestId('loading')).toHaveTextContent('true');
  });

  it('shows the full nav when products are visible', () => {
    flag.value = true;
    renderShell();
    expect(screen.getByTestId('nav-count')).toHaveTextContent(String(appConfig.nav.length));
  });

  it('trims the nav to the dashboard when products are hidden', () => {
    flag.value = false;
    renderShell();
    expect(navProbe.nav.every((item) => item.to === '/')).toBe(true);
    expect(navProbe.nav).toHaveLength(1);
  });

  it('logs out: clears the token, calls context logout and routes to /login', () => {
    const logout = vi.fn();
    userMock.value = { user: { roles: ['PRODUCTS_MANAGER'] }, loading: false, logout };
    setToken('tok');
    renderShell();
    fireEvent.click(screen.getByRole('button', { name: 'logout' }));
    expect(getToken()).toBeNull();
    expect(logout).toHaveBeenCalledTimes(1);
    expect(screen.getByText('LOGIN ROUTE')).toBeInTheDocument();
  });
});
