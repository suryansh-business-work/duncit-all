import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@apollo/client', () => ({ useQuery: vi.fn(), gql: (s: TemplateStringsArray) => s }));

import { useQuery } from '@apollo/client';
import { AppSidebar } from '../src/chrome/AppSidebar';
import type { AppNavItem } from '../src/types';
import type { DuncitUser } from '@duncit/user-context';

const mockQuery = vi.mocked(useQuery);

const nav: AppNavItem[] = [
  { label: 'Dashboard', to: '/' },
  { label: 'Sales', children: [{ label: 'Leads', to: '/leads' }] },
];

function renderSidebar(props: Partial<Parameters<typeof AppSidebar>[0]> = {}) {
  return render(
    <MemoryRouter initialEntries={['/leads']}>
      <AppSidebar name="CRM" nav={nav} {...props} />
    </MemoryRouter>,
  );
}

describe('AppSidebar', () => {
  beforeEach(() => {
    mockQuery.mockReturnValue({ data: { branding: { portals_logo_url: '/l.png', app_name: 'Acme' } }, loading: false } as never);
  });

  it('shows a logo skeleton while branding loads', () => {
    mockQuery.mockReturnValue({ data: undefined, loading: true } as never);
    const { container } = renderSidebar();
    expect(container.querySelector('.MuiSkeleton-root')).toBeTruthy();
    expect(screen.queryByAltText('Acme')).not.toBeInTheDocument();
  });

  it('renders the logo, nav and the default footer caption', () => {
    renderSidebar();
    expect(screen.getByAltText('Acme')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Sales')).toBeInTheDocument();
    expect(screen.getByText('© Duncit')).toBeInTheDocument();
  });

  it('uses a custom footer caption and shows the user card', () => {
    renderSidebar({ footerCaption: '© Acme', user: { full_name: 'Ada Lovelace' } as DuncitUser });
    expect(screen.getByText('© Acme')).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
  });

  it('filters the nav and reports when nothing matches', async () => {
    const u = userEvent.setup();
    renderSidebar();
    const search = screen.getByPlaceholderText('Search menu…');
    await u.type(search, 'zzz');
    expect(screen.getByText('No menu items match.')).toBeInTheDocument();
    await u.clear(search);
    await u.type(search, 'Dash');
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Sales')).not.toBeInTheDocument();
  });

  it('toggles the expand-all control label', async () => {
    const u = userEvent.setup();
    renderSidebar();
    const btn = screen.getByRole('button', { name: /Expand all/ });
    await u.click(btn);
    expect(screen.getByRole('button', { name: /Collapse all/ })).toBeInTheDocument();
  });
});
