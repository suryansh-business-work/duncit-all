import { describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router-dom';
import { screen, fireEvent } from '@testing-library/react';
import MyAdsPage from '../../src/pages/ads/MyAdsPage';
import { makeAdRow } from '../mocks';
import { renderWithProviders } from '../testkit';
import { __setTableRows } from './table-mock';

vi.mock('@duncit/table', () => import('./table-mock'));

const renderPage = () => {
  __setTableRows([makeAdRow()]);
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
  it('renders the header and every column value for a row', async () => {
    renderPage();
    expect(screen.getByText('My Ads')).toBeInTheDocument();
    await screen.findByTestId('table-row');
    expect(screen.getByTestId('cell-trace_id')).toHaveTextContent('AD-1001');
    expect(screen.getByTestId('cell-ad_title')).toHaveTextContent('Weekend Mega Sale');
    expect(screen.getByTestId('cell-position')).toHaveTextContent('Home Bottom');
    expect(screen.getByTestId('cell-ad_type')).toHaveTextContent('Image');
    expect(screen.getByTestId('cell-duration_days')).toHaveTextContent('7');
    expect(screen.getByTestId('cell-estimated_cost')).toHaveTextContent('₹3,500');
    expect(screen.getByTestId('cell-status')).toHaveTextContent('LIVE');
  });

  it('navigates to the detail page on row click', async () => {
    renderPage();
    fireEvent.click(await screen.findByTestId('table-row'));
    expect(screen.getByText('DETAIL ROUTE')).toBeInTheDocument();
  });

  it('navigates to the create page from the New Ad toolbar action', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /new ad/i }));
    expect(screen.getByText('CREATE ROUTE')).toBeInTheDocument();
  });
});
