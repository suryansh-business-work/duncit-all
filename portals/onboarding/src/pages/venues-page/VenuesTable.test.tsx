import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VenuesTable from './VenuesTable';

interface Handlers {
  onEdit?: ReturnType<typeof vi.fn>;
  onReview?: ReturnType<typeof vi.fn>;
  onToggleActive?: ReturnType<typeof vi.fn>;
  onDelete?: ReturnType<typeof vi.fn>;
  canHardDelete?: boolean;
}

const renderTable = (venues: unknown[], h: Handlers = {}) =>
  render(
    <MemoryRouter>
      <VenuesTable
        venues={venues as never}
        onEdit={h.onEdit ?? vi.fn()}
        onReview={h.onReview ?? vi.fn()}
        canHardDelete={h.canHardDelete ?? false}
        onToggleActive={h.onToggleActive ?? vi.fn()}
        onDelete={h.onDelete ?? vi.fn()}
      />
    </MemoryRouter>,
  );

const full = {
  id: '1', venue_name: 'The Loft', venue_type: 'CAFE', locality: 'Kothrud', city: 'Pune',
  postal_code: '411038', owner_name: 'Asha', owner_phone: '999', owner_email: 'a@b.com',
  capacity: 40, status: 'APPROVED', is_active: true, submitted_at: '2026-01-02', venue_commission_pct: 15,
  pod_count: 4,
};
const sparse = {
  id: '2', venue_name: 'X', venue_type: 'BAR', locality: '', city: '',
  postal_code: '', owner_name: '', owner_phone: '', owner_email: '',
  capacity: 0, status: 'DRAFT', is_active: false, submitted_at: null, venue_commission_pct: 0,
};

describe('VenuesTable', () => {
  it('renders venues with fallbacks and fires edit/review', () => {
    const onEdit = vi.fn();
    const onReview = vi.fn();
    renderTable([full, sparse], { onEdit, onReview });
    expect(screen.getByText('The Loft')).toBeInTheDocument();
    expect(screen.getByText('15%')).toBeInTheDocument();
    expect(screen.getByText('Default')).toBeInTheDocument();
    // 'Active' matches the column header + the active chip.
    expect(screen.getAllByText('Active').length).toBeGreaterThan(1);
    expect(screen.getByText('Inactive')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[1]);
    expect(onEdit).toHaveBeenCalledWith(full);
    expect(onReview).toHaveBeenCalledWith(full);
  });

  it('fires deactivate and hides delete for non-developers', () => {
    const onToggleActive = vi.fn();
    renderTable([full], { onToggleActive, canHardDelete: false });
    // [edit, review, toggle] — no delete button without developer access.
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    fireEvent.click(buttons[2]);
    expect(onToggleActive).toHaveBeenCalledWith(full);
  });

  it('shows the developer delete action and fires it', () => {
    const onDelete = vi.fn();
    renderTable([full], { onDelete, canHardDelete: true });
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(4);
    fireEvent.click(buttons[3]);
    expect(onDelete).toHaveBeenCalledWith(full);
  });

  it('shows an empty state', () => {
    renderTable([]);
    expect(screen.getByText('No venues found.')).toBeInTheDocument();
  });
});
