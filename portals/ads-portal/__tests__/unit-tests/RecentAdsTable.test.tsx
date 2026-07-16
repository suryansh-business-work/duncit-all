import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router-dom';
import { screen, fireEvent } from '@testing-library/react';
import RecentAdsTable from '../../src/pages/dashboard/RecentAdsTable';
import { adRow } from './fixtures';
import { renderWithProviders } from './testkit';

const tableRow = vi.hoisted(() => ({ value: null as any }));

vi.mock('@apollo/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client')>()),
  useApolloClient: () => ({}),
}));

vi.mock('@duncit/table', () => ({
  useApolloTableFetch: () => vi.fn(async () => ({ rows: [], total: 0 })),
  dateColumn: (cfg: Record<string, unknown>) => ({ ...cfg, field: cfg.field ?? cfg.headerName }),
  DuncitTable: (props: Record<string, any>) => {
    const row = tableRow.value;
    return (
      <div data-testid="table">
        <button data-testid="rowclick" onClick={() => props.onRowClick(row)}>
          row {props.getRowId(row)}
        </button>
        {props.columns.map((col: Record<string, any>) => (
          <div key={col.field ?? col.headerName} data-testid={`col-${col.field ?? col.headerName}`}>
            {col.valueGetter ? String(col.valueGetter(row)) : ''}
            {col.cellRenderer ? (col.cellRenderer(row) as ReactNode) : null}
          </div>
        ))}
      </div>
    );
  },
}));

const renderTable = () => {
  tableRow.value = adRow({ position: 'POD_DETAILS', status: 'PENDING' });
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
  it('renders the trimmed column set with computed values', () => {
    renderTable();
    expect(screen.getByTestId('col-trace_id')).toHaveTextContent('AD-1001');
    expect(screen.getByTestId('col-position')).toHaveTextContent('Pod Details');
    expect(screen.getByTestId('col-estimated_cost')).toHaveTextContent('₹3,500');
    expect(screen.getByTestId('col-status')).toHaveTextContent('PENDING');
  });

  it('navigates to the detail page on row click', () => {
    renderTable();
    expect(screen.getByRole('button', { name: /row ad1/i })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('rowclick'));
    expect(screen.getByText('DETAIL ROUTE')).toBeInTheDocument();
  });
});
