import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HostsTable from './HostsTable';

interface Handlers {
  onEdit?: ReturnType<typeof vi.fn>;
  onReview?: ReturnType<typeof vi.fn>;
  onToggleActive?: ReturnType<typeof vi.fn>;
  onDelete?: ReturnType<typeof vi.fn>;
  canHardDelete?: boolean;
}

const renderTable = (hosts: unknown[], h: Handlers = {}) =>
  render(
    <MemoryRouter>
      <HostsTable
        hosts={hosts as never}
        onEdit={h.onEdit ?? vi.fn()}
        onReview={h.onReview ?? vi.fn()}
        canHardDelete={h.canHardDelete ?? false}
        onToggleActive={h.onToggleActive ?? vi.fn()}
        onDelete={h.onDelete ?? vi.fn()}
      />
    </MemoryRouter>,
  );

const full = {
  id: '1', full_name: 'Asha', user_id: 'u1', email: 'a@b.com', phone: '999',
  pan_number: 'PAN', aadhar_number: 'AAD', status: 'APPROVED', is_active: true, submitted_at: '2026-01-02',
  host_commission_pct: 12,
  host_categories: [
    { super_category_name: 'For You', category_name: 'Sports', sub_category_name: 'Badminton', request_no: 'HOSTREQ-000001' },
    { super_category_name: '', category_name: 'Music', sub_category_name: '', request_no: '' },
    { super_category_name: '', category_name: '', sub_category_name: '', request_no: 'HOSTREQ-000003' },
  ],
};
const sparse = {
  id: '2', full_name: '', user_id: 'u2', email: '', phone: '',
  pan_number: '', aadhar_number: '', status: 'DRAFT', is_active: false, submitted_at: null,
  host_commission_pct: 0,
  host_categories: [],
};

describe('HostsTable', () => {
  it('renders rows with values and fallbacks and fires actions', () => {
    const onEdit = vi.fn();
    const onReview = vi.fn();
    renderTable([full, sparse], { onEdit, onReview });
    expect(screen.getByText('Asha')).toBeInTheDocument();
    expect(screen.getByText('For You › Sports › Badminton')).toBeInTheDocument();
    expect(screen.getByText('Music')).toBeInTheDocument();
    expect(screen.getByText('12%')).toBeInTheDocument();
    expect(screen.getByText('Default')).toBeInTheDocument();
    // 'Active' matches the column header + the active chip.
    expect(screen.getAllByText('Active').length).toBeGreaterThan(1);
    expect(screen.getByText('Inactive')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button')[0]);
    fireEvent.click(screen.getAllByRole('button')[1]);
    expect(onEdit).toHaveBeenCalledWith(full);
    expect(onReview).toHaveBeenCalledWith(full);
  });

  it('fires deactivate and gates the developer delete', () => {
    const onToggleActive = vi.fn();
    const onDelete = vi.fn();
    renderTable([full], { onToggleActive, onDelete, canHardDelete: true });
    const buttons = screen.getAllByRole('button');
    // [edit, review, toggle, delete]
    expect(buttons).toHaveLength(4);
    fireEvent.click(buttons[2]);
    expect(onToggleActive).toHaveBeenCalledWith(full);
    fireEvent.click(buttons[3]);
    expect(onDelete).toHaveBeenCalledWith(full);
  });

  it('shows an empty state', () => {
    renderTable([]);
    expect(screen.getByText('No hosts found.')).toBeInTheDocument();
  });
});
