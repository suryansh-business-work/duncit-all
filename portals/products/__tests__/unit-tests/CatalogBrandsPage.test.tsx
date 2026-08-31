import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import CatalogBrandsPage from '../../src/pages/catalog-brands/CatalogBrandsPage';
import type { CatalogBrandRow } from '../../src/pages/catalog-brands/queries';
import { renderWithProviders } from '../testkit';
import { __setTableRows } from './table-mock';

const nav = vi.hoisted(() => ({ fn: vi.fn() }));
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => nav.fn,
}));
vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()), useDateFormat: () => ({ formatDate: () => 'D' }) }));
vi.mock('@duncit/ui', () => ({
  StatusChip: ({ status }: { status: string }) => <span>{status}</span>,
}));

const row: CatalogBrandRow = {
  id: 'b1',
  brand_no: 'BRD-000001',
  brand_name: 'Acme',
  logo_url: '',
  contact_person: 'Asha',
  contact_email: 'sales@acme.com',
  contact_phone: '',
  city: 'Pune',
  state: 'MH',
  status: 'SUBMITTED',
  is_active: true,
  approved_product_count: 0,
  product_commission_pct: 10,
  created_at: '2026-01-01T00:00:00.000Z',
};

describe('CatalogBrandsPage', () => {
  it('lists every brand whatever its review status', async () => {
    __setTableRows([row]);
    renderWithProviders(<CatalogBrandsPage />);

    expect(screen.getByText('Brands')).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText('Acme').length).toBeGreaterThan(0));
    // A SUBMITTED brand is listed here — Catalog is not scoped to approved brands.
    expect(screen.getAllByText('SUBMITTED').length).toBeGreaterThan(0);
  });

  it('navigates to the brand products list from the Products action', async () => {
    __setTableRows([row]);
    renderWithProviders(<CatalogBrandsPage />);
    await waitFor(() => expect(screen.getAllByText('Acme').length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole('button', { name: 'Products' }));

    expect(nav.fn).toHaveBeenCalledWith('/catalog/brands/b1/products');
  });

  it('navigates to the brand manage screen from the Manage action', async () => {
    __setTableRows([row]);
    renderWithProviders(<CatalogBrandsPage />);
    await waitFor(() => expect(screen.getAllByText('Acme').length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole('button', { name: 'Manage' }));

    expect(nav.fn).toHaveBeenCalledWith('/catalog/brands/b1');
  });

  it('offers no approve or reject action — reviews live in Brands Review', async () => {
    __setTableRows([row]);
    renderWithProviders(<CatalogBrandsPage />);
    await waitFor(() => expect(screen.getAllByText('Acme').length).toBeGreaterThan(0));

    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument();
  });
});
