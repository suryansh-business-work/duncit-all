import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CatalogBrandsTable from '../../src/pages/catalog-brands/CatalogBrandsTable';
import type { CatalogBrandRow } from '../../src/pages/catalog-brands/queries';

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDate: (v: unknown) => (v ? 'D' : '') }),
}));
vi.mock('@duncit/ui', () => ({
  StatusChip: ({ status }: { status: string }) => <span>{status}</span>,
}));

const makeRow = (over: Partial<CatalogBrandRow> = {}): CatalogBrandRow => ({
  id: 'b1',
  brand_no: 'BRD-000001',
  brand_name: 'Acme',
  logo_url: '',
  contact_person: 'Asha',
  contact_email: 'sales@acme.com',
  contact_phone: '9990001111',
  city: 'Pune',
  state: 'MH',
  status: 'APPROVED',
  is_active: true,
  approved_product_count: 5,
  product_commission_pct: 10,
  created_at: '2026-01-01T00:00:00.000Z',
  ...over,
});

const fetchOf = (rows: CatalogBrandRow[]) => async () => ({ rows, total: rows.length });

const renderTable = (rows: CatalogBrandRow[]) => {
  const onProducts = vi.fn();
  const onManage = vi.fn();
  render(
    <CatalogBrandsTable fetchRows={fetchOf(rows)} onProducts={onProducts} onManage={onManage} />,
  );
  return { onProducts, onManage };
};

describe('CatalogBrandsTable', () => {
  it('renders logo, contact, location, commission, status, active and created cells', async () => {
    renderTable([
      makeRow(),
      makeRow({ id: 'b2', contact_person: '' }),
      makeRow({ id: 'b3', contact_person: '', contact_email: '' }),
      makeRow({
        id: 'b4',
        brand_name: '',
        logo_url: 'http://img/logo.png',
        contact_person: '',
        contact_email: '',
        contact_phone: '',
        city: '',
        state: '',
        product_commission_pct: 0,
        is_active: false,
        created_at: null,
      }),
    ]);

    await waitFor(() => expect(screen.getAllByText('Asha').length).toBeGreaterThan(0));
    expect(screen.getAllByText('sales@acme.com').length).toBeGreaterThan(0);
    expect(screen.getAllByText('9990001111').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pune, MH').length).toBeGreaterThan(0);
    expect(screen.getAllByText('10%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Inherited').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Inactive').length).toBeGreaterThan(0);
    expect(screen.getAllByText('APPROVED').length).toBeGreaterThan(0);
    expect(screen.getAllByText('D').length).toBeGreaterThan(0);
    // Missing contact and missing city/state both fall back to a dash.
    expect(screen.getAllByText('—').length).toBeGreaterThan(1);
  });

  it('opens the brand products list without triggering the row click', async () => {
    const { onProducts, onManage } = renderTable([makeRow()]);
    await waitFor(() => expect(screen.getAllByText('Acme').length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole('button', { name: 'Products' }));

    expect(onProducts).toHaveBeenCalledWith(expect.objectContaining({ id: 'b1' }));
    expect(onManage).not.toHaveBeenCalled();
  });

  it('opens Manage exactly once from the action button (click does not bubble)', async () => {
    const { onProducts, onManage } = renderTable([makeRow()]);
    await waitFor(() => expect(screen.getAllByText('Acme').length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole('button', { name: 'Manage' }));

    expect(onManage).toHaveBeenCalledTimes(1);
    expect(onManage).toHaveBeenCalledWith(expect.objectContaining({ id: 'b1' }));
    expect(onProducts).not.toHaveBeenCalled();
  });

  it('opens Manage when the row itself is clicked', async () => {
    const { onManage } = renderTable([makeRow()]);
    await waitFor(() => expect(screen.getAllByText('Acme').length).toBeGreaterThan(0));

    fireEvent.click(screen.getAllByText('Acme')[0]);

    expect(onManage).toHaveBeenCalledWith(expect.objectContaining({ id: 'b1' }));
  });

  it('shows the empty-state copy when the brand list is empty', async () => {
    renderTable([]);
    await waitFor(() =>
      expect(screen.getByText('No brands found for this filter.')).toBeInTheDocument(),
    );
  });
});
