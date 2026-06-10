import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import AppShell from '../../src/components/AppShell';
import { appConfig } from '../../src/config/app-config';
import { setToken, getToken } from '../../src/lib/session';
import { renderWithProviders } from './testkit';

const ctx = vi.hoisted(() => ({
  state: { user: null as any, loading: false, logout: vi.fn() },
}));

vi.mock('@duncit/user-context', () => ({
  useUserData: () => ctx.state,
  UserProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const child = <div data-testid="page">Page body</div>;

beforeEach(() => {
  ctx.state = { user: null, loading: false, logout: vi.fn() };
});

afterEach(() => localStorage.clear());

describe('AppShell', () => {
  it('shows a spinner while the session loads', () => {
    ctx.state = { user: null, loading: true, logout: vi.fn() };
    const { container } = renderWithProviders(<AppShell>{child}</AppShell>);
    expect(container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
    expect(screen.queryByTestId('page')).not.toBeInTheDocument();
  });

  it('renders the shell and page for an authorised user', () => {
    ctx.state = {
      user: { full_name: 'Jane Doe', roles: ['SUPPORT_MANAGER'], profile_photo: '' },
      loading: false,
      logout: vi.fn(),
    };
    renderWithProviders(<AppShell>{child}</AppShell>);
    expect(screen.getByTestId('page')).toBeInTheDocument();
    expect(screen.getAllByText(appConfig.fullName).length).toBeGreaterThan(0);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('derives initials from first/last, email, then the app name', () => {
    ctx.state = {
      user: { first_name: 'Ann', last_name: 'Bell', roles: ['SUPPORT_MANAGER'] },
      loading: false,
      logout: vi.fn(),
    };
    const a = renderWithProviders(<AppShell>{child}</AppShell>);
    expect(screen.getByText('AB')).toBeInTheDocument();
    a.unmount();

    ctx.state = { user: { email: 'zoe@duncit.com', roles: ['SUPPORT_MANAGER'] }, loading: false, logout: vi.fn() };
    const b = renderWithProviders(<AppShell>{child}</AppShell>);
    expect(screen.getByText('Z')).toBeInTheDocument();
    b.unmount();

    ctx.state = { user: { roles: ['SUPPORT_MANAGER'] }, loading: false, logout: vi.fn() };
    renderWithProviders(<AppShell>{child}</AppShell>);
    expect(screen.getByText(appConfig.name[0])).toBeInTheDocument();
  });

  it('logs out: clears the token and calls the context logout', () => {
    const logout = vi.fn();
    ctx.state = { user: { full_name: 'Jane Doe', roles: ['SUPPORT_MANAGER'] }, loading: false, logout };
    setToken('tok');
    renderWithProviders(<AppShell>{child}</AppShell>);
    fireEvent.click(screen.getByLabelText('logout'));
    expect(logout).toHaveBeenCalled();
    expect(getToken()).toBeNull();
  });

  it('boots an unauthorised user out and clears their token', async () => {
    ctx.state = { user: { full_name: 'No Access', roles: ['SOMETHING_ELSE'] }, loading: false, logout: vi.fn() };
    setToken('tok');
    renderWithProviders(<AppShell>{child}</AppShell>);
    await waitFor(() => expect(getToken()).toBeNull());
  });

  it('toggles color mode and opens then closes the mobile navigation drawer', async () => {
    ctx.state = { user: { full_name: 'Jane Doe', roles: ['SUPPORT_MANAGER'] }, loading: false, logout: vi.fn() };
    const { container } = renderWithProviders(<AppShell>{child}</AppShell>);
    fireEvent.click(screen.getByLabelText('toggle color mode'));
    fireEvent.click(screen.getByLabelText('open navigation'));
    // Closing via the backdrop exercises the Drawer onClose handler.
    const backdrop = container.querySelector('.MuiBackdrop-root');
    if (backdrop) fireEvent.click(backdrop);
    expect(screen.getByTestId('page')).toBeInTheDocument();
  });
});
