import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EcommBrandsTable from '../../src/pages/ecomm/EcommBrandsTable';
import type { EcommBrandRow } from '../../src/pages/ecomm/queries';

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@duncit/app-settings', () => ({
  useDateFormat: () => ({ formatDate: (v: unknown) => (v ? 'D' : '') }),
}));
vi.mock('@duncit/ui', () => ({
  StatusChip: ({ status }: { status: string }) => <span>{status}</span>,
}));

const row = (over: Partial<EcommBrandRow> = {}): EcommBrandRow =>
  ({
    id: 'b1',
    brand_name: 'Acme',
    logo_url: '',
    status: 'APPROVED',
    approved_product_count: 7,
    default_pickup_location_id: 'loc1',
    city: 'Pune',
    state: 'MH',
    contact_email: 'sales@acme.com',
    contact_phone: '',
    created_at: '2026-01-01T00:00:00.000Z',
    ...over,
  }) as EcommBrandRow;

describe('EcommBrandsTable', () => {
  it('renders brand, contact, location and pickup-registered cells', async () => {
    render(
      <EcommBrandsTable
        fetchRows={async () => ({
          rows: [row(), row({ id: 'b3', logo_url: 'http://img/l.png', brand_name: '' } as any)],
          total: 2,
        })}
        refetchRef={{ current: null }}
        onView={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getAllByText('Acme').length).toBeGreaterThan(0));
    expect(screen.getAllByText('sales@acme.com').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pune, MH').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Registered').length).toBeGreaterThan(0);
  });

  it('shows the "No default" pickup and a location dash when unset', async () => {
    render(
      <EcommBrandsTable
        fetchRows={async () => ({
          rows: [
            row({
              id: 'b2',
              default_pickup_location_id: null,
              city: '',
              state: '',
              contact_email: '',
              contact_phone: '',
            } as any),
          ],
          total: 1,
        })}
        refetchRef={{ current: null }}
        onView={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getAllByText('No default').length).toBeGreaterThan(0));
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('opens a brand on row click', async () => {
    const onView = vi.fn();
    render(
      <EcommBrandsTable
        fetchRows={async () => ({ rows: [row()], total: 1 })}
        refetchRef={{ current: null }}
        onView={onView}
      />,
    );
    await waitFor(() => expect(screen.getAllByText('Acme').length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByText('Acme')[0]);
    expect(onView).toHaveBeenCalledWith(expect.objectContaining({ id: 'b1' }));
  });
});
