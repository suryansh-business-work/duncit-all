import { describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router-dom';
import { screen, fireEvent } from '@testing-library/react';
import RecentAdsTable from '../../src/pages/dashboard/RecentAdsTable';
import { makeAdRow } from '../mocks';
import { renderWithProviders } from '../testkit';
import { __setTableRows } from './table-mock';

vi.mock('@duncit/table', () => import('./table-mock'));

const renderTable = () => {
  __setTableRows([makeAdRow({ position: 'POD_DETAILS', status: 'PENDING' })]);
  return renderWithProviders(<></>, {
    initialEntries: ['/'],
    routes: (
      <>
        <Route path="/" element={<RecentAdsTable />} />
        <Route path="/ads/:id" element={<div>DETAIL ROUTE</div>} />
      </>
    ),
  });
};

describe('RecentAdsTable', () => {
  it('renders the trimmed column set with computed values', async () => {
    renderTable();
    await screen.findByTestId('table-row');
    expect(screen.getByTestId('cell-trace_id')).toHaveTextContent('AD-1001');
    expect(screen.getByTestId('cell-position')).toHaveTextContent('Pod Details');
    expect(screen.getByTestId('cell-estimated_cost')).toHaveTextContent('₹3,500');
    expect(screen.getByTestId('cell-status')).toHaveTextContent('PENDING');
  });

  it('navigates to the detail page on row click', async () => {
    renderTable();
    fireEvent.click(await screen.findByTestId('table-row'));
    expect(screen.getByText('DETAIL ROUTE')).toBeInTheDocument();
  });
});
