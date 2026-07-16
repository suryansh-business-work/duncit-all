import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const m = vi.hoisted(() => ({
  navigate: vi.fn(),
  userData: { user: null as { roles: string[] } | null, loading: false, logout: vi.fn() },
  clearToken: vi.fn(),
  hasAppAccess: vi.fn(() => true),
}));
vi.mock('react-router-dom', () => ({ useNavigate: () => m.navigate }));
vi.mock('@duncit/user-context', () => ({ useUserData: () => m.userData }));
vi.mock('@duncit/shell', async (io) => {
  const actual = await io<typeof import('@duncit/shell')>();
  return {
    ...actual,
    AppShell: (p: { children: React.ReactNode; hasAccess?: boolean; onLogout: () => void; onDenied: () => void }) => (
      <div data-testid="shell">
        <span>access:{String(p.hasAccess)}</span>
        <button type="button" onClick={p.onLogout}>shell-logout</button>
        <button type="button" onClick={p.onDenied}>shell-denied</button>
        {p.children}
      </div>
    ),
  };
});
vi.mock('../../src/lib/session', () => ({ clearToken: m.clearToken, hasAppAccess: m.hasAppAccess }));

import AppShell from '../../src/components/AppShell';

beforeEach(() => {
  m.navigate.mockReset();
  m.clearToken.mockReset();
  m.hasAppAccess.mockReset().mockReturnValue(true);
  m.userData = { user: null, loading: false, logout: vi.fn() };
});

describe('AppShell', () => {
  it('passes undefined access when there is no user', () => {
    render(<AppShell><div>child</div></AppShell>);
    expect(screen.getByText('access:undefined')).toBeInTheDocument();
    expect(screen.getByText('child')).toBeInTheDocument();
  });

  it('computes access from the signed-in user and logs out cleanly', () => {
    const ctxLogout = vi.fn();
    m.userData = { user: { roles: ['TECH_MANAGER'] }, loading: false, logout: ctxLogout };
    render(<AppShell><div>child</div></AppShell>);
    expect(m.hasAppAccess).toHaveBeenCalledWith(['TECH_MANAGER']);
    expect(screen.getByText('access:true')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'shell-logout' }));
    expect(m.clearToken).toHaveBeenCalled();
    expect(ctxLogout).toHaveBeenCalled();
    expect(m.navigate).toHaveBeenCalledWith('/login', { replace: true });

    fireEvent.click(screen.getByRole('button', { name: 'shell-denied' }));
    expect(m.clearToken).toHaveBeenCalledTimes(2);
  });
});
