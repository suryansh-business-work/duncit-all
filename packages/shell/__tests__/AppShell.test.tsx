import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('@apollo/client', () => ({ useQuery: vi.fn(), gql: (s: TemplateStringsArray) => s }));
vi.mock('@duncit/breadcrumb', () => ({
  BreadcrumbProvider: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AppBreadcrumbs: () => <nav data-testid="crumbs" />,
}));

import { useQuery } from '@apollo/client';
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
    mockQuery.mockReturnValue({ data: { branding: { portals_logo_url: '/l.png', app_name: 'Acme' } }, loading: false } as never);
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
    await u.keyboard('{Escape}');
    expect(document.querySelector('.MuiDrawer-modal')?.getAttribute('aria-hidden')).toBe('true');
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
