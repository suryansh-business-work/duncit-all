import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { GraphQLError } from 'graphql';
import ProductSettingsPage from './ProductSettingsPage';
import { MY_PRODUCT_LISTINGS, UPDATE_PRODUCT_SETTINGS } from './queries';
import { PRODUCT_ACCESS_MESSAGE, PRODUCT_LISTING_ACCESS } from './productAccess';

afterEach(cleanup);

const SETTINGS_PATH = '/ecomm-brand/:brandId/products/:productId/settings';
const SETTINGS_URL = '/ecomm-brand/b1/products/p1/settings';

const accessMock = (roles: string[]): MockedResponse => ({
  request: { query: PRODUCT_LISTING_ACCESS },
  result: { data: { me: { __typename: 'User', user_id: 'u1', roles } } },
});

/** Every field MY_PRODUCT_LISTINGS selects — the cache drops partial rows. */
const listingRow = (over: Record<string, unknown> = {}) => ({
  __typename: 'ProductListing',
  id: 'p1',
  product_name: 'Alpha Tee',
  description: 'Soft cotton tee',
  image_url: null,
  images: [],
  size_label: 'M',
  height_cm: null,
  weight_kg: null,
  length_cm: null,
  breadth_cm: null,
  color: 'Blue',
  inventory_count: 9,
  available_count: 3,
  low_stock_alert: 4,
  notify_low_stock: true,
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

const listingsMock = (rows: unknown[]): MockedResponse => ({
  request: { query: MY_PRODUCT_LISTINGS, variables: { brand_id: 'b1' } },
  result: { data: { myProductListings: rows } },
});

const renderPage = (mocks: MockedResponse[], stateProduct?: Record<string, unknown>) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <MemoryRouter
        initialEntries={[{ pathname: SETTINGS_URL, state: stateProduct ? { product: stateProduct } : null }]}
      >
        <Routes>
          <Route path={SETTINGS_PATH} element={<ProductSettingsPage />} />
          <Route path="/ecomm-brand/:brandId/products" element={<div>Products home</div>} />
        </Routes>
      </MemoryRouter>
    </MockedProvider>,
  );

describe('ProductSettingsPage', () => {
  it('shows a spinner while the access check is still in flight', () => {
    renderPage([]);
    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save settings' })).toBeNull();
  });

  it('blocks a partner without the Ecomm Manager role', async () => {
    renderPage([accessMock(['VENUE_MANAGER'])], listingRow());

    expect(await screen.findByText(PRODUCT_ACCESS_MESSAGE)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save settings' })).toBeNull();
    expect(screen.queryByLabelText('Low-stock threshold')).toBeNull();
  });

  it('tells a manager when the listing id is not in the brand', async () => {
    renderPage([accessMock(['ECOMM_MANAGER']), listingsMock([listingRow({ id: 'other' })])]);

    expect(await screen.findByText('Product listing was not found.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save settings' })).toBeNull();
  });

  it('falls back to the brand listing query and seeds the form from the matched row', async () => {
    renderPage([accessMock(['ECOMM_MANAGER']), listingsMock([listingRow()])]);

    expect(await screen.findByText('Alpha Tee settings')).toBeTruthy();
    expect(screen.getByText('Currently 3 units available.')).toBeTruthy();
    expect((screen.getByLabelText('Low-stock threshold') as HTMLInputElement).value).toBe('4');
    expect(
      (screen.getByRole('checkbox', {
        name: 'Notify me when this product hits the low-stock threshold',
      }) as HTMLInputElement).checked,
    ).toBe(true);
  });

  it('skips the brand listing query when the row was handed over via router state', async () => {
    // No listings mock at all: if the query ran, MockedProvider would error out.
    renderPage(
      [accessMock(['ECOMM_MANAGER'])],
      listingRow({ product_name: 'Beta Cap', available_count: null, inventory_count: 1, low_stock_alert: 0, notify_low_stock: false }),
    );

    expect(await screen.findByText('Beta Cap settings')).toBeTruthy();
    expect(screen.getByText('Currently 1 unit available.')).toBeTruthy();
    expect((screen.getByLabelText('Low-stock threshold') as HTMLInputElement).value).toBe('0');
    expect(
      (screen.getByRole('checkbox', {
        name: 'Notify me when this product hits the low-stock threshold',
      }) as HTMLInputElement).checked,
    ).toBe(false);
  });

  it('defaults an unset threshold to five and treats a missing stock count as zero', async () => {
    renderPage(
      [accessMock(['ECOMM_MANAGER'])],
      listingRow({ low_stock_alert: null, notify_low_stock: null, available_count: null, inventory_count: null }),
    );

    expect(await screen.findByText('Currently 0 units available.')).toBeTruthy();
    expect((screen.getByLabelText('Low-stock threshold') as HTMLInputElement).value).toBe('5');
    expect(
      (screen.getByRole('checkbox', {
        name: 'Notify me when this product hits the low-stock threshold',
      }) as HTMLInputElement).checked,
    ).toBe(false);
  });

  it('saves the threshold and the notify flag, then confirms', async () => {
    let sent: Record<string, unknown> | null = null;
    renderPage(
      [
        accessMock(['ECOMM_MANAGER']),
        {
          request: {
            query: UPDATE_PRODUCT_SETTINGS,
            variables: { product_doc_id: 'p1', low_stock_alert: 12, notify_low_stock: false },
          },
          result: (variables) => {
            sent = variables as Record<string, unknown>;
            return { data: { updateMyProductSettings: listingRow({ low_stock_alert: 12, notify_low_stock: false }) } };
          },
        },
      ],
      listingRow(),
    );

    fireEvent.change(await screen.findByLabelText('Low-stock threshold'), { target: { value: '12' } });
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: 'Notify me when this product hits the low-stock threshold',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));

    expect(await screen.findByText('Settings saved.')).toBeTruthy();
    expect(sent).toEqual({ product_doc_id: 'p1', low_stock_alert: 12, notify_low_stock: false });
  });

  it('refuses an absurd threshold and never reaches the server', async () => {
    let called = false;
    renderPage(
      [
        accessMock(['ECOMM_MANAGER']),
        {
          request: {
            query: UPDATE_PRODUCT_SETTINGS,
            variables: { product_doc_id: 'p1', low_stock_alert: 1000001, notify_low_stock: true },
          },
          result: () => {
            called = true;
            return { data: { updateMyProductSettings: listingRow() } };
          },
        },
      ],
      listingRow(),
    );

    fireEvent.change(await screen.findByLabelText('Low-stock threshold'), { target: { value: '1000001' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));

    expect(await screen.findByText('Number must be less than or equal to 1000000')).toBeTruthy();
    expect(called).toBe(false);
    expect(screen.queryByText('Settings saved.')).toBeNull();
  });

  it('keeps a negative or fractional threshold un-submittable at the input level', async () => {
    renderPage([accessMock(['ECOMM_MANAGER'])], listingRow());

    const input = (await screen.findByLabelText('Low-stock threshold')) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '-1' } });
    expect(input.validity.rangeUnderflow).toBe(true);

    fireEvent.change(input, { target: { value: '2.5' } });
    expect(input.validity.stepMismatch).toBe(true);

    fireEvent.change(input, { target: { value: '6' } });
    expect(input.checkValidity()).toBe(true);
  });

  it('surfaces a server rejection as an error alert', async () => {
    renderPage(
      [
        accessMock(['ECOMM_MANAGER']),
        {
          request: {
            query: UPDATE_PRODUCT_SETTINGS,
            variables: { product_doc_id: 'p1', low_stock_alert: 4, notify_low_stock: true },
          },
          result: { errors: [new GraphQLError('Threshold above stock cap')] },
        },
      ],
      listingRow(),
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Save settings' }));

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('Threshold above stock cap'),
    );
    expect(screen.queryByText('Settings saved.')).toBeNull();
  });

  it('Back returns to the brand product list', async () => {
    renderPage([accessMock(['ECOMM_MANAGER'])], listingRow());

    fireEvent.click(await screen.findByRole('button', { name: 'Back' }));
    expect(await screen.findByText('Products home')).toBeTruthy();
  });
});
