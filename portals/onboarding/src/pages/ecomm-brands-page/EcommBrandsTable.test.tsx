import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { TableFetch } from '@duncit/table';
import EcommBrandsTable from './EcommBrandsTable';
import type { EcommBrandRow } from './queries';

interface Handlers {
  onEdit?: ReturnType<typeof vi.fn>;
  onReview?: ReturnType<typeof vi.fn>;
  onToggleActive?: ReturnType<typeof vi.fn>;
  onDelete?: ReturnType<typeof vi.fn>;
  canHardDelete?: boolean;
}

const makeFetch = (rows: EcommBrandRow[]) =>
  vi.fn(async () => ({ rows, total: rows.length })) as TableFetch<EcommBrandRow>;

const renderTable = (brands: EcommBrandRow[], h: Handlers = {}) =>
  render(
    <EcommBrandsTable
      fetchRows={makeFetch(brands)}
      refetchRef={{ current: null }}
      onEdit={h.onEdit ?? vi.fn()}
      onReview={h.onReview ?? vi.fn()}
      canHardDelete={h.canHardDelete ?? false}
      onToggleActive={h.onToggleActive ?? vi.fn()}
      onDelete={h.onDelete ?? vi.fn()}
    />,
  );

const full: EcommBrandRow = {
  id: '1', brand_name: 'Acme', logo_url: 'https://img/acme.png', tagline: 'Quality goods',
  product_categories: ['Apparel', 'Decor'], contact_person: 'Asha', contact_email: 'a@b.com',
  contact_phone: '999', status: 'SUBMITTED', is_active: true, submitted_at: '2026-01-02', product_commission_pct: 8,
  approved_product_count: 3,
};
const sparse: EcommBrandRow = {
  id: '2', brand_name: '', logo_url: '', tagline: '', product_categories: [],
  contact_person: '', contact_email: '', contact_phone: '', status: 'DRAFT', is_active: false, submitted_at: null,
  product_commission_pct: 0,
};
// product_categories omitted (nullish fallback) + phone-only contact (email empty).
const phoneOnly: EcommBrandRow = {
  id: '3', brand_name: 'PhoneCo', logo_url: '', tagline: '',
  contact_person: 'Ravi', contact_email: '', contact_phone: '999', status: 'APPROVED', is_active: true, submitted_at: '2026-02-02',
};

beforeEach(() => {
  window.localStorage.clear();
});

describe('EcommBrandsTable', () => {
  it('renders brands with fallbacks and fires edit/review', async () => {
    const onEdit = vi.fn();
    const onReview = vi.fn();
    renderTable([full, sparse, phoneOnly], { onEdit, onReview });
    expect(await screen.findByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('Apparel, Decor')).toBeInTheDocument();
    expect(screen.getByText('Untitled brand')).toBeInTheDocument();
    expect(screen.getByText('999')).toBeInTheDocument();
    expect(screen.getByText('8%')).toBeInTheDocument();
    expect(screen.getByText('3 live')).toBeInTheDocument();
    expect(screen.getAllByText('0 live').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Default').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
    expect(screen.getByText('Inactive')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    expect(onEdit).toHaveBeenCalledWith(full);
    fireEvent.click(screen.getAllByRole('button', { name: 'Review' })[0]);
    expect(onReview).toHaveBeenCalledWith(full);
  });

  it('fires deactivate and shows the developer delete only when allowed', async () => {
    const onToggleActive = vi.fn();
    const onDelete = vi.fn();
    renderTable([full], { onToggleActive, onDelete, canHardDelete: true });
    expect(await screen.findByText('Acme')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
    expect(onToggleActive).toHaveBeenCalledWith(full);
    fireEvent.click(screen.getByRole('button', { name: 'Delete permanently (developer)' }));
    expect(onDelete).toHaveBeenCalledWith(full);
  });

  it('hides the developer delete without access', async () => {
    renderTable([sparse]);
    expect(await screen.findByText('Untitled brand')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete permanently (developer)' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Activate' })).toBeInTheDocument();
  });

  it('shows an empty state', async () => {
    renderTable([]);
    expect(await screen.findByText('No brands found.')).toBeInTheDocument();
  });
});
