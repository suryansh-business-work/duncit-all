import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router';

vi.mock('@apollo/client', () => ({ gql: (s: TemplateStringsArray) => s }));
vi.mock('@apollo/client/react', () => ({
  useQuery: () => ({ data: undefined, loading: false }),
  useMutation: () => [vi.fn(), { loading: false }],
}));
vi.mock('@duncit/breadcrumb', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/breadcrumb')>()),
  BreadcrumbProvider: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AppBreadcrumbs: () => <nav data-testid="crumbs" />,
}));
vi.mock('../src/staff-chat', () => ({ StaffChatPanel: () => <div /> }));

const contextLogout = vi.fn();
const userData = { user: null as unknown, loading: false, logout: contextLogout };
vi.mock('@duncit/user-context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/user-context')>()),
  useUserData: () => userData,
}));

import { DuncitThemeProvider } from '@duncit/theme';
import { PortalAppShell } from '../src/chrome/PortalAppShell';
import type { AppNavItem } from '../src/types';

const nav: AppNavItem[] = [{ label: 'Reports', to: '/reports' }];
const config = { name: 'Region', fullName: 'Duncit Regional Club Admin' };

function renderShell(clearToken = vi.fn(), hasAppAccess = () => true) {
  render(
    <DuncitThemeProvider defaultMode="light" storageKey="portal_shell_test">
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <PortalAppShell
                config={config}
                nav={nav}
                clearToken={clearToken}
                hasAppAccess={hasAppAccess}
                profileTo="/profile"
              >
                <div>page-content</div>
              </PortalAppShell>
            }
          />
          <Route path="/login" element={<div>login-page</div>} />
        </Routes>
      </MemoryRouter>
    </DuncitThemeProvider>,
  );
  return clearToken;
}

describe('PortalAppShell', () => {
  beforeEach(() => {
    contextLogout.mockClear();
    userData.user = null;
    userData.loading = false;
  });

  it('renders the page while the context has no user yet', () => {
    renderShell();
    expect(screen.getByText('page-content')).toBeInTheDocument();
  });

  it('gates a loaded user with the portal’s own roles', () => {
    userData.user = { full_name: 'Ada Lovelace', roles: ['REGIONAL_CLUB_ADMIN'] };
    const hasAppAccess = vi.fn(() => true);
    renderShell(vi.fn(), hasAppAccess);

    expect(hasAppAccess).toHaveBeenCalledWith(['REGIONAL_CLUB_ADMIN']);
    expect(screen.getByText('page-content')).toBeInTheDocument();
  });

  it('sign-out drops the token, clears the context and lands on /login', async () => {
    userData.user = { full_name: 'Ada Lovelace', roles: ['REGIONAL_CLUB_ADMIN'] };
    const clearToken = vi.fn();
    renderShell(clearToken);

    await userEvent.click(screen.getAllByLabelText(/account menu/i)[0]);
    await userEvent.click(await screen.findByText('Logout'));

    await waitFor(() => expect(screen.getByText('login-page')).toBeInTheDocument());
    expect(clearToken).toHaveBeenCalled();
    expect(contextLogout).toHaveBeenCalled();
  });
});
