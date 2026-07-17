import { describe, expect, it, vi } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { Route } from 'react-router-dom';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import InventoryProductPage from '../../src/pages/inventory-page/inventory-product-page/InventoryProductPage';
import { blankProductForm } from '../../src/pages/inventory-page/inventory-product-page/types';
import { renderWithProviders } from '../testkit';
import {
  createProductMock,
  inventoryCategoriesMock,
  inventoryEditQueryMocks,
  makeInventoryProduct,
  updateProductMock,
} from '../mocks/inventory.mock';

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

const savedProduct = makeInventoryProduct({ id: 'p1', product_name: 'Cold Brew', sku: 'CB1', status: 'ACTIVE' });

describe('InventoryProductPage', () => {
  it('creates a product and routes to its editor', async () => {
    renderNew([inventoryCategoriesMock(), createProductMock()]);
    expect(screen.getByText('NEW HEADER')).toBeInTheDocument();
    await body.props?.onSubmit({ ...blankProductForm, product_name: 'New', sku: 'nw1' });
    await waitFor(() =>
      expect(nav.fn).toHaveBeenCalledWith('/inventory/new-1/edit', { replace: true }),
    );
    // SUPER-level categories are filtered out before reaching the form.
    expect(body.props?.categories).toHaveLength(1);
    expect(body.props?.categories[0]).toMatchObject({ id: 'c1', name: 'Beverages', level: 'CATEGORY' });
  });

  it('shows a loading spinner while an existing product loads', () => {
    const { container } = renderEdit(inventoryEditQueryMocks(savedProduct));
    expect(container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
  });

  it('loads an existing product and saves an update', async () => {
    renderEdit([...inventoryEditQueryMocks(savedProduct), updateProductMock()]);
    await waitFor(() => expect(screen.getByText('EDIT HEADER')).toBeInTheDocument());
    await body.props?.onSubmit({ ...blankProductForm, id: 'p1', product_name: 'Cold Brew', sku: 'cb1' });
    await waitFor(() => expect(screen.getByText('Saved')).toBeInTheDocument());
    // Dismiss the toast (covers the Snackbar onClose handler).
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByText('Saved')).not.toBeInTheDocument());
  });

  it('shows a not-found message for a missing product and navigates back', async () => {
    renderEdit(inventoryEditQueryMocks(null));
    await waitFor(() => expect(screen.getByText('Product not found.')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Back to inventory/i }));
    expect(nav.fn).toHaveBeenCalledWith('/inventory');
  });

  it('wires cancel, after-save and the dismissable error alert', async () => {
    renderNew([inventoryCategoriesMock()]);
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
    renderNew([inventoryCategoriesMock(), createProductMock({ fail: true })]);
    await body.props?.onSubmit({ ...blankProductForm, product_name: 'New', sku: 'nw1' });
    await waitFor(() => expect(screen.getByText('save failed')).toBeInTheDocument());
  });
});
