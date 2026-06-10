import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VenuesTable from './VenuesTable';

const renderTable = (venues: unknown[], onEdit = vi.fn(), onReview = vi.fn()) =>
  render(
    <MemoryRouter>
      <VenuesTable venues={venues as never} onEdit={onEdit} onReview={onReview} />
    </MemoryRouter>,
  );

const full = {
  id: '1', venue_name: 'The Loft', venue_type: 'CAFE', locality: 'Kothrud', city: 'Pune',
  postal_code: '411038', owner_name: 'Asha', owner_phone: '999', owner_email: 'a@b.com',
  capacity: 40, status: 'APPROVED', submitted_at: '2026-01-02',
};
const sparse = {
  id: '2', venue_name: 'X', venue_type: 'BAR', locality: '', city: '',
  postal_code: '', owner_name: '', owner_phone: '', owner_email: '',
  capacity: 0, status: 'DRAFT', submitted_at: null,
};

describe('VenuesTable', () => {
  it('renders venues with fallbacks and fires edit/review', () => {
    const onEdit = vi.fn();
    const onReview = vi.fn();
    renderTable([full, sparse], onEdit, onReview);
    expect(screen.getByText('The Loft')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[1]);
    expect(onEdit).toHaveBeenCalledWith(full);
    expect(onReview).toHaveBeenCalledWith(full);
  });

  it('shows an empty state', () => {
    renderTable([]);
    expect(screen.getByText('No venues found.')).toBeInTheDocument();
  });
});
