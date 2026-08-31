import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// `useMutation` is here because the shell now saves the reader's console
// arrangement (the taskbar clock, where the Agent tab was dragged to) — the
// provider that does it is mounted by AppShell itself.
vi.mock('@apollo/client', () => ({
  useQuery: vi.fn(),
  useMutation: () => [vi.fn(), { loading: false }],
  gql: (s: TemplateStringsArray) => s,
}));
// A factory mock REPLACES the module, so anything the shell imports and this
// object omits arrives as undefined — which is how `useBreadcrumbOverride`
// became "No export is defined on the mock" and took the suite down. Only the
// two chrome components are worth stubbing; the rest is re-exported real.
vi.mock('@duncit/breadcrumb', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/breadcrumb')>()),
  BreadcrumbProvider: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AppBreadcrumbs: () => <nav data-testid="crumbs" />,
}));
// The panel carries a socket and the full chat tree — only whether AppShell
// mounts it for a staff role is this file's concern, not what it renders.
vi.mock('../src/staff-chat', () => ({
  StaffChatPanel: ({ open, meName }: { open: boolean; meName?: string }) => (
    <div data-testid="staff-chat-panel" data-me-name={meName ?? ''}>
      {open ? 'open' : 'closed'}
    </div>
  ),
}));

import { useQuery } from '@apollo/client/react';
import { DuncitThemeProvider } from '@duncit/theme';
import { AppShell } from '../src/chrome/AppShell';
import type { AppNavItem } from '../src/types';
import type { DuncitUser } from '@duncit/user-context';

const mockQuery = vi.mocked(useQuery);
const user = { full_name: 'Ada Lovelace' } as DuncitUser;
const nav: AppNavItem[] = [{ label: 'Reports', to: '/reports' }];

type ShellProps = Parameters<typeof AppShell>[0];

function renderShell(props: Partial<ShellProps> = {}) {
  const config = { name: 'CRM', fullName: 'Duncit CRM', footerCaption: '© CRM' };
  return render(
    <DuncitThemeProvider defaultMode="light" storageKey="shell_test">
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <AppShell config={config} nav={nav} user={user} onLogout={vi.fn()} {...props}>
                <div>page-content</div>
              </AppShell>
            }
          />
          <Route path="/login" element={<div>login-probe</div>} />
          <Route path="/reports" element={<div>reports-page</div>} />
        </Routes>
      </MemoryRouter>
    </DuncitThemeProvider>,
  );
}

describe('AppShell', () => {
  beforeEach(() => {
    mockQuery.mockReturnValue({
      data: { branding: { portals_logo_url: '/l.png', app_name: 'Acme' } },
      loading: false,
      refetch: vi.fn().mockResolvedValue(undefined),
    } as never);
  });

  it('shows the boot spinner while the user is loading', () => {
    render(
      <DuncitThemeProvider defaultMode="light" storageKey="shell_load">
        <MemoryRouter>
          <AppShell config={{ name: 'CRM' }} nav={nav} loading onLogout={vi.fn()}>
            <div>page-content</div>
          </AppShell>
        </MemoryRouter>
      </DuncitThemeProvider>,
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByText('page-content')).not.toBeInTheDocument();
  });

  it('renders the chrome + content and uses fullName as the title', () => {
    renderShell({ hasAccess: true });
    expect(screen.getByText('page-content')).toBeInTheDocument();
    expect(screen.getByText('Duncit CRM')).toBeInTheDocument();
    expect(screen.getByTestId('crumbs')).toBeInTheDocument();
  });

  it('redirects to /login?denied=1 and runs onDenied when access is refused', () => {
    const onDenied = vi.fn();
    renderShell({ hasAccess: false, onDenied });
    expect(onDenied).toHaveBeenCalledTimes(1);
    expect(screen.getByText('login-probe')).toBeInTheDocument();
  });

  it('opens the mobile drawer and closes it when a nav item is chosen', async () => {
    const u = userEvent.setup();
    renderShell({ hasAccess: true });
    await u.click(screen.getByLabelText('open navigation'));
    const modal = document.querySelector('.MuiDrawer-modal') as HTMLElement;
    expect(modal).toBeTruthy();
    await u.click(within(modal).getByRole('link', { name: 'Reports' }));
    expect(screen.getByText('reports-page')).toBeInTheDocument();
  });

  it('closes the mobile drawer via the backdrop/escape path', async () => {
    const u = userEvent.setup();
    renderShell({ hasAccess: true });
    await u.click(screen.getByLabelText('open navigation'));
    const modal = document.querySelector('.MuiDrawer-modal') as HTMLElement;
    await u.keyboard('{Escape}');
    // The drawer is keepMounted, so closing it does not remove it: MUI 7+ marks
    // the modal hidden once the exit transition has run, instead of aria-hidden.
    await waitFor(() => expect(modal).toHaveClass('MuiModal-hidden'));
  });

  it('mounts the docked chat panel for a staff role, closed until the header opens it', () => {
    const staff = { full_name: 'Ada Lovelace', roles: ['SUPER_ADMIN'] } as DuncitUser;
    renderShell({ hasAccess: true, user: staff });
    expect(screen.getByTestId('staff-chat-panel')).toHaveTextContent('closed');
  });

  it('falls back to the first name for the panel when a staff member has no full name', () => {
    const staff = { full_name: null, first_name: 'Ada', roles: ['SUPER_ADMIN'] } as unknown as DuncitUser;
    renderShell({ hasAccess: true, user: staff });
    expect(screen.getByTestId('staff-chat-panel')).toHaveAttribute('data-me-name', 'Ada');
  });

  it('gives the panel no name at all for a staff member with neither name on file', () => {
    const staff = { full_name: null, first_name: null, roles: ['SUPER_ADMIN'] } as unknown as DuncitUser;
    renderShell({ hasAccess: true, user: staff });
    expect(screen.getByTestId('staff-chat-panel')).toHaveAttribute('data-me-name', '');
  });

  it('offers no chat panel at all for a non-staff role', () => {
    renderShell({ hasAccess: true, user: { ...user, roles: ['MEMBER'] } as DuncitUser });
    expect(screen.queryByTestId('staff-chat-panel')).not.toBeInTheDocument();
  });

  it('falls back to the short name when no fullName is set', () => {
    render(
      <DuncitThemeProvider defaultMode="light" storageKey="shell_name">
        <MemoryRouter>
          <AppShell config={{ name: 'CRM' }} nav={nav} user={user} hasAccess onLogout={vi.fn()}>
            <div>page-content</div>
          </AppShell>
        </MemoryRouter>
      </DuncitThemeProvider>,
    );
    expect(screen.getAllByText('CRM').length).toBeGreaterThan(0);
  });
});
