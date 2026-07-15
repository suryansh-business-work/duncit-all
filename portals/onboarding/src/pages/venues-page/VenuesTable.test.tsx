import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { TableFetch } from '@duncit/table';
import VenuesTable from './VenuesTable';
import type { VenueRow } from './queries';

interface Handlers {
  onEdit?: ReturnType<typeof vi.fn>;
  onReview?: ReturnType<typeof vi.fn>;
  onToggleActive?: ReturnType<typeof vi.fn>;
  onDelete?: ReturnType<typeof vi.fn>;
  canHardDelete?: boolean;
}

const makeFetch = (rows: VenueRow[]) =>
  vi.fn(async () => ({ rows, total: rows.length })) as TableFetch<VenueRow>;

const renderTable = (venues: VenueRow[], h: Handlers = {}) =>
  render(
    <MemoryRouter>
      <VenuesTable
        fetchRows={makeFetch(venues)}
        refetchRef={{ current: null }}
        onEdit={h.onEdit ?? vi.fn()}
        onReview={h.onReview ?? vi.fn()}
        canHardDelete={h.canHardDelete ?? false}
        onToggleActive={h.onToggleActive ?? vi.fn()}
        onDelete={h.onDelete ?? vi.fn()}
      />
    </MemoryRouter>,
  );

const full: VenueRow = {
  id: '1', venue_name: 'The Loft', venue_type: 'CAFE', locality: 'Kothrud', city: 'Pune',
  postal_code: '411038', owner_name: 'Asha', owner_phone: '999', owner_email: 'a@b.com',
  capacity: 40, status: 'APPROVED', is_active: true, submitted_at: '2026-01-02', venue_commission_pct: 15,
  pod_count: 4,
  venue_category: { super_category_name: 'Sports', category_name: 'Cricket', sub_category_name: 'Box Cricket' },
};
const sparse: VenueRow = {
  id: '2', venue_name: 'X', venue_type: 'BAR', locality: '', city: '',
  postal_code: '', owner_name: '', owner_phone: '', owner_email: '',
  capacity: 0, status: 'DRAFT', is_active: false, submitted_at: null, venue_commission_pct: 0,
};

beforeEach(() => {
  window.localStorage.clear();
});

describe('VenuesTable', () => {
  it('renders venues with fallbacks and fires edit/review', async () => {
    const onEdit = vi.fn();
    const onReview = vi.fn();
    renderTable([full, sparse], { onEdit, onReview });
    expect(await screen.findByText('The Loft')).toBeInTheDocument();
    expect(screen.getByText('Kothrud, Pune')).toBeInTheDocument();
    expect(screen.getByText('15%')).toBeInTheDocument();
    expect(screen.getByText('Default')).toBeInTheDocument();
    // Category column: the full row shows "Super > Cat > Sub"; the sparse row "—".
    expect(screen.getByText('Sports > Cricket > Box Cricket')).toBeInTheDocument();
    // 'Active' matches the column header + the active chip.
    expect(screen.getAllByText('Active').length).toBeGreaterThan(1);
    expect(screen.getByText('Inactive')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Review' })[0]);
    expect(onEdit).toHaveBeenCalledWith(full);
    expect(onReview).toHaveBeenCalledWith(full);
  });

  it('fires deactivate and hides delete for non-developers', async () => {
    const onToggleActive = vi.fn();
    renderTable([full], { onToggleActive, canHardDelete: false });
    expect(await screen.findByText('The Loft')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete permanently (developer)' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
    expect(onToggleActive).toHaveBeenCalledWith(full);
  });

  it('shows the developer delete action and fires it', async () => {
    const onDelete = vi.fn();
    renderTable([sparse], { onDelete, canHardDelete: true });
    expect(await screen.findByText('X')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete permanently (developer)' }));
    expect(onDelete).toHaveBeenCalledWith(sparse);
  });

  it('shows an empty state', async () => {
    renderTable([]);
    expect(await screen.findByText('No venues found.')).toBeInTheDocument();
  });
});
