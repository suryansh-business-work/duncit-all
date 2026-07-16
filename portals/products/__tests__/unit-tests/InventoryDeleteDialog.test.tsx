import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import InventoryDeleteDialog from '../../src/pages/inventory-page/InventoryDeleteDialog';
import { renderWithProviders } from '../testkit';
import {
  archiveProductMock,
  deleteProductMock,
  inventoryLinkedPodsMock,
  makeInventoryLinkedPod,
  permanentDeleteProductMock,
} from '../mocks/inventory.mock';

// Component-prop fixture: the dialog reads only the id + product_name.
const product = { id: 'p1', product_name: 'Cold Brew' };

describe('InventoryDeleteDialog', () => {
  it('archives a product and closes', async () => {
    const onDone = vi.fn();
    const onClose = vi.fn();
    renderWithProviders(
      <InventoryDeleteDialog open intent="archive" product={product} onClose={onClose} onDone={onDone} />,
      { mocks: [archiveProductMock()] },
    );
    expect(screen.getByText('Archive product?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
  });

  it('falls back to a soft delete when archive fails', async () => {
    const onDone = vi.fn();
    renderWithProviders(
      <InventoryDeleteDialog open intent="archive" product={product} onClose={vi.fn()} onDone={onDone} />,
      { mocks: [archiveProductMock({ fail: true }), deleteProductMock()] },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it('shows linked pods before a permanent delete', async () => {
    renderWithProviders(
      <InventoryDeleteDialog open intent="delete" product={product} onClose={vi.fn()} onDone={vi.fn()} />,
      { mocks: [inventoryLinkedPodsMock([makeInventoryLinkedPod({ id: 'pod1', pod_title: 'Sunset', is_active: true })])] },
    );
    expect(screen.getByText('Permanently delete product?')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Linked to 1 pod/)).toBeInTheDocument());
    expect(screen.getByText('Sunset')).toBeInTheDocument();
  });

  it('pluralises the pod count and marks inactive pods', async () => {
    renderWithProviders(
      <InventoryDeleteDialog open intent="delete" product={product} onClose={vi.fn()} onDone={vi.fn()} />,
      {
        mocks: [
          inventoryLinkedPodsMock([
            makeInventoryLinkedPod({ id: 'pod1', pod_title: 'Sunset', is_active: true }),
            makeInventoryLinkedPod({ id: 'pod2', pod_title: 'Moonrise', is_active: false }),
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
      <InventoryDeleteDialog open intent="delete" product={product} onClose={onClose} onDone={onDone} />,
      { mocks: [inventoryLinkedPodsMock([]), permanentDeleteProductMock()] },
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
      <InventoryDeleteDialog open intent="archive" product={null} onClose={vi.fn()} onDone={onDone} />,
      { mocks: [] },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    await Promise.resolve();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('does nothing when confirming a permanent delete with no product', async () => {
    const onDone = vi.fn();
    renderWithProviders(
      <InventoryDeleteDialog open intent="delete" product={null} onClose={vi.fn()} onDone={onDone} />,
      { mocks: [] },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }));
    await Promise.resolve();
    expect(onDone).not.toHaveBeenCalled();
  });
});
