import '../../../__tests__/helpers/agGridEnv';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { gql } from '@apollo/client';
import { GraphQLError } from 'graphql';
import ProductListingsTable from './ProductListingsTable';
import {
  DELETE_LISTING,
  MY_PRODUCT_LISTINGS_TABLE,
  UPDATE_QUANTITY,
  type ProductListingRow,
} from './queries';

afterEach(cleanup);
beforeEach(() => {
  globalThis.localStorage.clear();
});

/** Every field the table document selects — a partial row is dropped by the cache. */
const listing = (over: Partial<Record<string, unknown>> = {}) => ({
  __typename: 'ProductListing',
  id: 'p1',
  product_name: 'Alpha Tee',
  description: 'Soft cotton tee',
  image_url: 'https://cdn.test/alpha.jpg',
  images: ['https://cdn.test/alpha.jpg', 'https://cdn.test/alpha-2.jpg'],
  size_label: 'M',
  height_cm: null,
  weight_kg: null,
  length_cm: null,
  breadth_cm: null,
  color: 'Blue',
  inventory_count: 9,
  available_count: 9,
  low_stock_alert: 2,
  notify_low_stock: false,
  unit_cost: 499,
  commission_pct: 10,
  delivery_target: 'HOST',
  pickup_location_id: null,
  free_delivery_above: null,
  super_category_id: null,
  category_id: null,
  sub_category_id: null,
  categories: [],
  options: [],
  variants: [],
  listing_review_status: 'APPROVED',
  listing_review_notes: null,
  is_duncit_delivery_partner: false,
  updated_at: '2026-07-01T10:00:00',
  ...over,
});

// tableQueryToGql() of the table's initial state (defaultSort updated_at desc)
// plus the brand_id extra variable.
const tableVariables = {
  brand_id: 'b1',
  query: {
    search: null,
    page: 1,
    page_size: 25,
    sort_by: 'updated_at',
    sort_dir: 'desc',
    filters: [],
  },
};

const tableMock = (rows: unknown[]): MockedResponse => ({
  request: { query: MY_PRODUCT_LISTINGS_TABLE, variables: tableVariables },
  result: {
    data: {
      myProductListingsTable: {
        __typename: 'ProductListingTablePage',
        total: rows.length,
        rows,
      },
    },
  },
});

interface Handlers {
  onEdit?: (product: ProductListingRow) => void;
  onView?: (product: ProductListingRow) => void;
  onSettings?: (product: ProductListingRow) => void;
  canManageProducts?: boolean;
}

const renderTable = (mocks: MockedResponse[], handlers: Handlers = {}) => {
  const { onEdit = vi.fn(), canManageProducts = true, ...rest } = handlers;
  return render(
    <MockedProvider mocks={mocks}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <ProductListingsTable
          brandId="b1"
          canManageProducts={canManageProducts}
          onEdit={onEdit}
          {...rest}
        />
      </LocalizationProvider>
    </MockedProvider>,
  );
};

// The "Run ad" dialog's own documents, redeclared so the mocks match its requests.
const AD_PRICING = gql`
  query PartnerAdPricing {
    adPricing {
      auto_per_day
      home_bottom_per_day
      sidebar_per_day
      explore_scroll_per_day
      status_per_day
      venue_list_per_day
      club_list_per_day
      pod_list_per_day
      pod_details_per_day
      currency_symbol
    }
  }
`;

const SUBMIT_AD_REQUEST = gql`
  mutation PartnerSubmitAdRequest($input: SubmitAdRequestInput!) {
    submitAdRequest(input: $input) {
      id
      trace_id
    }
  }
`;

const pricingMock: MockedResponse = {
  request: { query: AD_PRICING },
  result: {
    data: {
      adPricing: {
        __typename: 'AdPricing',
        auto_per_day: 500,
        home_bottom_per_day: 400,
        sidebar_per_day: 300,
        explore_scroll_per_day: 350,
        status_per_day: 250,
        venue_list_per_day: 200,
        club_list_per_day: 200,
        pod_list_per_day: 200,
        pod_details_per_day: 200,
        currency_symbol: '₹',
      },
    },
  },
};

const adSubmitMock = (
  traceId: string,
  capture: (input: Record<string, unknown>) => void,
): MockedResponse => ({
  request: { query: SUBMIT_AD_REQUEST },
  variableMatcher: (variables) => {
    capture((variables as { input: Record<string, unknown> }).input);
    return true;
  },
  result: {
    data: { submitAdRequest: { __typename: 'AdRequest', id: 'ad-1', trace_id: traceId } },
  },
});

const openRowMenu = async () => {
  fireEvent.click(await screen.findByRole('button', { name: 'Product actions' }));
  return screen.findByRole('menu');
};

