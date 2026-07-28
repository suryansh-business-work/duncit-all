import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { DuncitColumn } from '@duncit/table';
import {
  DASHBOARD_HOST_POD_COLUMNS,
  DASHBOARD_PRODUCT_COLUMNS,
  DASHBOARD_VENUE_COLUMNS,
  getDashboardRowId,
  type DashboardHostPodRow,
  type DashboardProductRow,
  type DashboardVenueRow,
} from './dashboard-tables';

afterEach(cleanup);

function column<T>(columns: DuncitColumn<T>[], field: string): DuncitColumn<T> {
  const found = columns.find((col) => col.field === field);
  if (!found) throw new Error(`No column for field "${field}"`);
  return found;
}

function valueOf<T>(columns: DuncitColumn<T>[], field: string, row: T): unknown {
  const getter = column(columns, field).valueGetter;
  if (!getter) throw new Error(`Column "${field}" has no valueGetter`);
  return getter(row);
}

const venue: DashboardVenueRow = {
  id: 'v1',
  venue_name: 'Skyline Rooftop',
  city: 'Pune',
  locality: 'Koregaon Park',
  capacity: 120,
  status: 'APPROVED',
  updated_at: '2026-03-14T10:30:00',
  created_at: '2026-01-02T08:00:00',
};

const pod: DashboardHostPodRow = {
  id: 'p1',
  pod_title: 'Sunset Supper Club',
  pod_date_time: '2026-03-14T18:30:00',
  pod_amount: 500,
  pod_attendees: ['host-1', 'u2', 'u3'],
  pod_hosts_id: ['host-1'],
  is_active: true,
  completed_at: null,
};

const product: DashboardProductRow = {
  id: 'pr1',
  product_name: 'Cold Brew Kit',
  available_count: 7,
  inventory_count: 20,
  unit_cost: 1499,
  listing_review_status: 'APPROVED',
  updated_at: '2026-03-14T10:30:00',
};

describe('getDashboardRowId', () => {
  it('identifies a row by its id', () => {
    expect(getDashboardRowId({ id: 'abc' })).toBe('abc');
  });
});

describe('DASHBOARD_VENUE_COLUMNS', () => {
  it('exposes the venue, capacity, status and updated columns in order', () => {
    expect(DASHBOARD_VENUE_COLUMNS.map((col) => col.field)).toEqual([
      'venue_name',
      'capacity',
      'status',
      'updated_at',
    ]);
    expect(DASHBOARD_VENUE_COLUMNS.map((col) => col.headerName)).toEqual([
      'Venue',
      'Capacity',
      'Status',
      'Updated',
    ]);
  });

  it('falls back to a placeholder name and coerces a missing capacity to 0', () => {
    expect(valueOf(DASHBOARD_VENUE_COLUMNS, 'venue_name', venue)).toBe('Skyline Rooftop');
    expect(
      valueOf(DASHBOARD_VENUE_COLUMNS, 'venue_name', { ...venue, venue_name: null }),
    ).toBe('Untitled venue');
    expect(valueOf(DASHBOARD_VENUE_COLUMNS, 'capacity', venue)).toBe(120);
    expect(valueOf(DASHBOARD_VENUE_COLUMNS, 'capacity', { ...venue, capacity: null })).toBe(0);
  });

  it('sorts Updated by updated_at, falling back to created_at then to a placeholder', () => {
    expect(valueOf(DASHBOARD_VENUE_COLUMNS, 'updated_at', venue)).toBe('14 Mar 2026');
    expect(
      valueOf(DASHBOARD_VENUE_COLUMNS, 'updated_at', { ...venue, updated_at: null }),
    ).toBe('02 Jan 2026');
    expect(
      valueOf(DASHBOARD_VENUE_COLUMNS, 'updated_at', {
        ...venue,
        updated_at: null,
        created_at: null,
      }),
    ).toBe('Not available');
  });

  it('offers the four venue lifecycle states as select filter options', () => {
    expect(column(DASHBOARD_VENUE_COLUMNS, 'status').filter).toEqual({
      type: 'select',
      options: [
        { value: 'DRAFT', label: 'DRAFT' },
        { value: 'SUBMITTED', label: 'SUBMITTED' },
        { value: 'APPROVED', label: 'APPROVED' },
        { value: 'REJECTED', label: 'REJECTED' },
      ],
    });
    expect(column(DASHBOARD_VENUE_COLUMNS, 'capacity').filter).toEqual({ type: 'number' });
  });

  it('renders the venue cell with its name and "locality, city" line', () => {
    const cellRenderer = column(DASHBOARD_VENUE_COLUMNS, 'venue_name').cellRenderer!;
    render(<>{cellRenderer(venue)}</>);
    expect(screen.getByText('Skyline Rooftop')).toBeTruthy();
    expect(screen.getByText('Koregaon Park, Pune')).toBeTruthy();
  });

  it('renders placeholders when the venue has no name or location', () => {
    const cellRenderer = column(DASHBOARD_VENUE_COLUMNS, 'venue_name').cellRenderer!;
    render(<>{cellRenderer({ ...venue, venue_name: '', locality: null, city: null })}</>);
    expect(screen.getByText('Untitled venue')).toBeTruthy();
    expect(screen.getByText('Location pending')).toBeTruthy();
  });

  it('renders the status chip, labelling a blank status as PENDING', () => {
    const cellRenderer = column(DASHBOARD_VENUE_COLUMNS, 'status').cellRenderer!;
    const { rerender } = render(<>{cellRenderer(venue)}</>);
    expect(screen.getByText('APPROVED')).toBeTruthy();
    rerender(<>{cellRenderer({ ...venue, status: '' })}</>);
    expect(screen.getByText('PENDING')).toBeTruthy();
  });
});

