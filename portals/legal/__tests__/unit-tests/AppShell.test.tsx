import { afterEach, describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router-dom';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import AppShell from '../../src/components/AppShell';
import { appConfig } from '../../src/config/app-config';
import { getToken } from '../../src/lib/session';
import { renderWithProviders } from './testkit';

// Capture the props the adapter forwards to the shared shell chrome, and expose
// a logout trigger so we can drive the adapter's `onLogout` callback.
const shell = vi.hoisted(() => ({ props: null as any }));

vi.mock('@duncit/shell', async (importActual) => {
  const actual = await importActual<typeof import('@duncit/shell')>();
  return {
    ...actual,
    AppShell: (props: any) => {
      shell.props = props;
      return (
        <div data-testid="shell">
          <button type="button" onClick={props.onLogout}>
            do-logout
          </button>
          <button type="button" onClick={props.onDenied}>
            do-denied
          </button>
          {props.children}
        </div>
      );
    },
  };
});

const userState = vi.hoisted(() => ({ value: null as any }));
const ctxLogout = vi.hoisted(() => vi.fn());

vi.mock('@duncit/user-context', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/user-context')>();
  return {
    ...actual,
    useUserData: () => ({ user: userState.value, loading: userState.value === undefined, logout: ctxLogout }),
  };
});

afterEach(() => {
  userState.value = null;
  ctxLogout.mockClear();
  localStorage.clear();
});

const renderShell = () =>
  renderWithProviders(<></>, {
    initialEntries: ['/'],
    routes: (
      <>
        <Route path="/" element={<AppShell><div>PROTECTED</div></AppShell>} />
        <Route path="/login" element={<div>LOGIN PAGE</div>} />
      </>
    ),
  });

describe('AppShell', () => {
  it('grants access and passes the user through when roles match', () => {
    userState.value = { id: 'u1', name: 'Sam', roles: ['LEGAL_MANAGER'] };
    renderShell();
    expect(screen.getByText('PROTECTED')).toBeInTheDocument();
    expect(shell.props.user).toEqual(userState.value);
    expect(shell.props.hasAccess).toBe(true);
    expect(shell.props.profileTo).toBe('/profile');
    expect(shell.props.nav).toBe(appConfig.nav);
  });

  it('denies access when the user lacks the required role', () => {
    userState.value = { id: 'u2', name: 'Nore', roles: ['SOMETHING_ELSE'] };
    renderShell();
    expect(shell.props.hasAccess).toBe(false);
  });

  it('leaves access undefined while there is no user', () => {
    userState.value = null;
    renderShell();
    expect(shell.props.user).toBeUndefined();
    expect(shell.props.hasAccess).toBeUndefined();
  });

  it('clears the token, calls context logout and routes to /login on logout', async () => {
    userState.value = { id: 'u1', name: 'Sam', roles: ['LEGAL_MANAGER'] };
    localStorage.setItem(appConfig.tokenKey, 'a-token');
    renderShell();
    fireEvent.click(screen.getByText('do-logout'));
    await waitFor(() => expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument());
    expect(ctxLogout).toHaveBeenCalledTimes(1);
    expect(getToken()).toBeNull();
  });

  it('wires the access-denied handler to clear the token', () => {
    userState.value = { id: 'u1', name: 'Sam', roles: ['LEGAL_MANAGER'] };
    localStorage.setItem(appConfig.tokenKey, 'a-token');
    renderShell();
    fireEvent.click(screen.getByText('do-denied'));
    expect(getToken()).toBeNull();
  });
});
