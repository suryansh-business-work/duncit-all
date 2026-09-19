import '../../../__tests__/helpers/agGridEnv';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { TablePage, TableQueryState } from '@duncit/table';
import { formatDate } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import PartnerBrandsTable from './PartnerBrandsTable';
import type { EcommBrandRow } from './queries';
import { renderWithProviders } from '../../__tests__/render';

afterEach(cleanup);
beforeEach(() => {
  globalThis.localStorage.clear();
});

const brandRow = (over: Partial<EcommBrandRow> = {}): EcommBrandRow => ({
  id: 'b1',
  brand_name: 'Chai Point',
  logo_url: 'https://cdn.test/chai-logo.png',
  cover_image_url: '',
  tagline: 'Chai, delivered',
  description: 'Hand-brewed chai for every pod.',
  product_categories: ['Beverages', 'Snacks'],
  website_url: '',
  instagram_url: '',
  contact_person: 'Asha Rao',
  contact_email: 'asha@duncit.com',
  contact_phone: '9876543210',
  registered_business_name: 'Chai Point Pvt Ltd',
  gstin: '',
  pan: '',
  established_year: 2019,
  address_line1: '12 MG Road',
  city: 'Bengaluru',
  state: 'Karnataka',
  postal_code: '560001',
  country: 'India',
  account_holder_name: '',
  account_number: '',
  ifsc_code: '',
  upi_id: '',
  documents: [],
  tags: [],
  status: 'DRAFT',
  is_active: true,
  reviewer_notes: '',
  submitted_at: null,
  approved_at: null,
  created_at: '2026-06-01T09:00:00',
  updated_at: '2026-07-01T10:00:00',
  ...over,
});

const makeFetch = (rows: EcommBrandRow[]) =>
  vi.fn(async (_query: TableQueryState): Promise<TablePage<EcommBrandRow>> => ({ rows, total: rows.length }));

interface Handlers {
  onOpen: ReturnType<typeof vi.fn>;
  onManageProducts: ReturnType<typeof vi.fn>;
  onSettings: ReturnType<typeof vi.fn>;
  onToggleActive: ReturnType<typeof vi.fn>;
}

const renderTable = (rows: EcommBrandRow[], refetchRef = { current: null as (() => void) | null }) => {
  const handlers: Handlers = {
    onOpen: vi.fn(),
    onManageProducts: vi.fn(),
    onSettings: vi.fn(),
    onToggleActive: vi.fn(),
  };
  const fetchRows = makeFetch(rows);
  renderWithProviders(
    <PartnerBrandsTable
      fetchRows={fetchRows}
      refetchRef={refetchRef}
      toolbarActions={<DuncitButton>New brand</DuncitButton>}
      {...handlers}
    />,
  );
  return { handlers, fetchRows };
};

const gridRow = (cell: HTMLElement): HTMLElement => {
  const row = cell.closest('[role="row"]');
  if (!row) throw new Error('cell is not inside a grid row');
  return row as HTMLElement;
};

