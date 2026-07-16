import { describe, expect, it, vi } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import InventoryPage from '../../src/pages/inventory-page/InventoryPage';
import {
  ARCHIVE_INVENTORY_PRODUCT,
  INVENTORY_LINKED_PODS,
} from '../../src/pages/inventory-page/inventory-product-page/productQueries';
import { renderWithProviders } from './testkit';
import { __setTableRows } from './table-mock';

const nav = vi.hoisted(() => ({ fn: vi.fn() }));
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => nav.fn,
}));
vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@duncit/app-settings', () => ({
  useDateFormat: () => ({ formatDate: (v: unknown) => (v ? 'D' : '') }),
}));
vi.mock('@duncit/ui', () => ({
  StatusChip: ({ status }: { status: string }) => <span>{status}</span>,
}));

const seedRow = {
  id: 'i1',
  product_name: 'Cold Brew',
  brand_name: 'Duncit',
  sku: 'CB-1',
  selling_price: 120,
  unit_cost: 90,
  inventory_count: 3,
  low_stock_alert: 5,
  available_count: 2,
  status: 'ACTIVE',
  image_url: '',
  created_at: null,
};

describe('InventoryPage', () => {
  it('renders the heading and adds a product via the toolbar', () => {
    __setTableRows([]);
    renderWithProviders(<InventoryPage />);
    expect(screen.getByText('Duncit Products')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Add product/i }));
    expect(nav.fn).toHaveBeenCalledWith('/inventory/new');
  });

  it('navigates to the editor when a product row is clicked', async () => {
    __setTableRows([seedRow]);
    renderWithProviders(<InventoryPage />);
    await waitFor(() => expect(screen.getAllByText('Cold Brew').length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByText('Cold Brew')[0]);
    expect(nav.fn).toHaveBeenCalledWith('/inventory/i1/edit');
  });

  it('opens the archive confirmation dialog from a row action', async () => {
    __setTableRows([seedRow]);
    renderWithProviders(<InventoryPage />);
    await waitFor(() => expect(screen.getAllByText('Cold Brew').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Archive product?')).toBeInTheDocument();
  });

  it('opens the delete dialog and cancels it', async () => {
    __setTableRows([seedRow]);
    const linkedPods: MockedResponse = {
      request: { query: INVENTORY_LINKED_PODS, variables: { id: 'i1' } },
      result: { data: { inventoryProductLinkedPods: [] } },
    };
    renderWithProviders(<InventoryPage />, { mocks: [linkedPods] } as any);
    await waitFor(() => expect(screen.getAllByText('Cold Brew').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Permanently delete product?')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('completes an archive and refreshes the table', async () => {
    __setTableRows([seedRow]);
    const archiveOk: MockedResponse = {
      request: { query: ARCHIVE_INVENTORY_PRODUCT, variables: { id: 'i1' } },
      result: { data: { archiveInventoryProduct: { id: 'i1', status: 'ARCHIVED', is_active: false } } },
    };
    renderWithProviders(<InventoryPage />, { mocks: [archiveOk] } as any);
    await waitFor(() => expect(screen.getAllByText('Cold Brew').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Archive' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
