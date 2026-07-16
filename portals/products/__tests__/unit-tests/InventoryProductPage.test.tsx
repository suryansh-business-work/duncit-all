import { describe, expect, it, vi } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { Route } from 'react-router-dom';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import InventoryProductPage from '../../src/pages/inventory-page/inventory-product-page/InventoryProductPage';
import {
  INVENTORY_ACTIVITY_LOGS,
  INVENTORY_ANALYTICS,
  INVENTORY_CATEGORIES,
  INVENTORY_PRODUCT_DETAIL,
  INVENTORY_STOCK_MOVEMENTS,
} from '../../src/pages/inventory-page/inventory-product-page/productQueries';
import { CREATE_PRODUCT, UPDATE_PRODUCT } from '../../src/pages/inventory-page/queries';
import { blankProductForm } from '../../src/pages/inventory-page/inventory-product-page/types';
import { renderWithProviders } from './testkit';

const nav = vi.hoisted(() => ({ fn: vi.fn() }));
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => nav.fn,
}));

const body = vi.hoisted(() => ({ props: null as null | Record<string, any> }));
vi.mock('../../src/pages/inventory-page/inventory-product-page/ProductFormBody', () => ({
  default: (props: Record<string, any>) => {
    body.props = props;
    return <div data-testid="form-body" />;
  },
}));
vi.mock('../../src/pages/inventory-page/inventory-product-page/ProductPageHeader', () => ({
  default: ({ isNew }: { isNew: boolean }) => <div>{isNew ? 'NEW HEADER' : 'EDIT HEADER'}</div>,
}));

const categoriesMock: MockedResponse = {
  request: { query: INVENTORY_CATEGORIES },
  result: {
    data: {
      categories: [
        { id: 'c1', name: 'Beverages', level: 'CATEGORY' },
        { id: 'super', name: 'All', level: 'SUPER' },
      ],
    },
  },
  maxUsageCount: 20,
};
const idQuery = (query: any, key: string, rows: unknown): MockedResponse => ({
  request: { query, variables: { id: 'p1' } },
  result: { data: { [key]: rows } },
  maxUsageCount: 20,
});
const detailMock = (product: unknown): MockedResponse => ({
  request: { query: INVENTORY_PRODUCT_DETAIL, variables: { id: 'p1' } },
  result: { data: { inventoryProduct: product } },
  maxUsageCount: 20,
});
const editQueryMocks = (product: unknown) => [
  detailMock(product),
  categoriesMock,
  idQuery(INVENTORY_ACTIVITY_LOGS, 'inventoryActivityLogs', []),
  idQuery(INVENTORY_STOCK_MOVEMENTS, 'inventoryStockMovements', []),
  idQuery(INVENTORY_ANALYTICS, 'inventoryAnalytics', []),
];

const renderNew = (mocks: MockedResponse[]) =>
  renderWithProviders(<></>, {
    mocks,
    initialEntries: ['/inventory/new'],
    routes: <Route path="/inventory/new" element={<InventoryProductPage />} />,
  });
const renderEdit = (mocks: MockedResponse[]) =>
  renderWithProviders(<></>, {
    mocks,
    initialEntries: ['/inventory/p1/edit'],
    routes: <Route path="/inventory/:id/edit" element={<InventoryProductPage />} />,
  });

const savedProduct = { id: 'p1', product_name: 'Cold Brew', sku: 'CB1', status: 'ACTIVE' };

describe('InventoryProductPage', () => {
  it('creates a product and routes to its editor', async () => {
    const createMock: MockedResponse = {
      request: { query: CREATE_PRODUCT },
      variableMatcher: () => true,
      result: { data: { createInventoryProduct: { id: 'new-1' } } },
    };
    renderNew([categoriesMock, createMock]);
    expect(screen.getByText('NEW HEADER')).toBeInTheDocument();
    await body.props?.onSubmit({ ...blankProductForm, product_name: 'New', sku: 'nw1' });
    await waitFor(() =>
      expect(nav.fn).toHaveBeenCalledWith('/inventory/new-1/edit', { replace: true }),
    );
    // SUPER-level categories are filtered out before reaching the form.
    expect(body.props?.categories).toEqual([{ id: 'c1', name: 'Beverages', level: 'CATEGORY' }]);
  });

  it('shows a loading spinner while an existing product loads', () => {
    const { container } = renderEdit(editQueryMocks(savedProduct));
    expect(container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
  });

  it('loads an existing product and saves an update', async () => {
    const updateMock: MockedResponse = {
      request: { query: UPDATE_PRODUCT },
      variableMatcher: () => true,
      result: { data: { updateInventoryProduct: { id: 'p1' } } },
      maxUsageCount: 20,
    };
    renderEdit([...editQueryMocks(savedProduct), updateMock]);
    await waitFor(() => expect(screen.getByText('EDIT HEADER')).toBeInTheDocument());
    await body.props?.onSubmit({ ...blankProductForm, id: 'p1', product_name: 'Cold Brew', sku: 'cb1' });
    await waitFor(() => expect(screen.getByText('Saved')).toBeInTheDocument());
  });

  it('shows a not-found message for a missing product', async () => {
    renderEdit(editQueryMocks(null));
    await waitFor(() => expect(screen.getByText('Product not found.')).toBeInTheDocument());
  });

  it('wires cancel, after-save and the dismissable error alert', async () => {
    renderNew([categoriesMock]);
    expect(screen.getByText('NEW HEADER')).toBeInTheDocument();
    act(() => body.props?.onCancel());
    expect(nav.fn).toHaveBeenCalledWith('/inventory');
    nav.fn.mockClear();
    act(() => body.props?.onAfterSave());
    expect(nav.fn).toHaveBeenCalledWith('/inventory');
    // onError surfaces a dismissable alert.
    act(() => body.props?.onError('boom'));
    const alert = await screen.findByText('boom');
    expect(alert).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    await waitFor(() => expect(screen.queryByText('boom')).not.toBeInTheDocument());
  });

  it('surfaces a save error', async () => {
    const failMock: MockedResponse = {
      request: { query: CREATE_PRODUCT },
      variableMatcher: () => true,
      result: { errors: [{ message: 'save failed' }] },
    };
    renderNew([categoriesMock, failMock]);
    await body.props?.onSubmit({ ...blankProductForm, product_name: 'New', sku: 'nw1' });
    await waitFor(() => expect(screen.getByText('save failed')).toBeInTheDocument());
  });
});
