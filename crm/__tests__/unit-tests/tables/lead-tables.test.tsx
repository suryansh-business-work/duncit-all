import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import VenueLeadsTable from '@/pages/venue-leads/VenueLeadsTable';
import HostLeadsTable from '@/pages/host-leads/HostLeadsTable';
import type { HostLead, VenueLead } from '@/api/crm.types';

const venueLead: VenueLead = {
  id: 'v1',
  venue_name: 'Grand Hall',
  city: 'Mumbai',
  lead_status: 'New',
  priority: 'High',
  next_follow_up_date: '2026-06-01',
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  contacts: [{ name: 'Alice', mobile_number: '+91-9999999999', email: 'a@b.test' }],
} as any;

const hostLead: HostLead = {
  id: 'h1',
  host_name: 'Bob Co',
  host_type: 'Corporate',
  city: 'Delhi',
  lead_status: 'New',
  priority: 'Medium',
  next_follow_up_date: '2026-06-15',
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  contacts: [{ name: 'Bob', mobile_number: '+91-8888888888', email: 'b@b.test' }],
} as any;

describe('VenueLeadsTable', () => {
  it('renders rows and fires onView on row click', () => {
    const onView = vi.fn();
    const onEdit = vi.fn();
    const onEmail = vi.fn();
    const onCall = vi.fn();
    const onDelete = vi.fn();

    render(
      <VenueLeadsTable
        leads={[venueLead]}
        onView={onView}
        onEdit={onEdit}
        onEmail={onEmail}
        onCall={onCall}
        onDelete={onDelete}
      />
    );

    expect(screen.getByText('Grand Hall')).toBeTruthy();
    expect(screen.getByText('Mumbai')).toBeTruthy();
    fireEvent.click(screen.getByText('Grand Hall'));
    expect(onView).toHaveBeenCalledWith(expect.objectContaining({ id: 'v1' }));
  });

  it('fires action callbacks without bubbling to onView', () => {
    const onView = vi.fn();
    const onEdit = vi.fn();
    const onEmail = vi.fn();
    const onCall = vi.fn();
    const onDelete = vi.fn();
    render(
      <VenueLeadsTable
        leads={[venueLead]}
        onView={onView}
        onEdit={onEdit}
        onEmail={onEmail}
        onCall={onCall}
        onDelete={onDelete}
      />
    );
    fireEvent.click(screen.getByLabelText(/Email/i));
    fireEvent.click(screen.getByLabelText(/Call/i));
    fireEvent.click(screen.getByLabelText(/Edit/i));
    fireEvent.click(screen.getByLabelText(/Delete/i));
    expect(onEmail).toHaveBeenCalledTimes(1);
    expect(onCall).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onView).not.toHaveBeenCalled();
  });
});

describe('HostLeadsTable', () => {
  it('renders rows and shows the contact mobile in the host cell', () => {
    const noop = vi.fn();
    render(
      <HostLeadsTable
        leads={[hostLead]}
        onView={noop}
        onEdit={noop}
        onEmail={noop}
        onCall={noop}
        onDelete={noop}
      />
    );
    expect(screen.getByText('Bob Co')).toBeTruthy();
    expect(screen.getByText('+91-8888888888')).toBeTruthy();
    expect(screen.getByText('Corporate')).toBeTruthy();
    expect(screen.getByText('Delhi')).toBeTruthy();
  });

  it('falls back to em-dash when host_type or city are missing', () => {
    const noop = vi.fn();
    render(
      <HostLeadsTable
        leads={[{ ...hostLead, host_type: null, city: null } as any]}
        onView={noop}
        onEdit={noop}
        onEmail={noop}
        onCall={noop}
        onDelete={noop}
      />
    );
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it('renders the empty grid without crashing when leads is []', () => {
    const noop = vi.fn();
    const { container } = render(
      <HostLeadsTable
        leads={[]}
        onView={noop}
        onEdit={noop}
        onEmail={noop}
        onCall={noop}
        onDelete={noop}
      />
    );
    expect(container.querySelector('.MuiDataGrid-root')).toBeTruthy();
  });
});
