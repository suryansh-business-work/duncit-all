import '../../../__tests__/helpers/agGridEnv';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import ProductListingsTable from './ProductListingsTable';
import { DELETE_LISTING, MY_PRODUCT_LISTINGS_TABLE, SET_LISTING_ACTIVE } from './queries';
import { renderWithProviders } from '../../__tests__/render';

afterEach(cleanup);
beforeEach(() => {
  globalThis.localStorage.clear();
});

/** Every field the table document selects. */
const listing = (over: Record<string, unknown> = {}) => ({
  __typename: 'InventoryProduct',
  id: 'p1',
  product_name: 'Alpha Tee',
  description: 'Soft cotton tee',
  image_url: 'https://cdn.test/alpha.jpg',
  images: ['https://cdn.test/alpha.jpg'],
  size_label: 'M',
  height_cm: 2,
  weight_kg: 0.3,
  length_cm: 30,
  breadth_cm: 25,
  color: 'Blue',
  inventory_count: 9,
  available_count: 9,
  low_stock_alert: 2,
  notify_low_stock: false,
  unit_cost: 499,
  commission_pct: 10,
  delivery_target: 'SHIPROCKET',
  pickup_location_id: 'w1',
  free_delivery_above: null,
  super_category_id: null,
  category_id: null,
  sub_category_id: null,
  categories: [],
  options: [],
  variants: [],
  listing_review_status: 'APPROVED',
  listing_review_notes: '',
  is_duncit_delivery_partner: false,
  status: 'ACTIVE',
  is_active: true,
  updated_at: '2026-07-01T10:00:00',
  ...over,
});

const tableMock = (rows: unknown[]): MockedResponse => ({
  request: {
    query: MY_PRODUCT_LISTINGS_TABLE,
    variables: {
      brand_id: 'b1',
      query: { search: null, page: 1, page_size: 25, sort_by: 'updated_at', sort_dir: 'desc', filters: [] },
    },
  },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: {
    data: { myProductListingsTable: { __typename: 'InventoryProductTablePage', total: rows.length, rows } },
  },
});

const renderTable = (mocks: MockedResponse[]) =>
  renderWithProviders(<ProductListingsTable brandId="b1" canManageProducts onEdit={vi.fn()} />, { mocks });

const openRowMenu = async (productName: string) => {
  const row = (await screen.findByText(productName)).closest('[role="row"]') as HTMLElement;
  fireEvent.click(within(row).getByRole('button', { name: 'Product actions' }));
  return screen.findByRole('menu');
};

describe('ProductListingsTable pause, reactivate and delete guards', () => {
  it('temporarily deactivates an approved listing and reports it', async () => {
    let sent: Record<string, unknown> | null = null;
    renderTable([
      tableMock([listing()]),
      {
        request: { query: SET_LISTING_ACTIVE, variables: { product_doc_id: 'p1', active: false } },
        result: (variables) => {
          sent = variables as Record<string, unknown>;
          return { data: { setMyProductListingActive: { __typename: 'InventoryProduct', id: 'p1', is_active: false } } };
        },
      },
    ]);

    const menu = await openRowMenu('Alpha Tee');
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Temporarily deactivate' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Temporarily deactivate product')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Deactivate' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe('Product visibility updated.');
    expect(within(alert).getByTestId('SuccessOutlinedIcon')).toBeTruthy();
    expect(sent).toEqual({ product_doc_id: 'p1', active: false });
  });

  it('shows a paused listing as PAUSED and offers to reactivate it', async () => {
    renderTable([tableMock([listing({ is_active: false })])]);

    const row = (await screen.findByText('Alpha Tee')).closest('[role="row"]') as HTMLElement;
    expect(within(row).getByText('PAUSED')).toBeTruthy();
    expect(within(row).queryByText('APPROVED')).toBeNull();

    const menu = await openRowMenu('Alpha Tee');
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Reactivate' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Reactivate product')).toBeTruthy();

    // Cancel leaves the listing paused.
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('ignores a Delete click that lands while the cancelled delete dialog is closing', async () => {
    let deleted = false;
    renderTable([
      tableMock([listing()]),
      {
        request: { query: DELETE_LISTING, variables: { product_doc_id: 'p1' } },
        result: () => {
          deleted = true;
          return { data: { deleteMyProductListing: true } };
        },
      },
    ]);

    const menu = await openRowMenu('Alpha Tee');
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: 'Delete' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    fireEvent.click(confirm);

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(deleted).toBe(false);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('only lets an approved, unarchived listing be paused', async () => {
    renderTable([
      tableMock([
        listing({ id: 'p1', product_name: 'Pending Tee', listing_review_status: 'PENDING' }),
        listing({ id: 'p2', product_name: 'Archived Tee', status: 'ARCHIVED' }),
      ]),
    ]);

    let menu = await openRowMenu('Pending Tee');
    expect(within(menu).getByRole('menuitem', { name: 'Temporarily deactivate' }).getAttribute('aria-disabled')).toBe('true');
    fireEvent.keyDown(menu, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());

    menu = await openRowMenu('Archived Tee');
    expect(within(menu).getByRole('menuitem', { name: 'Temporarily deactivate' }).getAttribute('aria-disabled')).toBe('true');
  });
});
