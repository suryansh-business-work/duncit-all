import type { MockedResponse } from '@apollo/client/testing';
import { inventoryProductsListMock, makeInventoryProduct } from './inventory.mock';
import { makeEcommBrand, marketplaceBrandsMock } from './ecommBrand.mock';
import { makeProductOrder, productOrdersListMock } from './order.mock';

/**
 * The products-portal dashboard aggregates three lists. These mocks feed a
 * predictable KPI snapshot: 2 products (1 out of stock, 1 low stock, ₹35 stock
 * value), 2 orders (1 pending, ₹300 revenue), 1 live brand (4 approved
 * products) — every object typed via the shared entity factories.
 */
export const dashboardMocks = (): MockedResponse[] => [
  inventoryProductsListMock([
    makeInventoryProduct({ id: 'd1', available_count: 0, selling_price: 10, inventory_count: 2, low_stock_alert: 5 }),
    makeInventoryProduct({ id: 'd2', available_count: 3, selling_price: 5, inventory_count: 3, low_stock_alert: 5 }),
  ]),
  productOrdersListMock([
    makeProductOrder({ id: 'do1', total: 200, fulfilment_status: 'PENDING' }),
    makeProductOrder({ id: 'do2', total: 100, fulfilment_status: 'DELIVERED' }),
  ]),
  marketplaceBrandsMock([makeEcommBrand({ id: 'db1', approved_product_count: 4 })]),
];

/** The dashboard with a failing inventory query (empty orders + brands). */
export const dashboardWithProductsError = (): MockedResponse[] => [
  inventoryProductsListMock([], { error: true }),
  productOrdersListMock([]),
  marketplaceBrandsMock([]),
];
