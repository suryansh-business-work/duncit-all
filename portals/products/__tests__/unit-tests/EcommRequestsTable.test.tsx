import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EcommRequestsTable from '../../src/pages/ecomm/EcommRequestsTable';
import type { ProductListingRow } from '../../src/pages/ecomm/requestsQueries';

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@duncit/app-settings', () => ({ useDateFormat: () => ({ formatDate: () => 'D' }) }));
vi.mock('@duncit/ui', () => ({
  StatusChip: ({ status }: { status: string }) => <span>{status}</span>,
}));

const row = (over: Partial<ProductListingRow> = {}): ProductListingRow =>
  ({
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
    created_at: '2026-01-01T00:00:00.000Z',
    ...over,
  }) as ProductListingRow;

describe('EcommRequestsTable', () => {
  it('renders request rows with delivery, inventory and commission', async () => {
    render(
      <EcommRequestsTable
        fetchRows={async () => ({
          rows: [
            row(),
            row({
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
          rows: [row({ id: 'r2', delivery_target: 'VENUE', is_duncit_delivery_partner: false })],
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
        fetchRows={async () => ({ rows: [row()], total: 1 })}
        refetchRef={{ current: null }}
        onReview={onReview}
      />,
    );
    await waitFor(() => expect(screen.getAllByText('Mug').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('button', { name: 'Review' }));
    expect(onReview).toHaveBeenCalledWith(expect.objectContaining({ id: 'r1' }));
  });
});
