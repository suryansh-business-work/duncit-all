import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import InventoryPage from '../../src/pages/inventory-page/InventoryPage';
import { renderWithProviders } from '../testkit';
import {
  archiveProductMock,
  inventoryLinkedPodsMock,
  makeInventoryProductRow,
  setProductActiveMock,
} from '../mocks/inventory.mock';
import { __setTableRows } from './table-mock';
import { notifyError, notifySuccess } from '@duncit/dialogs';

const nav = vi.hoisted(() => ({ fn: vi.fn() }));
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => nav.fn,
}));
vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDate: (v: unknown) => (v ? 'D' : '') }),
}));
vi.mock('@duncit/dialogs', async (io) => ({
  ...(await io<typeof import('@duncit/dialogs')>()),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));
vi.mock('@duncit/ui', () => ({
  StatusChip: ({ status }: { status: string }) => <span>{status}</span>,
}));

const seedRow = makeInventoryProductRow({ created_at: null });

describe('InventoryPage', () => {
  it('renders the heading and adds a product via the toolbar', () => {
    __setTableRows([]);
    renderWithProviders(<InventoryPage />);
    expect(screen.getByText('Duncit Products')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Add product/i }));
    expect(nav.fn).toHaveBeenCalledWith('/inventory/new');
  });

  it('navigates to the editor when a product row is clicked', async () => {
    __setTableRows([seedRow]);
    renderWithProviders(<InventoryPage />);
    await waitFor(() => expect(screen.getAllByText('Cold Brew').length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByText('Cold Brew')[0]);
    expect(nav.fn).toHaveBeenCalledWith('/inventory/i1/edit');
  });

  it('opens the archive confirmation dialog from a row action', async () => {
    __setTableRows([seedRow]);
    renderWithProviders(<InventoryPage />);
    await waitFor(() => expect(screen.getAllByText('Cold Brew').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Archive product?')).toBeInTheDocument();
  });

  it('opens the delete dialog and cancels it', async () => {
    __setTableRows([seedRow]);
    renderWithProviders(<InventoryPage />, { mocks: [inventoryLinkedPodsMock([], 'i1')] });
    await waitFor(() => expect(screen.getAllByText('Cold Brew').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Permanently delete product?')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('completes an archive and refreshes the table', async () => {
    __setTableRows([seedRow]);
    renderWithProviders(<InventoryPage />, { mocks: [archiveProductMock({ id: 'i1' })] });
    await waitFor(() => expect(screen.getAllByText('Cold Brew').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Archive' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('temporarily deactivates a live product, and says so', async () => {
    vi.mocked(notifySuccess).mockClear();
    __setTableRows([makeInventoryProductRow({ is_active: true })]);
    renderWithProviders(<InventoryPage />, {
      mocks: [setProductActiveMock({ id: 'i1', active: false })],
    });
    await waitFor(() => expect(screen.getAllByText('Cold Brew').length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole('button', { name: 'Temporarily deactivate' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Deactivate product?')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Deactivate' }));

    await waitFor(() =>
      expect(notifySuccess).toHaveBeenCalledWith('Product temporarily deactivated'),
    );
  });

  it('brings a paused product back, moving it the other way', async () => {
    vi.mocked(notifySuccess).mockClear();
    __setTableRows([makeInventoryProductRow({ is_active: false })]);
    renderWithProviders(<InventoryPage />, {
      mocks: [setProductActiveMock({ id: 'i1', active: true })],
    });
    await waitFor(() => expect(screen.getAllByText('Cold Brew').length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole('button', { name: 'Reactivate' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Reactivate product?')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reactivate' }));

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Product reactivated'));
  });

  it('reports a refused pause instead of pretending it worked', async () => {
    vi.mocked(notifyError).mockClear();
    __setTableRows([makeInventoryProductRow({ is_active: true })]);
    renderWithProviders(<InventoryPage />, {
      mocks: [setProductActiveMock({ id: 'i1', active: false, fail: true })],
    });
    await waitFor(() => expect(screen.getAllByText('Cold Brew').length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole('button', { name: 'Temporarily deactivate' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Deactivate' }));

    await waitFor(() => expect(notifyError).toHaveBeenCalled());
  });

  it('closes the pause dialog without touching the product', async () => {
    __setTableRows([makeInventoryProductRow({ is_active: true })]);
    renderWithProviders(<InventoryPage />);
    await waitFor(() => expect(screen.getAllByText('Cold Brew').length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole('button', { name: 'Temporarily deactivate' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