describe('DASHBOARD_HOST_POD_COLUMNS', () => {
  it('formats the pod date and says "Not scheduled" when there is none', () => {
    expect(valueOf(DASHBOARD_HOST_POD_COLUMNS, 'pod_date_time', pod)).toBe(
      '14 Mar 2026, 6:30 PM',
    );
    expect(
      valueOf(DASHBOARD_HOST_POD_COLUMNS, 'pod_date_time', { ...pod, pod_date_time: null }),
    ).toBe('Not scheduled');
  });

  it('counts every attendee but bills only the non-host spots', () => {
    expect(valueOf(DASHBOARD_HOST_POD_COLUMNS, 'attendees', pod)).toBe(3);
    // 3 attendees, one of whom is the host, at ₹500 → 2 paying spots.
    expect(valueOf(DASHBOARD_HOST_POD_COLUMNS, 'earning', pod)).toBe('₹1,000');
  });

  it('earns nothing when there are no attendees or no amount', () => {
    expect(
      valueOf(DASHBOARD_HOST_POD_COLUMNS, 'earning', { ...pod, pod_attendees: null }),
    ).toBe('₹0');
    expect(valueOf(DASHBOARD_HOST_POD_COLUMNS, 'attendees', { ...pod, pod_attendees: null })).toBe(
      0,
    );
    expect(valueOf(DASHBOARD_HOST_POD_COLUMNS, 'earning', { ...pod, pod_amount: null })).toBe('₹0');
  });

  it('keeps the raw amount as a hidden, number-filterable column', () => {
    const amount = column(DASHBOARD_HOST_POD_COLUMNS, 'pod_amount');
    expect(amount.hide).toBe(true);
    expect(amount.filter).toEqual({ type: 'number' });
    expect(valueOf(DASHBOARD_HOST_POD_COLUMNS, 'pod_amount', { ...pod, pod_amount: null })).toBe(0);
  });

  it('marks the derived attendee and earning columns unsortable', () => {
    expect(column(DASHBOARD_HOST_POD_COLUMNS, 'attendees').sortable).toBe(false);
    expect(column(DASHBOARD_HOST_POD_COLUMNS, 'earning').sortable).toBe(false);
    expect(valueOf(DASHBOARD_HOST_POD_COLUMNS, 'pod_title', pod)).toBe('Sunset Supper Club');
  });
});

describe('DASHBOARD_PRODUCT_COLUMNS', () => {
  it('reports inventory from the available count, not the stocked count', () => {
    expect(valueOf(DASHBOARD_PRODUCT_COLUMNS, 'inventory_count', product)).toBe('7 available');
    expect(
      valueOf(DASHBOARD_PRODUCT_COLUMNS, 'inventory_count', { ...product, available_count: null }),
    ).toBe('0 available');
  });

  it('formats the unit cost as INR', () => {
    expect(valueOf(DASHBOARD_PRODUCT_COLUMNS, 'unit_cost', product)).toBe('₹1,499');
    expect(valueOf(DASHBOARD_PRODUCT_COLUMNS, 'unit_cost', { ...product, unit_cost: null })).toBe(
      '₹0',
    );
    expect(valueOf(DASHBOARD_PRODUCT_COLUMNS, 'product_name', product)).toBe('Cold Brew Kit');
  });

  it('filters listing status by the moderation vocabulary', () => {
    expect(column(DASHBOARD_PRODUCT_COLUMNS, 'listing_review_status').filter).toEqual({
      type: 'select',
      options: [
        { value: 'PENDING', label: 'PENDING' },
        { value: 'APPROVED', label: 'APPROVED' },
        { value: 'DENIED', label: 'DENIED' },
      ],
    });
    expect(valueOf(DASHBOARD_PRODUCT_COLUMNS, 'listing_review_status', product)).toBe('APPROVED');
  });

  it('renders the listing status chip', () => {
    const cellRenderer = column(DASHBOARD_PRODUCT_COLUMNS, 'listing_review_status').cellRenderer!;
    render(<>{cellRenderer({ ...product, listing_review_status: 'DENIED' })}</>);
    expect(screen.getByText('DENIED')).toBeTruthy();
  });
});