describe('PartnerBrandsTable', () => {
  it('asks for the most recently updated brands first and shows the toolbar actions', async () => {
    const { fetchRows } = renderTable([brandRow()]);

    await waitFor(() => expect(fetchRows).toHaveBeenCalled());
    expect(fetchRows).toHaveBeenCalledWith(expect.objectContaining({ sortBy: 'updated_at', sortDir: 'desc', page: 1 }));
    expect(screen.getByRole('button', { name: 'New brand' })).toBeTruthy();
  });

  it('lists each brand with its logo, tagline, categories and review status', async () => {
    renderTable([brandRow()]);

    const row = gridRow(await screen.findByText('Chai Point'));
    expect(within(row).getByText('Chai, delivered')).toBeTruthy();
    expect(within(row).getByText('Beverages, Snacks')).toBeTruthy();
    expect(within(row).getByText('DRAFT')).toBeTruthy();
    expect((row.querySelector('img') as HTMLImageElement).src).toBe('https://cdn.test/chai-logo.png');
  });

  it('falls back to placeholders for a brand with no name, logo, tagline or categories', async () => {
    renderTable([
      brandRow({ id: 'b2', brand_name: '', logo_url: '', tagline: '', product_categories: [], status: 'REJECTED' }),
    ]);

    const row = gridRow(await screen.findByText('Untitled brand'));
    // No logo: the avatar shows the placeholder initial instead of an image.
    expect(within(row).getByText('?')).toBeTruthy();
    expect(row.querySelector('img')).toBeNull();
    expect(within(row).getAllByText('—')).toHaveLength(2);
    expect(within(row).getByText('REJECTED')).toBeTruthy();
  });

  it('marks an approved brand that the partner paused', async () => {
    renderTable([
      brandRow({ id: 'b1', brand_name: 'Live Brand', status: 'APPROVED', is_active: true }),
      brandRow({ id: 'b2', brand_name: 'Paused Brand', status: 'APPROVED', is_active: false }),
    ]);

    const live = gridRow(await screen.findByText('Live Brand'));
    const paused = gridRow(screen.getByText('Paused Brand'));
    expect(within(live).queryByText('PAUSED')).toBeNull();
    expect(within(paused).getByText('PAUSED')).toBeTruthy();
  });

  it('offers product management and pause only on approved brands', async () => {
    const { handlers } = renderTable([
      brandRow({ id: 'b1', brand_name: 'Live Brand', status: 'APPROVED', is_active: true }),
      brandRow({ id: 'b2', brand_name: 'Paused Brand', status: 'APPROVED', is_active: false }),
      brandRow({ id: 'b3', brand_name: 'Draft Brand', status: 'DRAFT' }),
    ]);

    const live = gridRow(await screen.findByText('Live Brand'));
    fireEvent.click(within(live).getByRole('button', { name: 'Product management' }));
    expect(handlers.onManageProducts).toHaveBeenCalledWith(expect.objectContaining({ id: 'b1' }));
    fireEvent.click(within(live).getByRole('button', { name: 'Temporarily deactivate' }));
    expect(handlers.onToggleActive).toHaveBeenCalledWith(expect.objectContaining({ id: 'b1' }));

    const paused = gridRow(screen.getByText('Paused Brand'));
    fireEvent.click(within(paused).getByRole('button', { name: 'Reactivate' }));
    expect(handlers.onToggleActive).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'b2' }));

    const draft = gridRow(screen.getByText('Draft Brand'));
    expect(within(draft).queryByRole('button', { name: 'Product management' })).toBeNull();
    expect(within(draft).queryByRole('button', { name: 'Temporarily deactivate' })).toBeNull();
    expect(within(draft).queryByRole('button', { name: 'Reactivate' })).toBeNull();
  });

  it('opens a brand under review read-only and a draft for editing', async () => {
    const { handlers } = renderTable([
      brandRow({ id: 'b1', brand_name: 'Submitted Brand', status: 'SUBMITTED' }),
      brandRow({ id: 'b2', brand_name: 'Draft Brand', status: 'DRAFT' }),
    ]);

    const submitted = gridRow(await screen.findByText('Submitted Brand'));
    expect(within(submitted).queryByRole('button', { name: 'Edit' })).toBeNull();
    fireEvent.click(within(submitted).getByRole('button', { name: 'View' }));
    expect(handlers.onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'b1' }));

    const draft = gridRow(screen.getByText('Draft Brand'));
    expect(within(draft).queryByRole('button', { name: 'View' })).toBeNull();
    fireEvent.click(within(draft).getByRole('button', { name: 'Edit' }));
    expect(handlers.onOpen).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'b2' }));
  });

  it('sends the brand to its settings', async () => {
    const { handlers } = renderTable([brandRow()]);

    const row = gridRow(await screen.findByText('Chai Point'));
    fireEvent.click(within(row).getByRole('button', { name: 'Brand settings' }));
    expect(handlers.onSettings).toHaveBeenCalledWith(expect.objectContaining({ id: 'b1' }));
  });

  it('opens the brand when its row is clicked', async () => {
    const { handlers } = renderTable([brandRow()]);

    fireEvent.click(await screen.findByText('Chai Point'));
    await waitFor(() => expect(handlers.onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'b1' })));
  });

  it('formats the hidden Updated column once the partner reveals it', async () => {
    renderTable([brandRow(), brandRow({ id: 'b2', brand_name: 'Never Updated', updated_at: null })]);
    await screen.findByText('Chai Point');
    expect(screen.queryByText(formatDate('2026-07-01T10:00:00'))).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Columns' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Updated' }));
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });

    expect(await screen.findByText(formatDate('2026-07-01T10:00:00'))).toBeTruthy();
    const updatedCells = [
      ...document.querySelectorAll<HTMLElement>('[role="gridcell"][col-id="updated_at"]'),
    ].map((cell) => cell.textContent);
    expect(updatedCells).toContain('—');
  });

  it('says so when the partner has no brands yet', async () => {
    renderTable([]);
    expect(await screen.findByText('No brands yet — create your first product brand to get started.')).toBeTruthy();
  });

  it('publishes a reload handle for the page', async () => {
    const refetchRef = { current: null as (() => void) | null };
    const { fetchRows } = renderTable([brandRow()], refetchRef);

    await screen.findByText('Chai Point');
    expect(refetchRef.current).not.toBeNull();
    refetchRef.current?.();
    await waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(2));
  });
});
