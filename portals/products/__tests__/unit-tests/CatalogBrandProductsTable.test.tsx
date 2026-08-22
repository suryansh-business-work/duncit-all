import { describe, expect, it, vi } from 'vitest';
import { createRef } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CatalogBrandProductsTable from '../../src/pages/catalog-brands/CatalogBrandProductsTable';
import type { CatalogBrandProductRow } from '../../src/pages/catalog-brands/queries';

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDate: () => '01 Jan 2026' }),
}));

const makeRow = (over: Partial<CatalogBrandProductRow> = {}): CatalogBrandProductRow => ({
  id: 'p1',
  product_name: 'Cold Brew',
  sku: 'CB1',
  image_url: 'https://cdn/p1.png',
  unit_cost: 40,
  selling_price: 100,
  inventory_count: 8,
  available_count: 4,
  listing_review_status: 'PENDING',
  commission_pct: 12,
  status: 'ACTIVE',
  is_active: true,
  created_at: '2026-01-01T00:00:00.000Z',
  ...over,
});

const archivedRow = makeRow({
  id: 'p2',
  product_name: '',
  sku: 'CB2',
  image_url: null,
  selling_price: null,
  available_count: 0,
  listing_review_status: 'DENIED',
  status: 'ARCHIVED',
  is_active: false,
  created_at: null,
});

const renderTable = (rows: CatalogBrandProductRow[]) => {
  const handlers = { onEdit: vi.fn(), onLifecycle: vi.fn(), onDuplicate: vi.fn() };
  const fetchRows = async () => ({ rows, total: rows.length });
  render(
    <CatalogBrandProductsTable
      fetchRows={fetchRows as never}
      refetchRef={createRef<(() => void) | null>() as never}
      onEdit={handlers.onEdit}
      onLifecycle={handlers.onLifecycle}
      onDuplicate={handlers.onDuplicate}
    />,
  );
  return handlers;
};

describe('CatalogBrandProductsTable', () => {
  it('shows every product of the brand, review status included', async () => {
    renderTable([makeRow(), archivedRow]);
    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(2));
    expect(screen.getByText('Listing review')).toBeInTheDocument();
    expect(screen.getByText('Commission')).toBeInTheDocument();
    expect(screen.getAllByText('PENDING').length).toBeGreaterThan(0);
    expect(screen.getAllByText('DENIED').length).toBeGreaterThan(0);
    expect(screen.getAllByText('12%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Inactive').length).toBeGreaterThan(0);
    // Archived rows keep their fallbacks: no image, no selling price, no date.
    expect(screen.getByText('?')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('01 Jan 2026')).toBeInTheDocument();
  });

  it('offers Archive on an active product and Restore on an archived one', async () => {
    const handlers = renderTable([makeRow(), archivedRow]);
    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(2));
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    expect(handlers.onLifecycle).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
    expect(handlers.onLifecycle).toHaveBeenCalledWith(expect.objectContaining({ id: 'p2' }));
    // stopPropagation keeps the row-click editor from opening behind the action.
    expect(handlers.onEdit).not.toHaveBeenCalled();
  });

  it('duplicates without opening the editor, and edits on demand', async () => {
    const handlers = renderTable([makeRow()]);
    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(1));
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));
    expect(handlers.onDuplicate).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));
    expect(handlers.onEdit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(handlers.onEdit).toHaveBeenCalledTimes(1);
  });

  it('opens the editor when the row itself is clicked', async () => {
    const handlers = renderTable([makeRow()]);
    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(1));
    fireEvent.click(screen.getAllByTestId('table-row')[0]);
    expect(handlers.onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));
  });

  it('tells the admin when the brand has no products at all', async () => {
    renderTable([]);
    await waitFor(() =>
      expect(screen.getByText('This brand has no products yet.')).toBeInTheDocument(),
    );
  });
});
