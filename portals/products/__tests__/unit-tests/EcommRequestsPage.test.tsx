import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import EcommRequestsPage from '../../src/pages/ecomm/EcommRequestsPage';
import { REVIEW_PRODUCT_LISTING } from '../../src/pages/ecomm/requestsQueries';
import { renderWithProviders } from './testkit';
import { __setTableRows } from './table-mock';

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@duncit/app-settings', () => ({ useDateFormat: () => ({ formatDate: () => 'D' }) }));
vi.mock('@duncit/ui', () => ({ StatusChip: ({ status }: { status: string }) => <span>{status}</span> }));

const listingRow = {
  id: 'r1',
  product_name: 'Mug',
  image_url: '',
  inventory_count: 30,
  unit_cost: 200,
  commission_pct: 15,
  delivery_target: 'HOST',
  listing_review_status: 'PENDING',
  listing_submitted_by_name: 'Ravi',
  is_duncit_delivery_partner: true,
  size_label: 'L',
  height_cm: 10,
  weight_kg: 1,
  color: 'Blue',
  created_at: null,
};

describe('EcommRequestsPage', () => {
  it('renders the header, status tabs and opens the review dialog', async () => {
    __setTableRows([listingRow]);
    renderWithProviders(<EcommRequestsPage />);
    expect(screen.getByText('Ecomm Requests')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'APPROVED' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Review' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Review' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Review/)).toBeInTheDocument();
  });

  it('shows a success message and reloads after a review', async () => {
    __setTableRows([listingRow]);
    const reviewMock: MockedResponse = {
      request: { query: REVIEW_PRODUCT_LISTING },
      variableMatcher: () => true,
      result: { data: { reviewProductListing: { id: 'r1', listing_review_status: 'APPROVED' } } },
    };
    renderWithProviders(<EcommRequestsPage />, { mocks: [reviewMock] });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Review' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Review' }));
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    const successText = await screen.findByText(/Product approved for pod selection/i);
    // The success Alert's close button lives in the alert's action slot.
    const closeBtn = successText.closest('.MuiAlert-root')?.querySelector('button');
    fireEvent.click(closeBtn as HTMLElement);
    await waitFor(() =>
      expect(screen.queryByText(/Product approved for pod selection/i)).not.toBeInTheDocument(),
    );
  });

  it('switches the status filter tab', async () => {
    __setTableRows([]);
    renderWithProviders(<EcommRequestsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'APPROVED' }));
    // The APPROVED toggle becomes selected.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'APPROVED' })).toHaveClass('Mui-selected'),
    );
    // The ALL tab exercises the empty extra-filters branch.
    fireEvent.click(screen.getByRole('button', { name: 'ALL' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'ALL' })).toHaveClass('Mui-selected'),
    );
  });
});
