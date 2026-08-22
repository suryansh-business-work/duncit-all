import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BrandsReviewTable from '../../src/pages/ecomm/BrandsReviewTable';
import { makeEcommBrandRow } from '../mocks/ecommBrand.mock';

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDate: (v: unknown) => (v ? 'D' : '') }),
}));
vi.mock('@duncit/ui', () => ({
  StatusChip: ({ status }: { status: string }) => <span>{status}</span>,
}));

describe('BrandsReviewTable', () => {
  it('renders brand, contact, location and pickup-registered cells', async () => {
    render(
      <BrandsReviewTable
        fetchRows={async () => ({
          rows: [
            makeEcommBrandRow(),
            makeEcommBrandRow({ id: 'b3', logo_url: 'http://img/l.png', brand_name: '' }),
          ],
          total: 2,
        })}
        refetchRef={{ current: null }}
        onView={vi.fn()}
        onReview={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getAllByText('Acme').length).toBeGreaterThan(0));
    expect(screen.getAllByText('sales@acme.com').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pune, MH').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Registered').length).toBeGreaterThan(0);
  });

  it('shows the "No default" pickup and a location dash when unset', async () => {
    render(
      <BrandsReviewTable
        fetchRows={async () => ({
          rows: [
            makeEcommBrandRow({
              id: 'b2',
              default_pickup_location_id: null,
              city: '',
              state: '',
              contact_email: '',
              contact_phone: '',
              submitted_at: null,
              created_at: null,
            }),
          ],
          total: 1,
        })}
        refetchRef={{ current: null }}
        onView={vi.fn()}
        onReview={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getAllByText('No default').length).toBeGreaterThan(0));
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('opens a brand on row click', async () => {
    const onView = vi.fn();
    render(
      <BrandsReviewTable
        fetchRows={async () => ({ rows: [makeEcommBrandRow()], total: 1 })}
        refetchRef={{ current: null }}
        onView={onView}
        onReview={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getAllByText('Acme').length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByText('Acme')[0]);
    expect(onView).toHaveBeenCalledWith(expect.objectContaining({ id: 'b1' }));
  });

  it('reviews from the row action without opening the brand', async () => {
    const onView = vi.fn();
    const onReview = vi.fn();
    render(
      <BrandsReviewTable
        fetchRows={async () => ({ rows: [makeEcommBrandRow()], total: 1 })}
        refetchRef={{ current: null }}
        onView={onView}
        onReview={onReview}
      />,
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Review' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Review' }));
    expect(onReview).toHaveBeenCalledWith(expect.objectContaining({ id: 'b1' }));
    expect(onView).not.toHaveBeenCalled();
  });
});
