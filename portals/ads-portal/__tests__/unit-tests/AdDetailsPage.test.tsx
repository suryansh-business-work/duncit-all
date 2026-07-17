import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router-dom';
import { screen } from '@testing-library/react';
import AdDetailsPage from '../../src/pages/ads/AdDetailsPage';
import { adRequestMock, makeAdDetail } from '../mocks';
import { renderWithProviders } from '../testkit';

vi.mock('@duncit/table', () => import('./table-mock'));

// Render QueryGuard's children unconditionally so the page's own
// `ad ? <Content/> : null` fork is exercised on both sides (null while the
// query loads, content once the mocked adRequest resolves).
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

const renderDetails = (mock = adRequestMock(), id = 'ad1') =>
  renderWithProviders(<></>, {
    mocks: [mock],
    initialEntries: [`/ads/${id}`],
    routes: <Route path="/ads/:id" element={<AdDetailsPage />} />,
  });

describe('AdDetailsPage', () => {
  it('renders the ad detail with reviewed marketing remarks', async () => {
    renderDetails();
    // First paint: still loading, so the `ad ? … : null` null branch runs.
    expect(screen.getByTestId('guard')).toHaveAttribute('data-loading', 'true');
    expect(screen.queryByText('Weekend Mega Sale')).not.toBeInTheDocument();

    expect(await screen.findByText('Weekend Mega Sale')).toBeInTheDocument();
    expect(screen.getByText(/Trace ID · AD-1001/)).toBeInTheDocument();
    expect(screen.getByText(/Marketing Remarks .*Reviewed/)).toBeInTheDocument();
    expect(screen.getByTestId('guard')).toHaveAttribute('data-notfound', 'false');
  });

  it('omits the reviewed suffix when the remark has no reviewed_at', async () => {
    renderDetails(adRequestMock(makeAdDetail({ reviewed_at: null })));
    expect(await screen.findByText(/^Marketing Remarks$/)).toBeInTheDocument();
  });

  it('hides the remarks alert when there are no marketing remarks', async () => {
    renderDetails(adRequestMock(makeAdDetail({ marketing_remarks: null })));
    expect(await screen.findByText('Weekend Mega Sale')).toBeInTheDocument();
    expect(screen.queryByText(/Marketing Remarks/)).not.toBeInTheDocument();
  });
});
