import { afterEach, describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router-dom';
import { screen, fireEvent } from '@testing-library/react';
import AppShell from '../../src/components/AppShell';
import { getToken, setToken, clearToken } from '../../src/lib/session';
import { renderWithProviders } from '../testkit';
import { makeUser } from '../mocks';

const userMock = vi.hoisted(() => ({
  value: { user: null as unknown, loading: false, logout: vi.fn() },
}));

vi.mock('@duncit/user-context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/user-context')>()),
  useUserData: () => userMock.value,
}));

// Replace the shared shell chrome with a probe that surfaces the adapter's
// computed props (access/loading/user) and its logout + denied callbacks.
vi.mock('@duncit/shell', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/shell')>();
  return {
    ...actual,
    AppShell: (props: Record<string, any>) => (
      <div
        data-testid="shell"
        data-access={String(props.hasAccess)}
        data-loading={String(props.loading)}
        data-has-user={String(!!props.user)}
      >
        <button type="button" onClick={props.onLogout}>
          logout
        </button>
        <button type="button" onClick={props.onDenied}>
          denied
        </button>
        {props.children}
      </div>
    ),
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
});

describe('AppShell adapter', () => {
  it('leaves access undefined and passes no user while loading signed-out', () => {
    userMock.value = { user: null, loading: true, logout: vi.fn() };
    renderShell();
    const shell = screen.getByTestId('shell');
    expect(shell).toHaveAttribute('data-access', 'undefined');
    expect(shell).toHaveAttribute('data-loading', 'true');
    expect(shell).toHaveAttribute('data-has-user', 'false');
  });

  it('grants access from the user roles when an employee is signed in', () => {
    userMock.value = { user: makeUser({ roles: ['EMPLOYEE'] }), loading: false, logout: vi.fn() };
    renderShell();
    const shell = screen.getByTestId('shell');
    expect(shell).toHaveAttribute('data-access', 'true');
    expect(shell).toHaveAttribute('data-has-user', 'true');
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('denies a signed-in user without the employee role', () => {
    userMock.value = { user: makeUser({ roles: ['OTHER'] }), loading: false, logout: vi.fn() };
    renderShell();
    expect(screen.getByTestId('shell')).toHaveAttribute('data-access', 'false');
  });

  it('logout clears the token, calls context logout and routes to /login', () => {
    const logout = vi.fn();
    userMock.value = { user: makeUser(), loading: false, logout };
    setToken('tok');
    renderShell();
    fireEvent.click(screen.getByRole('button', { name: 'logout' }));
    expect(getToken()).toBeNull();
    expect(logout).toHaveBeenCalledTimes(1);
    expect(screen.getByText('LOGIN ROUTE')).toBeInTheDocument();
  });

  it('wires onDenied straight to clearToken', () => {
    setToken('tok');
    userMock.value = { user: makeUser(), loading: false, logout: vi.fn() };
    renderShell();
    fireEvent.click(screen.getByRole('button', { name: 'denied' }));
    expect(getToken()).toBeNull();
  });
});
