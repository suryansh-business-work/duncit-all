import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import ProductPageHeader from '../../src/pages/inventory-page/inventory-product-page/ProductPageHeader';
import { renderWithProviders } from './testkit';

const nav = vi.hoisted(() => ({ fn: vi.fn() }));
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => nav.fn,
}));

const fns = vi.hoisted(() => ({ archive: vi.fn(), restore: vi.fn(), duplicate: vi.fn() }));
vi.mock('@apollo/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client')>()),
  useMutation: (doc: any) => {
    const name = doc?.definitions?.[0]?.name?.value;
    const map: Record<string, any> = {
      ArchiveInventoryProduct: fns.archive,
      RestoreInventoryProduct: fns.restore,
      DuplicateInventoryProduct: fns.duplicate,
    };
    return [map[name] ?? vi.fn(), { loading: false }];
  },
}));

const activeProduct = {
  id: 'p1',
  product_name: 'Cold Brew',
  sku: 'CB-1',
  status: 'ACTIVE',
  last_updated_by_name: 'Asha',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const renderHeader = (over: Partial<Record<string, any>> = {}) => {
  const props = {
    isNew: false,
    product: activeProduct,
    onError: vi.fn(),
    onToast: vi.fn(),
    onRefetch: vi.fn().mockResolvedValue(undefined),
    ...over,
  };
  renderWithProviders(<ProductPageHeader {...(props as any)} />);
  return props;
};

beforeEach(() => {
  nav.fn.mockReset();
  fns.archive.mockReset();
  fns.restore.mockReset();
  fns.duplicate.mockReset();
});

describe('ProductPageHeader', () => {
  it('renders the add-product header when new (no action buttons)', () => {
    renderHeader({ isNew: true, product: null });
    expect(screen.getByText('Add inventory product')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Duplicate' })).not.toBeInTheDocument();
  });

  it('shows the product name, SKU chip and last-editor line', () => {
    renderHeader();
    expect(screen.getAllByText('Cold Brew').length).toBeGreaterThan(0);
    expect(screen.getByText('CB-1')).toBeInTheDocument();
    expect(screen.getByText(/Last edited by Asha/)).toBeInTheDocument();
  });

  it('duplicates the product and navigates to the copy', async () => {
    fns.duplicate.mockResolvedValue({ data: { duplicateInventoryProduct: { id: 'p2' } } });
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));
    await waitFor(() => expect(nav.fn).toHaveBeenCalledWith('/inventory/p2/edit'));
  });

  it('does not navigate when the duplicate returns no id', async () => {
    fns.duplicate.mockResolvedValue({ data: { duplicateInventoryProduct: null } });
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));
    await waitFor(() => expect(fns.duplicate).toHaveBeenCalled());
    expect(nav.fn).not.toHaveBeenCalled();
  });

  it('omits the last-editor line when there is no editor', () => {
    renderHeader({ product: { ...activeProduct, last_updated_by_name: null } });
    expect(screen.queryByText(/Last edited by/)).not.toBeInTheDocument();
  });

  it('reports a duplicate failure', async () => {
    fns.duplicate.mockRejectedValue(new Error('dup failed'));
    const props = renderHeader();
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));
    await waitFor(() => expect(props.onError).toHaveBeenCalledWith('dup failed'));
  });

  it('archives an active product and refetches', async () => {
    fns.archive.mockResolvedValue({});
    const props = renderHeader();
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    await waitFor(() => expect(props.onToast).toHaveBeenCalledWith('Archived'));
    expect(props.onRefetch).toHaveBeenCalled();
  });

  it('reports an archive failure', async () => {
    fns.archive.mockRejectedValue(new Error('archive failed'));
    const props = renderHeader();
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    await waitFor(() => expect(props.onError).toHaveBeenCalledWith('archive failed'));
  });

  it('restores an archived product', async () => {
    fns.restore.mockResolvedValue({});
    const props = renderHeader({ product: { ...activeProduct, status: 'ARCHIVED' } });
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(props.onToast).toHaveBeenCalledWith('Restored'));
  });

  it('reports a restore failure', async () => {
    fns.restore.mockRejectedValue(new Error('restore failed'));
    const props = renderHeader({ product: { ...activeProduct, status: 'ARCHIVED' } });
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(props.onError).toHaveBeenCalledWith('restore failed'));
  });
});
