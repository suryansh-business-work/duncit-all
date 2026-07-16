import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router-dom';
import { screen } from '@testing-library/react';
import AdDetailsPage from '../../src/pages/ads/AdDetailsPage';
import { adDetail } from './fixtures';
import { renderWithProviders } from './testkit';

const q = vi.hoisted(() => ({
  value: { data: undefined as unknown, loading: false, error: undefined as unknown },
}));
vi.mock('@apollo/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client')>()),
  useQuery: () => q.value,
}));

vi.mock('@duncit/table', () => ({
  EM_DASH: '—',
  formatDateCell: (value: string, fmt: string) => `${value}|${fmt}`,
}));

// Render QueryGuard's children unconditionally so the page's own
// `ad ? <Content/> : null` fork is exercised on both sides.
vi.mock('@duncit/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/ui')>()),
  QueryGuard: ({
    loading,
    notFound,
    children,
  }: {
    loading?: boolean;
    notFound?: boolean;
    children: ReactNode | (() => ReactNode);
  }) => (
    <div data-testid="guard" data-loading={String(!!loading)} data-notfound={String(!!notFound)}>
      {typeof children === 'function' ? children() : children}
    </div>
  ),
}));

const renderDetails = (id = 'ad1') =>
  renderWithProviders(<></>, {
    initialEntries: [`/ads/${id}`],
    routes: <Route path="/ads/:id" element={<AdDetailsPage />} />,
  });

afterEach(() => {
  q.value = { data: undefined, loading: false, error: undefined };
});

describe('AdDetailsPage', () => {
  it('renders the ad detail with reviewed marketing remarks', () => {
    q.value = { data: { adRequest: adDetail() }, loading: false, error: undefined };
    renderDetails();
    expect(screen.getByText('Weekend Mega Sale')).toBeInTheDocument();
    expect(screen.getByText(/Trace ID · AD-1001/)).toBeInTheDocument();
    expect(screen.getByText(/Marketing Remarks .*Reviewed/)).toBeInTheDocument();
    expect(screen.getByTestId('guard')).toHaveAttribute('data-notfound', 'false');
  });

  it('omits the reviewed suffix when the remark has no reviewed_at', () => {
    q.value = {
      data: { adRequest: adDetail({ reviewed_at: null }) },
      loading: false,
      error: undefined,
    };
    renderDetails();
    const remarks = screen.getByText(/^Marketing Remarks$/);
    expect(remarks).toBeInTheDocument();
  });

  it('hides the remarks alert when there are no marketing remarks', () => {
    q.value = {
      data: { adRequest: adDetail({ marketing_remarks: null }) },
      loading: false,
      error: undefined,
    };
    renderDetails();
    expect(screen.queryByText(/Marketing Remarks/)).not.toBeInTheDocument();
  });

  it('renders nothing in the body while loading with no ad yet', () => {
    q.value = { data: undefined, loading: true, error: undefined };
    renderDetails();
    expect(screen.getByTestId('guard')).toHaveAttribute('data-loading', 'true');
    expect(screen.queryByText('Weekend Mega Sale')).not.toBeInTheDocument();
  });
});
