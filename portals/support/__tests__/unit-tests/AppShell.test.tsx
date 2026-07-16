import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { setToken, getToken } from '../../src/lib/session';

// Capture the props the adapter forwards to the shared shell chrome so we can
// drive its callbacks (logout / access-denied) and assert the derived values.
const shell = vi.hoisted(() => ({ props: null as any }));
vi.mock('@duncit/shell', async (importActual) => {
  const actual = await importActual<typeof import('@duncit/shell')>();
  return {
    ...actual,
    AppShell: (props: any) => {
      shell.props = props;
      return <div data-testid="shell-chrome">{props.children}</div>;
    },
  };
});

const userCtx = vi.hoisted(() => ({
  value: { user: null as any, loading: false, logout: vi.fn() },
}));
vi.mock('@duncit/user-context', async (importActual) => {
  const actual = await importActual<typeof import('@duncit/user-context')>();
  return { ...actual, useUserData: () => userCtx.value };
});

const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (importActual) => {
  const actual = await importActual<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigate };
});

import AppShell from '../../src/components/AppShell';

const renderShell = () =>
  render(
    <MemoryRouter>
      <AppShell>
        <span>PAGE BODY</span>
      </AppShell>
    </MemoryRouter>,
  );

afterEach(() => {
  navigate.mockReset();
  userCtx.value.logout = vi.fn();
  localStorage.clear();
});

describe('AppShell adapter', () => {
  it('renders children and passes undefined access when there is no user', () => {
    userCtx.value = { user: null, loading: true, logout: vi.fn() };
    renderShell();
    expect(screen.getByText('PAGE BODY')).toBeInTheDocument();
    expect(shell.props.loading).toBe(true);
    expect(shell.props.user).toBeUndefined();
    expect(shell.props.hasAccess).toBeUndefined();
    expect(shell.props.profileTo).toBe('/profile');
  });

  it('computes hasAccess from the signed-in user roles', () => {
    userCtx.value = {
      user: { id: 'u1', name: 'Agent', roles: ['SUPPORT_MANAGER'] },
      loading: false,
      logout: vi.fn(),
    };
    renderShell();
    expect(shell.props.user).toEqual({ id: 'u1', name: 'Agent', roles: ['SUPPORT_MANAGER'] });
    expect(shell.props.hasAccess).toBe(true);
  });

  it('denies access for a user without the required role', () => {
    userCtx.value = {
      user: { id: 'u2', name: 'Nobody', roles: ['RANDOM'] },
      loading: false,
      logout: vi.fn(),
    };
    renderShell();
    expect(shell.props.hasAccess).toBe(false);
  });

  it('logout clears the token, calls the context logout and redirects to /login', () => {
    const ctxLogout = vi.fn();
    userCtx.value = { user: { id: 'u1', name: 'A', roles: [] }, loading: false, logout: ctxLogout };
    setToken('tok-123');
    expect(getToken()).toBe('tok-123');
    renderShell();

    shell.props.onLogout();
    expect(getToken()).toBeNull();
    expect(ctxLogout).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/login', { replace: true });
  });

  it('wires the access-denied handler to clear the token', () => {
    userCtx.value = { user: { id: 'u1', name: 'A', roles: ['SUPPORT_MANAGER'] }, loading: false, logout: vi.fn() };
    setToken('tok-abc');
    renderShell();
    shell.props.onDenied();
    expect(getToken()).toBeNull();
  });
});
