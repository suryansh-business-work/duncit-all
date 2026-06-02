import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HostsTable from './HostsTable';

const full = {
  id: '1', full_name: 'Asha', user_id: 'u1', email: 'a@b.com', phone: '999',
  pan_number: 'PAN', aadhar_number: 'AAD', status: 'APPROVED', submitted_at: '2026-01-02',
};
const sparse = {
  id: '2', full_name: '', user_id: 'u2', email: '', phone: '',
  pan_number: '', aadhar_number: '', status: 'DRAFT', submitted_at: null,
};

describe('HostsTable', () => {
  it('renders rows with values and fallbacks and fires actions', () => {
    const onEdit = vi.fn();
    const onReview = vi.fn();
    render(<HostsTable hosts={[full, sparse]} onEdit={onEdit} onReview={onReview} />);
    expect(screen.getByText('Asha')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole('button')[0]);
    fireEvent.click(screen.getAllByRole('button')[1]);
    expect(onEdit).toHaveBeenCalledWith(full);
    expect(onReview).toHaveBeenCalledWith(full);
  });

  it('shows an empty state', () => {
    render(<HostsTable hosts={[]} onEdit={vi.fn()} onReview={vi.fn()} />);
    expect(screen.getByText('No hosts found.')).toBeInTheDocument();
  });
});
