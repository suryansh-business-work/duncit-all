import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import EcommRequestsPage from '../../src/pages/ecomm/EcommRequestsPage';
import { renderWithProviders } from '../testkit';
import { makeProductListingRow, reviewProductListingMock } from '../mocks/productListing.mock';
import { __setTableRows } from './table-mock';

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@duncit/app-settings', () => ({ useDateFormat: () => ({ formatDate: () => 'D' }) }));
vi.mock('@duncit/ui', () => ({ StatusChip: ({ status }: { status: string }) => <span>{status}</span> }));

describe('EcommRequestsPage', () => {
  it('renders the header, status tabs and opens the review dialog', async () => {
    __setTableRows([makeProductListingRow({ created_at: null })]);
    renderWithProviders(<EcommRequestsPage />);
    expect(screen.getByText('Ecomm Requests')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'APPROVED' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Review' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Review' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Review/)).toBeInTheDocument();
    // Cancelling runs the page's dialog onClose handler.
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shows a success message and reloads after a review', async () => {
    __setTableRows([makeProductListingRow({ created_at: null })]);
    renderWithProviders(<EcommRequestsPage />, { mocks: [reviewProductListingMock({ status: 'APPROVED' })] });
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
