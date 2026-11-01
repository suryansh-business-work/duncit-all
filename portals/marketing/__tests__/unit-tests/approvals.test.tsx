import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { Route } from 'react-router';
import { renderWithProviders } from '../testkit';
import { __setTableRows } from './table-mock';
import { makeRunSummary, marketingRunSummaryErrorMock, marketingRunSummaryMock } from '../mocks';

/** The stand-in grid's props, plus the one the real grid pins a page's view through. */
type TableProps = ComponentProps<typeof import('./table-mock').DuncitTable> & { externalFilters?: ReadonlyArray<unknown> };
const tableSpy = vi.hoisted(() => ({ props: null as TableProps | null }));
vi.mock('@duncit/table', async () => {
  const mock = await import('./table-mock');
  const DuncitTable = (props: TableProps) => {
    tableSpy.props = props;
    return <mock.DuncitTable {...props} />;
  };
  return { ...mock, DuncitTable };
});
vi.mock('@duncit/user-context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/user-context')>()),
  useUserData: () => ({ user: { user_id: 'u1' } }),
}));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  useConfirm: () => vi.fn(),
}));

import ApprovalsPage from '../../src/pages/approvals-page';

beforeEach(() => {
  localStorage.setItem('duncit.tours.completed.u1', '["marketing.approvals"]');
});

afterEach(() => {
  __setTableRows([]);
  tableSpy.props = null;
  vi.clearAllMocks();
});

const renderPage = (mocks = [marketingRunSummaryMock(makeRunSummary())]) =>
  renderWithProviders(<ApprovalsPage />, {
    mocks,
    initialEntries: ['/approvals'],
    routes: (
      <>
        <Route path="/approvals" element={<ApprovalsPage />} />
        <Route path="/ads-approvals" element={<div>ads-approvals-page</div>} />
        <Route path="/activity" element={<div>activity-page</div>} />
      </>
    ),
  });

describe('ApprovalsPage', () => {
  it('opens with its heading and intro, counts the week, and lists only runs waiting on a person', async () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Approvals' })).toBeInTheDocument();
    expect(screen.getByText('Runs that are waiting for a person to say yes.')).toBeInTheDocument();
    expect(screen.getByText(/An editor submitted something, or an agent reached a step/)).toBeInTheDocument();
    expect(screen.getByText(/Approve to let it continue, or reject it or ask for changes with a note/)).toBeInTheDocument();

    const cards = screen.getByTestId('run-summary-cards');
    expect(await within(cards).findByText('3')).toBeInTheDocument();
    expect(within(screen.getByTestId('run-card-awaiting')).getByText('Awaiting approval')).toBeInTheDocument();
    expect(within(screen.getByTestId('run-card-running')).getByText('2')).toBeInTheDocument();
    expect(within(screen.getByTestId('run-card-failed')).getByText('5')).toBeInTheDocument();
    // Only the failures lead somewhere; the two counts of this page's own list do not link away from it.
    expect(within(cards).getAllByRole('link')).toHaveLength(1);
    expect(within(cards).getByRole('link', { name: /Failed this week/ })).toHaveAttribute('href', '/activity?status=FAILED');

    expect(await screen.findByTestId('table-empty')).toHaveTextContent(
      'Nothing to approve. Items appear here when an editor submits or an agent policy requires a check.',
    );
    expect(tableSpy.props).toMatchObject({
      tableId: 'marketing-approvals',
      externalFilters: [{ field: 'status', op: 'eq', value: 'AWAITING_APPROVAL' }],
    });
  });

  it('points at the ads queue, which keeps its own review flow', async () => {
    renderPage();
    expect(screen.getByText('Ad requests')).toBeInTheDocument();
    expect(screen.getByText(/Ads from brands and products have their own review queue/)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Open ad requests' });
    expect(link).toHaveAttribute('href', '/ads-approvals');
    fireEvent.click(link);
    expect(await screen.findByText('ads-approvals-page')).toBeInTheDocument();
  });

  it('shows the cards as skeletons while the numbers load', () => {
    renderPage([{ ...marketingRunSummaryMock(makeRunSummary()), delay: 10_000 }]);
    const card = screen.getByTestId('run-card-awaiting');
    expect(card.querySelector('.MuiSkeleton-root')).not.toBeNull();
    expect(within(card).queryByText('3')).not.toBeInTheDocument();
  });

  it('explains numbers that could not be read, and shows a dash in their place', async () => {
    renderPage([marketingRunSummaryErrorMock('Summary unavailable')]);
    expect(await screen.findByRole('alert')).toHaveTextContent('Summary unavailable');
    expect(within(screen.getByTestId('run-card-awaiting')).getByText('—')).toBeInTheDocument();
  });

  it('follows the failed-this-week card into Activity, pinned to failures', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('link', { name: /Failed this week/ }));
    expect(await screen.findByText('activity-page')).toBeInTheDocument();
  });
});
