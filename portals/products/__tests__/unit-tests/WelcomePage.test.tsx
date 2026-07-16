import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { screen, waitFor } from '@testing-library/react';
import WelcomePage from '../../src/pages/WelcomePage';
import { INVENTORY_PRODUCTS } from '../../src/pages/inventory-page/queries';
import { MARKETPLACE_BRANDS } from '../../src/pages/ecomm/queries';
import { PRODUCT_ORDERS } from '../../src/pages/orders/queries';
import { renderWithProviders } from './testkit';

const userMock = vi.hoisted(() => ({ value: {} as { user: unknown } }));
vi.mock('@duncit/user-context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/user-context')>()),
  useUserData: () => userMock.value,
}));

const productsMock = (rows: unknown[]): MockedResponse => ({
  request: { query: INVENTORY_PRODUCTS },
  variableMatcher: () => true,
  result: { data: { inventoryProducts: rows } },
});
const ordersMock = (rows: unknown[]): MockedResponse => ({
  request: { query: PRODUCT_ORDERS },
  variableMatcher: () => true,
  result: { data: { productOrders: rows } },
});
const brandsMock = (rows: unknown[]): MockedResponse => ({
  request: { query: MARKETPLACE_BRANDS },
  variableMatcher: () => true,
  result: { data: { marketplaceBrands: rows } },
});

const data = [
  productsMock([
    { available_count: 0, selling_price: 10, inventory_count: 2, low_stock_alert: 5 },
    { available_count: 3, selling_price: 5, inventory_count: 3, low_stock_alert: 5 },
  ]),
  ordersMock([
    { total: 200, fulfilment_status: 'PENDING' },
    { total: 100, fulfilment_status: 'DELIVERED' },
  ]),
  brandsMock([{ approved_product_count: 4 }]),
];

afterEach(() => {
  userMock.value = { user: null };
});

describe('WelcomePage dashboard', () => {
  it('greets the user by first name and shows the loading bar first', () => {
    userMock.value = { user: { first_name: 'Asha', full_name: 'Asha Rao' } };
    const { container } = renderWithProviders(<WelcomePage />, { mocks: data });
    expect(screen.getByText(/Hi Asha/)).toBeInTheDocument();
    expect(container.querySelector('.MuiLinearProgress-root')).toBeInTheDocument();
  });

  it('falls back to the full name when there is no first name', () => {
    userMock.value = { user: { first_name: '', full_name: 'Asha Rao' } };
    renderWithProviders(<WelcomePage />, { mocks: data });
    expect(screen.getByText(/Hi Asha Rao/)).toBeInTheDocument();
  });

  it('falls back to "there" when there is no user', () => {
    userMock.value = { user: null };
    renderWithProviders(<WelcomePage />, { mocks: data });
    expect(screen.getByText(/Hi there/)).toBeInTheDocument();
  });

  it('aggregates the three lists into KPI tiles once loaded', async () => {
    renderWithProviders(<WelcomePage />, { mocks: data });
    // 1 order to fulfil (PENDING), 1 out of stock, 1 low stock, 1 brand live.
    await waitFor(() => expect(screen.getByText('1 orders to fulfil')).toBeInTheDocument());
    expect(screen.getByText('1 out of stock')).toBeInTheDocument();
    expect(screen.getByText('1 low stock')).toBeInTheDocument();
    expect(screen.getByText('1 brands live')).toBeInTheDocument();
    // Two products in the catalogue.
    expect(screen.getByText('Products')).toBeInTheDocument();
  });

  it('surfaces a query error', async () => {
    const failing: MockedResponse = {
      request: { query: INVENTORY_PRODUCTS },
      variableMatcher: () => true,
      result: { errors: [{ message: 'boom' }] },
    };
    renderWithProviders(<WelcomePage />, {
      mocks: [failing, ordersMock([]), brandsMock([])],
    });
    await waitFor(() => expect(screen.getByText('boom')).toBeInTheDocument());
  });
});
