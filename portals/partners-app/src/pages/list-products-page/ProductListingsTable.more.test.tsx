import '../../../__tests__/helpers/agGridEnv';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import ProductListingsTable from './ProductListingsTable';
import { DELETE_LISTING, MY_PRODUCT_LISTINGS_TABLE, SET_LISTING_ACTIVE } from './queries';
import { MY_CATALOG_DELETION_REQUESTS, WITHDRAW_CATALOG_DELETION } from '../ecomm-brand-page/deletion-request/deletion.queries';
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


/** No deletion request is open for this brand's products. */
const noDeletionRequests: MockedResponse = {
  request: { query: MY_CATALOG_DELETION_REQUESTS, variables: { brand_id: 'b1' } },
  result: { data: { myCatalogDeletionRequests: [] } },
  maxUsageCount: Number.POSITIVE_INFINITY,
};

const renderTable = (mocks: MockedResponse[]) =>
  renderWithProviders(<ProductListingsTable brandId="b1" canManageProducts onEdit={vi.fn()} />, {
    mocks: [...mocks, noDeletionRequests],
  });

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

  // A listing that never went on sale is deleted directly; a live one goes
  // through a deletion request (see DeletionRequestDialog).
  it('ignores a Delete click that lands while the cancelled delete dialog is closing', async () => {
    let deleted = false;
    renderTable([
      tableMock([listing({ listing_review_status: 'PENDING' })]),
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

const openRequest = (over: Record<string, unknown> = {}) => ({
  __typename: 'CatalogDeletionRequest',
  id: 'r1',
  kind: 'PRODUCT',
  brand_id: 'b1',
  product_id: 'p1',
  parent_id: null,
  status: 'PENDING',
  scheduled_for: '2026-11-01',
  blocked_reason: '',
  ...over,
});

const requestsMock = (rows: unknown[]): MockedResponse => ({
  request: { query: MY_CATALOG_DELETION_REQUESTS, variables: { brand_id: 'b1' } },
  result: { data: { myCatalogDeletionRequests: rows } },
  maxUsageCount: Number.POSITIVE_INFINITY,
});

describe('ProductListingsTable deleting a live listing', () => {
  it('opens a deletion request for an approved listing instead of deleting it', async () => {
    renderTable([tableMock([listing()])]);
    const menu = await openRowMenu('Alpha Tee');
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Delete' }));
    expect(await screen.findByText('Delete Alpha Tee')).toBeTruthy();
  });

  it('shows an open deletion request beside the listing status and offers to withdraw it instead of Delete', async () => {
    renderTable([tableMock([listing()]), requestsMock([openRequest()])]);
    const row = (await screen.findByText('Alpha Tee')).closest('[role="row"]') as HTMLElement;
    expect((await within(row).findByTestId('deletion-chip')).textContent).toBe('Deletion pending review');
    const menu = await openRowMenu('Alpha Tee');
    expect(within(menu).queryByRole('menuitem', { name: 'Delete' })).toBeNull();
    expect(within(menu).getByRole('menuitem', { name: 'Withdraw deletion request' }).getAttribute('aria-disabled')).not.toBe('true');
  });

  it('withdraws the request from the row menu and reloads the table and the requests', async () => {
    let withdrawn = false;
    renderTable([
      tableMock([listing()]),
      requestsMock([openRequest()]),
      {
        request: { query: WITHDRAW_CATALOG_DELETION, variables: { id: 'r1' } },
        result: () => {
          withdrawn = true;
          return { data: { withdrawCatalogDeletion: openRequest({ status: 'WITHDRAWN' }) } };
        },
      },
    ]);
    const menu = await openRowMenu('Alpha Tee');
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Withdraw deletion request' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Withdraw deletion request' }));
    await waitFor(() => expect(withdrawn).toBe(true));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('leaves a product whose brand is being deleted to be withdrawn with the brand', async () => {
    renderTable([tableMock([listing()]), requestsMock([openRequest({ id: 'r2', parent_id: 'r9' })])]);
    const menu = await openRowMenu('Alpha Tee');
    expect(within(menu).getByRole('menuitem', { name: 'Withdraw deletion request' }).getAttribute('aria-disabled')).toBe('true');
  });
});
