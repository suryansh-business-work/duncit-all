import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { __setTableRows } from './table-mock';
import type { CatalogBrandProductRow } from '../../src/pages/catalog-brands/queries';

const nav = vi.hoisted(() => ({ fn: vi.fn() }));
const m = vi.hoisted(() => ({
  query: { data: undefined as unknown, loading: false },
  archive: vi.fn(),
  archiveState: { loading: false },
  restore: vi.fn(),
  restoreState: { loading: false },
  duplicate: vi.fn(),
}));

vi.mock('react-router-dom', async (io) => ({
  ...(await io<typeof import('react-router-dom')>()),
  useNavigate: () => nav.fn,
}));

vi.mock('@apollo/client', async (io) => {
  const actual = await io<typeof import('@apollo/client')>();
  return {
    ...actual,
    useApolloClient: () => ({}),
    useQuery: () => m.query,
    useMutation: (doc: any) => {
      const name = doc?.definitions?.[0]?.name?.value;
      if (name === 'ArchiveInventoryProduct') return [m.archive, m.archiveState];
      if (name === 'RestoreInventoryProduct') return [m.restore, m.restoreState];
      return [m.duplicate, { loading: false }];
    },
  };
});

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@duncit/app-settings', () => ({
  useDateFormat: () => ({ formatDate: () => '01 Jan 2026' }),
}));
vi.mock('@duncit/dialogs', async (io) => ({
  ...(await io<typeof import('@duncit/dialogs')>()),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));

import CatalogBrandProductsPage from '../../src/pages/catalog-brands/CatalogBrandProductsPage';

const makeRow = (over: Partial<CatalogBrandProductRow> = {}): CatalogBrandProductRow => ({
  id: 'p1',
  product_name: 'Cold Brew',
  sku: 'CB1',
  image_url: null,
  unit_cost: 40,
  selling_price: 100,
  inventory_count: 8,
  available_count: 4,
  listing_review_status: 'PENDING',
  commission_pct: 12,
  status: 'ACTIVE',
  is_active: true,
  created_at: null,
  ...over,
});

const brand = { __typename: 'EcommBrand', id: 'b1', brand_name: 'Acme Attire' };

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/catalog/brands/b1/products']}>
      <Routes>
        <Route path="/catalog/brands/:brandId/products" element={<CatalogBrandProductsPage />} />
      </Routes>
    </MemoryRouter>,
  );

const rowsReady = () => waitFor(() => expect(screen.getAllByTestId('table-row').length).toBe(1));

beforeEach(() => {
  __setTableRows([makeRow()]);
  m.query = { data: { ecommBrand: brand }, loading: false };
  m.archive = vi.fn().mockResolvedValue({});
  m.archiveState = { loading: false };
  m.restore = vi.fn().mockResolvedValue({});
  m.restoreState = { loading: false };
  m.duplicate = vi.fn().mockResolvedValue({ data: { duplicateInventoryProduct: { id: 'p9' } } });
  nav.fn = vi.fn();
  vi.mocked(notifySuccess).mockClear();
  vi.mocked(notifyError).mockClear();
});

describe('CatalogBrandProductsPage', () => {
  it('names the brand, links back to Manage and opens the shared editor', async () => {
    renderPage();
    expect(screen.getByText('Acme Attire')).toBeInTheDocument();
    expect(screen.getByText(/still awaiting review/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /manage brand/i })).toHaveAttribute(
      'href',
      '/catalog/brands/b1',
    );
    await rowsReady();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(nav.fn).toHaveBeenCalledWith('/catalog/brands/b1/products/p1/edit');
  });

  it('warns when the brand id in the URL matches nothing', () => {
    m.query = { data: { ecommBrand: null }, loading: false };
    renderPage();
    expect(screen.getByText(/Brand not found/i)).toBeInTheDocument();
    expect(screen.getByText('Brand products')).toBeInTheDocument();
  });

  it('stays quiet while the brand is still loading', () => {
    m.query = { data: undefined, loading: true };
    renderPage();
    expect(screen.queryByText(/Brand not found/i)).not.toBeInTheDocument();
  });

  it('archives a product after confirmation and refreshes the table', async () => {
    renderPage();
    await rowsReady();
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Archive product?')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Archive' }));
    await waitFor(() => expect(m.archive).toHaveBeenCalledWith({ variables: { id: 'p1' } }));
    expect(notifySuccess).toHaveBeenCalledWith('Product archived');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('restores an archived product after confirmation', async () => {
    __setTableRows([makeRow({ status: 'ARCHIVED', is_active: false })]);
    renderPage();
    await rowsReady();
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Restore product?')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(m.restore).toHaveBeenCalledWith({ variables: { id: 'p1' } }));
    expect(notifySuccess).toHaveBeenCalledWith('Product restored');
  });

  it('surfaces a failed archive', async () => {
    m.archive = vi.fn().mockRejectedValue(new Error('product is linked to a live pod'));
    renderPage();
    await rowsReady();
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Archive' }));
    await waitFor(() =>
      expect(notifyError).toHaveBeenCalledWith('product is linked to a live pod'),
    );
  });

  it('closes the confirmation without changing anything', async () => {
    renderPage();
    await rowsReady();
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(m.archive).not.toHaveBeenCalled();
  });

  it('disables the confirmation while the mutation is in flight', async () => {
    m.restoreState = { loading: true };
    renderPage();
    await rowsReady();
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    expect(await screen.findByRole('button', { name: 'Working…' })).toBeDisabled();
  });

  it('duplicates a product and opens the copy in the brand editor', async () => {
    renderPage();
    await rowsReady();
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));
    await waitFor(() => expect(m.duplicate).toHaveBeenCalledWith({ variables: { id: 'p1' } }));
    expect(notifySuccess).toHaveBeenCalledWith('Product duplicated as a draft copy');
    expect(nav.fn).toHaveBeenCalledWith('/catalog/brands/b1/products/p9/edit');
  });

  it('stays on the list when the duplicate returns no id', async () => {
    m.duplicate = vi.fn().mockResolvedValue({});
    renderPage();
    await rowsReady();
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalled());
    expect(nav.fn).not.toHaveBeenCalled();
  });

  it('surfaces a failed duplicate', async () => {
    m.duplicate = vi.fn().mockRejectedValue(new Error('SKU already exists'));
    renderPage();
    await rowsReady();
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('SKU already exists'));
  });
});
