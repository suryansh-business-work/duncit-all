import { afterEach, describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router';
import { screen, fireEvent } from '@testing-library/react';
import AppShell from '../AppShell';
import { getToken, setToken, clearToken } from '../../lib/session';
import { AUTO_PODS_PATH } from '../../config/app-config';
import { renderWithProviders } from '../../__tests__/testkit';

const userMock = vi.hoisted(() => ({
  value: { user: null as unknown, loading: false, logout: vi.fn() },
}));
vi.mock('@duncit/user-context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/user-context')>()),
  useUserData: () => userMock.value,
}));

const flagMock = vi.hoisted(() => ({ autoPods: false }));
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useFeatureFlag: (key: string) => (key === 'auto_pods' ? flagMock.autoPods : false),
}));

// Replace the shared shell chrome with a probe that surfaces the props the
// adapter computes and lets us fire its onLogout callback.
vi.mock('@duncit/shell', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/shell')>();
  return {
    ...actual,
    AppShell: (props: Record<string, any>) => (
      <div data-testid="shell">
        <span data-testid="has-access">{String(props.hasAccess)}</span>
        <span data-testid="loading">{String(props.loading)}</span>
        <span data-testid="has-user">{String(!!props.user)}</span>
        <span data-testid="nav-paths">{JSON.stringify(flattenPaths(props.nav))}</span>
        <span data-testid="search-paths">{JSON.stringify(props.searchItems.map((i: any) => i.to))}</span>
        <button onClick={props.onLogout}>logout</button>
        {props.children}
      </div>
    ),
  };
});

/** Every `to` in the nav tree, children included — same shape navWithout walks. */
function flattenPaths(items: any[]): string[] {
  return items.flatMap((item) => [
    ...(item.to ? [item.to] : []),
    ...(item.children ? flattenPaths(item.children) : []),
  ]);
}

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
  flagMock.autoPods = false;
  userMock.value = { user: null, loading: false, logout: vi.fn() };
});

describe('AppShell adapter', () => {
  it('grants access and passes the user through when an admin is signed in', () => {
    userMock.value = { user: { roles: ['SUPER_ADMIN'] }, loading: false, logout: vi.fn() };
    renderShell();
    expect(screen.getByTestId('has-access')).toHaveTextContent('true');
    expect(screen.getByTestId('has-user')).toHaveTextContent('true');
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
  });

  it('leaves access undefined and clears the user when signed out', () => {
    userMock.value = { user: null, loading: true, logout: vi.fn() };
    renderShell();
    expect(screen.getByTestId('has-access')).toHaveTextContent('undefined');
    expect(screen.getByTestId('has-user')).toHaveTextContent('false');
    expect(screen.getByTestId('loading')).toHaveTextContent('true');
  });

  it('drops Auto Pods from the nav tree and the search index while the flag is off', () => {
    flagMock.autoPods = false;
    renderShell();
    expect(screen.getByTestId('nav-paths')).not.toHaveTextContent(AUTO_PODS_PATH);
    expect(screen.getByTestId('search-paths')).not.toHaveTextContent(AUTO_PODS_PATH);
    // A sibling under the same "Pods" group survives the recursive filter.
    expect(screen.getByTestId('nav-paths')).toHaveTextContent('/pods');
  });

  it('keeps Auto Pods in the nav tree and the search index once the flag is on', () => {
    flagMock.autoPods = true;
    renderShell();
    expect(screen.getByTestId('nav-paths')).toHaveTextContent(AUTO_PODS_PATH);
    expect(screen.getByTestId('search-paths')).toHaveTextContent(AUTO_PODS_PATH);
  });

  it('logs out: clears the token, calls context logout and routes to /login', () => {
    const logout = vi.fn();
    userMock.value = { user: { roles: ['SUPER_ADMIN'] }, loading: false, logout };
    setToken('tok');
    renderShell();
    fireEvent.click(screen.getByRole('button', { name: 'logout' }));
    expect(getToken()).toBeNull();
    expect(logout).toHaveBeenCalledTimes(1);
    expect(screen.getByText('LOGIN ROUTE')).toBeInTheDocument();
  });
});
