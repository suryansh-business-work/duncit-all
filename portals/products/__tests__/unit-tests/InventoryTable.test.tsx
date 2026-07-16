import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InventoryTable from '../../src/pages/inventory-page/InventoryTable';
import { makeInventoryProductRow } from '../mocks/inventory.mock';
import type { InventoryProductRow } from '../../src/pages/inventory-page/queries';

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@duncit/app-settings', () => ({
  useDateFormat: () => ({ formatDate: (v: unknown) => (v ? 'D' : '') }),
}));
vi.mock('@duncit/ui', () => ({
  StatusChip: ({ status }: { status: string }) => <span>{status}</span>,
}));

const renderTable = (rows: InventoryProductRow[] = [makeInventoryProductRow()]) => {
  const props = {
    fetchRows: async () => ({ rows, total: rows.length }),
    refetchRef: { current: null },
    onEdit: vi.fn(),
    onArchive: vi.fn(),
    onDelete: vi.fn(),
  };
  render(<InventoryTable {...props} />);
  return props;
};

describe('InventoryTable', () => {
  it('renders product, price, stock and status cells', async () => {
    renderTable([
      makeInventoryProductRow(),
      // Second row exercises the avatar image branch + the empty-name initial.
      makeInventoryProductRow({ id: 'i3', image_url: 'http://img/x.png', product_name: '' }),
    ]);
    await waitFor(() => expect(screen.getAllByText('Cold Brew').length).toBeGreaterThan(0));
    expect(screen.getAllByText('Duncit').length).toBeGreaterThan(0);
    // Low stock chip from StockColorChip (inventory 3 <= alert 5).
    expect(screen.getAllByText('Low stock (3)').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ACTIVE').length).toBeGreaterThan(0);
  });

  it('falls back to the unit cost and a dash date when fields are missing', async () => {
    renderTable([
      makeInventoryProductRow({
        id: 'i2',
        selling_price: 0,
        brand_name: '',
        created_at: null,
        low_stock_alert: null,
      }),
    ]);
    await waitFor(() => expect(screen.getAllByText('Cold Brew').length).toBeGreaterThan(0));
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('wires the row actions', async () => {
    const props = renderTable();
    await waitFor(() => expect(screen.getAllByText('Cold Brew').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }));
    expect(props.onEdit).toHaveBeenCalled();
    expect(props.onArchive).toHaveBeenCalled();
    expect(props.onDelete).toHaveBeenCalled();
  });

  it('opens the editor when a row is clicked', async () => {
    const props = renderTable();
    await waitFor(() => expect(screen.getAllByText('Cold Brew').length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByText('Cold Brew')[0]);
    expect(props.onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'i1' }));
  });
});
