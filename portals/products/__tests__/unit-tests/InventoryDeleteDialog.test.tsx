import { describe, expect, it, vi } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import InventoryDeleteDialog from '../../src/pages/inventory-page/InventoryDeleteDialog';
import {
  ARCHIVE_INVENTORY_PRODUCT,
  INVENTORY_LINKED_PODS,
  PERMANENT_DELETE_INVENTORY_PRODUCT,
} from '../../src/pages/inventory-page/inventory-product-page/productQueries';
import { DELETE_PRODUCT } from '../../src/pages/inventory-page/queries';
import { renderWithProviders } from './testkit';

const product = { id: 'p1', product_name: 'Cold Brew' };

const archiveOk: MockedResponse = {
  request: { query: ARCHIVE_INVENTORY_PRODUCT, variables: { id: 'p1' } },
  result: { data: { archiveInventoryProduct: { id: 'p1', status: 'ARCHIVED', is_active: false } } },
};
const archiveFail: MockedResponse = {
  request: { query: ARCHIVE_INVENTORY_PRODUCT, variables: { id: 'p1' } },
  result: { errors: [{ message: 'no archive' }] },
};
const softDeleteOk: MockedResponse = {
  request: { query: DELETE_PRODUCT, variables: { id: 'p1' } },
  result: { data: { deleteInventoryProduct: true } },
};
const permanentOk: MockedResponse = {
  request: { query: PERMANENT_DELETE_INVENTORY_PRODUCT, variables: { id: 'p1' } },
  result: { data: { permanentlyDeleteInventoryProduct: true } },
};
const linkedPods = (rows: unknown[]): MockedResponse => ({
  request: { query: INVENTORY_LINKED_PODS, variables: { id: 'p1' } },
  result: { data: { inventoryProductLinkedPods: rows } },
});

describe('InventoryDeleteDialog', () => {
  it('archives a product and closes', async () => {
    const onDone = vi.fn();
    const onClose = vi.fn();
    renderWithProviders(
      <InventoryDeleteDialog
        open
        intent="archive"
        product={product}
        onClose={onClose}
        onDone={onDone}
      />,
      { mocks: [archiveOk] },
    );
    expect(screen.getByText('Archive product?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
  });

  it('falls back to a soft delete when archive fails', async () => {
    const onDone = vi.fn();
    renderWithProviders(
      <InventoryDeleteDialog
        open
        intent="archive"
        product={product}
        onClose={vi.fn()}
        onDone={onDone}
      />,
      { mocks: [archiveFail, softDeleteOk] },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it('shows linked pods before a permanent delete', async () => {
    renderWithProviders(
      <InventoryDeleteDialog
        open
        intent="delete"
        product={product}
        onClose={vi.fn()}
        onDone={vi.fn()}
      />,
      { mocks: [linkedPods([{ id: 'pod1', pod_title: 'Sunset', is_active: true }])] },
    );
    expect(screen.getByText('Permanently delete product?')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Linked to 1 pod/)).toBeInTheDocument());
    expect(screen.getByText('Sunset')).toBeInTheDocument();
  });

  it('pluralises the pod count and marks inactive pods', async () => {
    renderWithProviders(
      <InventoryDeleteDialog
        open
        intent="delete"
        product={product}
        onClose={vi.fn()}
        onDone={vi.fn()}
      />,
      {
        mocks: [
          linkedPods([
            { id: 'pod1', pod_title: 'Sunset', is_active: true },
            { id: 'pod2', pod_title: 'Moonrise', is_active: false },
          ]),
        ],
      },
    );
    await waitFor(() => expect(screen.getByText(/Linked to 2 pods/)).toBeInTheDocument());
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('shows the no-pods message and permanently deletes', async () => {
    const onDone = vi.fn();
    const onClose = vi.fn();
    renderWithProviders(
      <InventoryDeleteDialog
        open
        intent="delete"
        product={product}
        onClose={onClose}
        onDone={onDone}
      />,
      { mocks: [linkedPods([]), permanentOk] },
    );
    await waitFor(() =>
      expect(screen.getByText(/No pods reference this product/)).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
  });

  it('does nothing when confirming an archive with no product', async () => {
    const onDone = vi.fn();
    renderWithProviders(
      <InventoryDeleteDialog
        open
        intent="archive"
        product={null}
        onClose={vi.fn()}
        onDone={onDone}
      />,
      { mocks: [] },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    await Promise.resolve();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('does nothing when confirming a permanent delete with no product', async () => {
    const onDone = vi.fn();
    renderWithProviders(
      <InventoryDeleteDialog
        open
        intent="delete"
        product={null}
        onClose={vi.fn()}
        onDone={onDone}
      />,
      { mocks: [] },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }));
    await Promise.resolve();
    expect(onDone).not.toHaveBeenCalled();
  });
});
