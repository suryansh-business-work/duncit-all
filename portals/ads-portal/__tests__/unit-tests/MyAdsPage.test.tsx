import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router-dom';
import { screen, fireEvent } from '@testing-library/react';
import MyAdsPage from '../../src/pages/ads/MyAdsPage';
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
        {props.toolbarActions}
        <span data-testid="rowid">{props.getRowId(row)}</span>
        <button data-testid="rowclick" onClick={() => props.onRowClick(row)}>
          row
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

const renderPage = () => {
  tableRow.value = adRow();
  return renderWithProviders(<></>, {
    initialEntries: ['/ads'],
    routes: (
      <>
        <Route path="/ads" element={<MyAdsPage />} />
        <Route path="/ads/new" element={<div>CREATE ROUTE</div>} />
        <Route path="/ads/:id" element={<div>DETAIL ROUTE</div>} />
      </>
    ),
  });
};

describe('MyAdsPage', () => {
  it('renders the header and every column value for a row', () => {
    renderPage();
    expect(screen.getByText('My Ads')).toBeInTheDocument();
    expect(screen.getByTestId('rowid')).toHaveTextContent('ad1');
    expect(screen.getByTestId('col-trace_id')).toHaveTextContent('AD-1001');
    expect(screen.getByTestId('col-ad_title')).toHaveTextContent('Weekend Mega Sale');
    expect(screen.getByTestId('col-position')).toHaveTextContent('Home Bottom');
    expect(screen.getByTestId('col-ad_type')).toHaveTextContent('Image');
    expect(screen.getByTestId('col-duration_days')).toHaveTextContent('7');
    expect(screen.getByTestId('col-estimated_cost')).toHaveTextContent('₹3,500');
    expect(screen.getByTestId('col-status')).toHaveTextContent('LIVE');
  });

  it('navigates to the detail page on row click', () => {
    renderPage();
    fireEvent.click(screen.getByTestId('rowclick'));
    expect(screen.getByText('DETAIL ROUTE')).toBeInTheDocument();
  });

  it('navigates to the create page from the New Ad toolbar action', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /new ad/i }));
    expect(screen.getByText('CREATE ROUTE')).toBeInTheDocument();
  });
});
