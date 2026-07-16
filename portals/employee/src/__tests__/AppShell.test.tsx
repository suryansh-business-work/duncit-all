import { render, screen, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { navigate, clearToken, ctxLogout, hasAppAccess, userData } = vi.hoisted(() => {
  const ctxLogoutFn = vi.fn();
  return {
    navigate: vi.fn(),
    clearToken: vi.fn(),
    ctxLogout: ctxLogoutFn,
    hasAppAccess: vi.fn((roles?: readonly string[]) => Boolean(roles?.includes('EMPLOYEE'))),
    userData: { user: null as { roles: string[] } | null, loading: false, logout: ctxLogoutFn },
  };
});

vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));
vi.mock('@duncit/user-context', () => ({ useUserData: () => userData }));
vi.mock('../lib/session', () => ({ clearToken, hasAppAccess }));

vi.mock('@duncit/shell', () => ({
  // app-config (real, imported by AppShell) pulls parseEnvRoles from the shell.
  parseEnvRoles: (_env: unknown, fallback: string[]) => fallback,
  AppShell: (
    props: Readonly<{
      children: React.ReactNode;
      hasAccess?: boolean;
      onLogout: () => void;
      onDenied: () => void;
      loading: boolean;
    }>,
  ) => (
    <div data-testid="shell" data-access={String(props.hasAccess)} data-loading={String(props.loading)}>
      <button type="button" onClick={props.onLogout}>
        logout
      </button>
      <button type="button" onClick={props.onDenied}>
        denied
      </button>
      {props.children}
    </div>
  ),
}));

import AppShell from '../components/AppShell';

afterEach(() => {
  vi.clearAllMocks();
  userData.user = null;
  userData.loading = false;
});

describe('AppShell adapter', () => {
  it('passes hasAccess=undefined and loading when there is no user', () => {
    userData.loading = true;
    render(<AppShell>child</AppShell>);
    const shell = screen.getByTestId('shell');
    expect(shell).toHaveAttribute('data-access', 'undefined');
    expect(shell).toHaveAttribute('data-loading', 'true');
    expect(hasAppAccess).not.toHaveBeenCalled();
  });

  it('computes hasAccess from the user roles when a user is present', () => {
    userData.user = { roles: ['EMPLOYEE'] };
    render(<AppShell>child</AppShell>);
    expect(hasAppAccess).toHaveBeenCalledWith(['EMPLOYEE']);
    expect(screen.getByTestId('shell')).toHaveAttribute('data-access', 'true');
  });

  it('logout clears the token, calls context logout and navigates to /login', () => {
    render(<AppShell>child</AppShell>);
    fireEvent.click(screen.getByText('logout'));
    expect(clearToken).toHaveBeenCalledTimes(1);
    expect(ctxLogout).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/login', { replace: true });
  });

  it('wires onDenied to clearToken', () => {
    render(<AppShell>child</AppShell>);
    fireEvent.click(screen.getByText('denied'));
    expect(clearToken).toHaveBeenCalledTimes(1);
  });
});
