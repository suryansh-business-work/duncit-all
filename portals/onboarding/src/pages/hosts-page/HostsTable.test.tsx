import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { TableFetch } from '@duncit/table';
import HostsTable from './HostsTable';
import type { HostRow } from './queries';

interface Handlers {
  onEdit?: ReturnType<typeof vi.fn>;
  onReview?: ReturnType<typeof vi.fn>;
  onToggleActive?: ReturnType<typeof vi.fn>;
  onDelete?: ReturnType<typeof vi.fn>;
  canHardDelete?: boolean;
}

const makeFetch = (rows: HostRow[]) =>
  vi.fn(async () => ({ rows, total: rows.length })) as TableFetch<HostRow>;

const renderTable = (hosts: HostRow[], h: Handlers = {}) =>
  render(
    <MemoryRouter>
      <HostsTable
        fetchRows={makeFetch(hosts)}
        refetchRef={{ current: null }}
        onEdit={h.onEdit ?? vi.fn()}
        onReview={h.onReview ?? vi.fn()}
        canHardDelete={h.canHardDelete ?? false}
        onToggleActive={h.onToggleActive ?? vi.fn()}
        onDelete={h.onDelete ?? vi.fn()}
      />
    </MemoryRouter>,
  );

const full: HostRow = {
  id: '1', full_name: 'Asha', user_id: 'u1', email: 'a@b.com', phone: '999',
  pan_number: 'PAN', aadhar_number: 'AAD', status: 'APPROVED', is_active: true, submitted_at: '2026-01-02',
  host_commission_pct: 12,
  host_categories: [
    { super_category_name: 'For You', category_name: 'Sports', sub_category_name: 'Badminton', request_no: 'HOSTREQ-000001' },
    { super_category_name: '', category_name: 'Music', sub_category_name: '', request_no: '' },
    { super_category_name: '', category_name: '', sub_category_name: '', request_no: 'HOSTREQ-000003' },
  ],
};
const sparse: HostRow = {
  id: '2', full_name: '', user_id: 'u2', email: '', phone: '',
  pan_number: '', aadhar_number: '', status: 'DRAFT', is_active: false, submitted_at: null,
  host_commission_pct: 0,
  host_categories: [],
};
// host_categories omitted entirely (nullish fallback path).
const noCats: HostRow = {
  id: '3', full_name: 'Ravi', user_id: 'u3', email: 'r@b.com', phone: '888',
  pan_number: 'PAN3', aadhar_number: 'AAD3', status: 'SUBMITTED', is_active: true, submitted_at: '2026-02-02',
  host_commission_pct: 5,
};

beforeEach(() => {
  window.localStorage.clear();
});

describe('HostsTable', () => {
  it('renders rows with values and fallbacks and fires actions', async () => {
    const onEdit = vi.fn();
    const onReview = vi.fn();
    renderTable([full, sparse, noCats], { onEdit, onReview });
    expect(await screen.findByText('Asha')).toBeInTheDocument();
    expect(screen.getByText('Ravi')).toBeInTheDocument();
    expect(screen.getByText('For You › Sports › Badminton')).toBeInTheDocument();
    expect(screen.getByText('Music')).toBeInTheDocument();
    expect(screen.getByText('12%')).toBeInTheDocument();
    expect(screen.getByText('Default')).toBeInTheDocument();
    // 'Active' matches the column header + the active chip.
    expect(screen.getAllByText('Active').length).toBeGreaterThan(1);
    // A non-APPROVED host (SUBMITTED/DRAFT) is Inactive, so more than one shows.
    expect(screen.getAllByText('Inactive').length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Review' })[0]);
    expect(onEdit).toHaveBeenCalledWith(full);
    expect(onReview).toHaveBeenCalledWith(full);
  });

  it('fires deactivate and gates the developer delete', async () => {
    const onToggleActive = vi.fn();
    const onDelete = vi.fn();
    renderTable([full], { onToggleActive, onDelete, canHardDelete: true });
    expect(await screen.findByText('Asha')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
    expect(onToggleActive).toHaveBeenCalledWith(full);
    fireEvent.click(screen.getByRole('button', { name: 'Delete permanently (developer)' }));
    expect(onDelete).toHaveBeenCalledWith(full);
  });

  it('hides the developer delete without access and shows Activate for inactive hosts', async () => {
    renderTable([sparse], { canHardDelete: false });
    expect(await screen.findByText('u2')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete permanently (developer)' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Activate' })).toBeInTheDocument();
  });

  it('shows an empty state', async () => {
    renderTable([]);
    expect(await screen.findByText('No hosts found.')).toBeInTheDocument();
  });
});
