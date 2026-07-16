import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EcommRequestsTable from '../../src/pages/ecomm/EcommRequestsTable';
import { makeProductListingRow } from '../mocks/productListing.mock';

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@duncit/app-settings', () => ({ useDateFormat: () => ({ formatDate: () => 'D' }) }));
vi.mock('@duncit/ui', () => ({
  StatusChip: ({ status }: { status: string }) => <span>{status}</span>,
}));

describe('EcommRequestsTable', () => {
  it('renders request rows with delivery, inventory and commission', async () => {
    render(
      <EcommRequestsTable
        fetchRows={async () => ({
          rows: [
            makeProductListingRow(),
            makeProductListingRow({
              id: 'r3',
              image_url: 'http://img/m.png',
              product_name: '',
              listing_submitted_by_name: '',
            }),
          ],
          total: 2,
        })}
        refetchRef={{ current: null }}
        onReview={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getAllByText('Mug').length).toBeGreaterThan(0));
    expect(screen.getByText(/Ravi · L · Blue/)).toBeInTheDocument();
    expect(screen.getAllByText('Host delivery').length).toBeGreaterThan(0);
    expect(screen.getAllByText('30 units · ₹200').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Delivery partner').length).toBeGreaterThan(0);
  });

  it('renders venue delivery and the non-partner caption', async () => {
    render(
      <EcommRequestsTable
        fetchRows={async () => ({
          rows: [
            makeProductListingRow({
              id: 'r2',
              delivery_target: 'VENUE',
              is_duncit_delivery_partner: false,
            }),
          ],
          total: 1,
        })}
        refetchRef={{ current: null }}
        onReview={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getAllByText('Venue delivery').length).toBeGreaterThan(0));
    expect(screen.getByText('Not delivery partner')).toBeInTheDocument();
  });

  it('calls onReview from the row Review button', async () => {
    const onReview = vi.fn();
    render(
      <EcommRequestsTable
        fetchRows={async () => ({ rows: [makeProductListingRow()], total: 1 })}
        refetchRef={{ current: null }}
        onReview={onReview}
      />,
    );
    await waitFor(() => expect(screen.getAllByText('Mug').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('button', { name: 'Review' }));
    expect(onReview).toHaveBeenCalledWith(expect.objectContaining({ id: 'r1' }));
  });
});