const gridRow = (cell: HTMLElement): HTMLElement => {
  const row = cell.closest('[role="row"]');
  if (!row) throw new Error('cell is not inside a grid row');
  return row as HTMLElement;
};

describe('ProductListingsTable', () => {
  it('lists each product with its image count, size, price and review status', async () => {
    renderTable([tableMock([listing()])]);

    expect(await screen.findByText('Alpha Tee')).toBeTruthy();
    expect(screen.getByText('2 images · M')).toBeTruthy();
    expect(screen.getByText('₹499.00')).toBeTruthy();
    expect(screen.getByText('APPROVED')).toBeTruthy();
    expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe('9');
  });

  it('falls back to a zero price, no-size caption and zero quantity for a bare row', async () => {
    renderTable([
      tableMock([
        listing({
          id: 'p2',
          product_name: 'Bare Row',
          images: [],
          size_label: null,
          unit_cost: null,
          inventory_count: null,
        }),
      ]),
    ]);

    expect(await screen.findByText('Bare Row')).toBeTruthy();
    expect(screen.getByText('0 images · No size')).toBeTruthy();
    expect(screen.getByText('₹0.00')).toBeTruthy();
    expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe('0');
  });

  it('tints only the rows that opted into low-stock alerts and are at the threshold', async () => {
    renderTable([
      tableMock([
        listing({ id: 'p1', product_name: 'Running Low', available_count: 2, low_stock_alert: 3, notify_low_stock: true }),
        listing({ id: 'p2', product_name: 'Well Stocked', available_count: 40, low_stock_alert: 3, notify_low_stock: true }),
        listing({ id: 'p3', product_name: 'Alerts Off', available_count: 1, low_stock_alert: 3, notify_low_stock: false }),
        // No available_count yet: the raw inventory count is what counts.
        listing({ id: 'p4', product_name: 'No Available Count', available_count: null, inventory_count: 1, low_stock_alert: 3, notify_low_stock: true }),
        // No threshold set: only a completely empty shelf counts as low.
        listing({ id: 'p5', product_name: 'No Threshold', available_count: 0, low_stock_alert: null, notify_low_stock: true }),
        // No stock numbers at all: treated as an empty shelf.
        listing({ id: 'p6', product_name: 'No Numbers', available_count: null, inventory_count: null, low_stock_alert: 0, notify_low_stock: true }),
      ]),
    ]);

    expect(gridRow(await screen.findByText('Running Low')).style.backgroundColor).toContain('237, 108, 2');
    expect(gridRow(screen.getByText('No Available Count')).style.backgroundColor).toContain('237, 108, 2');
    expect(gridRow(screen.getByText('No Threshold')).style.backgroundColor).toContain('237, 108, 2');
    expect(gridRow(screen.getByText('No Numbers')).style.backgroundColor).toContain('237, 108, 2');
    expect(gridRow(screen.getByText('Well Stocked')).style.backgroundColor).toBe('');
    expect(gridRow(screen.getByText('Alerts Off')).style.backgroundColor).toBe('');
  });

  it('formats the hidden Updated column once the partner reveals it', async () => {
    renderTable([
      tableMock([
        listing(),
        listing({ id: 'p2', product_name: 'Never Touched', updated_at: null }),
      ]),
    ]);
    await screen.findByText('Alpha Tee');
    expect(screen.queryByText('01 Jul 2026')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Columns' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Updated' }));
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });

    expect(await screen.findByText('01 Jul 2026')).toBeTruthy();
    expect(within(gridRow(screen.getByText('Never Touched'))).getByText('—')).toBeTruthy();
  });

  it('saves a new quantity, confirms it and reloads the table', async () => {
    let sent: Record<string, unknown> | null = null;
    renderTable([
      tableMock([listing()]),
      {
        request: {
          query: UPDATE_QUANTITY,
          variables: { product_doc_id: 'p1', inventory_count: 25 },
        },
        result: (variables) => {
          sent = variables as Record<string, unknown>;
          return { data: { updateMyProductListingQuantity: listing({ inventory_count: 25 }) } };
        },
      },
      tableMock([listing({ inventory_count: 25 })]),
    ]);

    fireEvent.change(await screen.findByRole('spinbutton'), { target: { value: '25' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe('Quantity updated.');
    expect(within(alert).getByTestId('SuccessOutlinedIcon')).toBeTruthy();
    expect(sent).toEqual({ product_doc_id: 'p1', inventory_count: 25 });
  });

  it('reports a rejected quantity change as an error', async () => {
    renderTable([
      tableMock([listing()]),
      {
        request: {
          query: UPDATE_QUANTITY,
          variables: { product_doc_id: 'p1', inventory_count: 9 },
        },
        result: { errors: [new GraphQLError('Warehouse stock is locked')] },
      },
    ]);

    fireEvent.click(await screen.findByRole('button', { name: 'Update' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe('Warehouse stock is locked');
    expect(within(alert).getByTestId('ErrorOutlineIcon')).toBeTruthy();
  });

  it('locks quantity editing and every row action for a partner who cannot manage products', async () => {
    renderTable([tableMock([listing()])], { canManageProducts: false });

    expect((await screen.findByRole('spinbutton')).hasAttribute('disabled')).toBe(true);
    expect((screen.getByRole('button', { name: 'Update' }) as HTMLButtonElement).disabled).toBe(true);

    const menu = await openRowMenu();
    for (const label of ['Edit', 'Settings', 'Run Product Ad', 'Run Brand Ad', 'Delete']) {
      expect(within(menu).getByRole('menuitem', { name: label }).getAttribute('aria-disabled')).toBe('true');
    }
  });

  it('hands the row to the edit and settings callbacks', async () => {
    const onEdit = vi.fn();
    const onSettings = vi.fn();
    renderTable([tableMock([listing()]), tableMock([listing()])], { onEdit, onSettings });

    await openRowMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1', product_name: 'Alpha Tee' }));

    await openRowMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Settings' }));
    expect(onSettings).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));
  });

  it('opens the detail view when the row itself is clicked', async () => {
    const onView = vi.fn();
    renderTable([tableMock([listing()])], { onView });

    fireEvent.click(await screen.findByText('Alpha Tee'));
    await waitFor(() => expect(onView).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' })));

    // The row-actions button inside the row must not double-fire the row click.
    onView.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Product actions' }));
    expect(onView).not.toHaveBeenCalled();
  });

  it('deletes a listing after confirmation and reloads the table', async () => {
    let sent: Record<string, unknown> | null = null;
    renderTable([
      tableMock([listing()]),
      {
        request: { query: DELETE_LISTING, variables: { product_doc_id: 'p1' } },
        result: (variables) => {
          sent = variables as Record<string, unknown>;
          return { data: { deleteMyProductListing: true } };
        },
      },
      tableMock([]),
    ]);

    await openRowMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Alpha Tee will be archived and removed from active listing.')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect((await screen.findByRole('alert')).textContent).toBe('Product listing deleted.');
    expect(sent).toEqual({ product_doc_id: 'p1' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('leaves the listing alone when the delete dialog is dismissed', async () => {
    renderTable([tableMock([listing()])]);

    // Escape dismisses it...
    await openRowMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    fireEvent.keyDown(await screen.findByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    // ...and so does Cancel.
    await openRowMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('Alpha Tee')).toBeTruthy();
  });

  it('opens the ad dialog for the kind the partner picked, prefilled from the row', async () => {
    renderTable([tableMock([listing()]), pricingMock, pricingMock]);

    await openRowMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Run Product Ad' }));
    let dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Run a Product Ad' })).toBeTruthy();
    expect((within(dialog).getByLabelText(/Ad Title/) as HTMLInputElement).value).toBe('Alpha Tee');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    await openRowMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Run Brand Ad' }));
    dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Run a Brand Ad' })).toBeTruthy();
    expect((within(dialog).getByLabelText(/Ad Title/) as HTMLInputElement).value).toBe('Discover Alpha Tee');
  });

  it('confirms a submitted ad with its trace id and closes the dialog', async () => {
    let input: Record<string, unknown> | null = null;
    renderTable([
      tableMock([listing()]),
      pricingMock,
      adSubmitMock('TRC-9', (captured) => {
        input = captured;
      }),
    ]);

    await openRowMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Run Product Ad' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Run a Product Ad' }));

    expect(
      await screen.findByText('Ad request submitted · TRC-9. Marketing will review it.'),
    ).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(input).toMatchObject({
      ad_kind: 'PRODUCT_AD',
      product_id: 'p1',
      ad_title: 'Alpha Tee',
      media_url: 'https://cdn.test/alpha.jpg',
    });
  });

  it('omits the trace suffix when the server returns none', async () => {
    renderTable([
      tableMock([listing()]),
      pricingMock,
      adSubmitMock('', () => undefined),
    ]);

    await openRowMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Run Brand Ad' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Run a Brand Ad' }));

    expect(await screen.findByText('Ad request submitted. Marketing will review it.')).toBeTruthy();
  });

  it('reports a rejected delete without closing the row out of the table', async () => {
    renderTable([
      tableMock([listing()]),
      {
        request: { query: DELETE_LISTING, variables: { product_doc_id: 'p1' } },
        result: { errors: [new GraphQLError('Listing has open orders')] },
      },
    ]);

    await openRowMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));

    // The open modal hides the page behind it, so the message is matched by text.
    expect(await screen.findByText('Listing has open orders')).toBeTruthy();
    // The dialog stays open so the partner can retry or cancel.
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Alpha Tee')).toBeTruthy();
  });
});
