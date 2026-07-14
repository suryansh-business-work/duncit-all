import '../helpers/agGridEnv';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { MutableRefObject } from 'react';
import { CrmLeadsTable } from '@/components/lead-table';
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

const noOptions: { value: string; label: string }[] = [];

function makeFetch<T>(rows: T[]) {
  return vi.fn(async () => ({ rows, total: rows.length }));
}

function renderLeadTable<T extends { id: string }>(
  entity: 'host' | 'venue' | 'ecomm',
  fetchRows: ReturnType<typeof makeFetch<T>>,
) {
  const onView = vi.fn();
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  const refetchRef: MutableRefObject<(() => void) | null> = { current: null };
  render(
    <CrmLeadsTable
      entity={entity}
      fetchRows={fetchRows as any}
      refetchRef={refetchRef}
      statusOptions={noOptions}
      priorityOptions={noOptions}
      superCategoryOptions={noOptions}
      onView={onView}
      onEdit={onEdit}
      onDelete={onDelete}
    />,
  );
  return { onView, onEdit, onDelete };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('CrmLeadsTable (venue)', () => {
  it('renders rows from fetchRows and requests the default follow-up sort', async () => {
    const fetchRows = makeFetch([venueLead]);
    renderLeadTable('venue', fetchRows);

    expect(await screen.findByText('Grand Hall')).toBeTruthy();
    expect(screen.getByText('Mumbai')).toBeTruthy();
    expect(fetchRows).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 25, sortBy: 'next_follow_up_date', sortDir: 'asc' }),
    );
  });

  // Row-click → onView goes through AG Grid's rowClicked event, which never
  // fires in jsdom; the cypress spec lead-list.cy.ts covers it in a browser.
  it('wires the lead search placeholder into the table toolbar', async () => {
    renderLeadTable('venue', makeFetch([venueLead]));
    await screen.findByText('Grand Hall');
    expect(screen.getByPlaceholderText('Search name, city, phone or email')).toBeTruthy();
  });

  it('shows the empty text when there are no rows', async () => {
    renderLeadTable('venue', makeFetch<VenueLead>([]));
    expect(await screen.findByText(/No venue leads yet/i)).toBeTruthy();
  });
});

describe('CrmLeadsTable (host)', () => {
  it('shows the contact mobile and the host-only Type column', async () => {
    renderLeadTable('host', makeFetch([hostLead]));
    expect(await screen.findByText('Bob Co')).toBeTruthy();
    expect(screen.getByText('+91-8888888888')).toBeTruthy();
    expect(screen.getByText('Corporate')).toBeTruthy();
    expect(screen.getByText('Delhi')).toBeTruthy();
  });

  it('Edit + Delete actions fire their handlers without bubbling into onView', async () => {
    const { onView, onEdit, onDelete } = renderLeadTable('host', makeFetch([hostLead]));
    await screen.findByText('Bob Co');

    fireEvent.click(screen.getByLabelText('Edit lead'));
    fireEvent.click(screen.getByLabelText('Delete lead'));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'h1' }));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'h1' }));
    expect(onView).not.toHaveBeenCalled();
  });

  it('falls back to em-dashes when host_type and city are missing', async () => {
    renderLeadTable('host', makeFetch([{ ...hostLead, host_type: null, city: null } as any]));
    await screen.findByText('Bob Co');
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });
});

describe('CrmLeadsTable (ecomm)', () => {
  it('shows the ecomm-only Brand column', async () => {
    const ecommLead = {
      ...hostLead,
      id: 'e1',
      seller_name: 'Seller One',
      brand_name: 'BrandX',
    } as any;
    renderLeadTable('ecomm', makeFetch([ecommLead]));
    expect(await screen.findByText('Seller One')).toBeTruthy();
    expect(screen.getByText('BrandX')).toBeTruthy();
  });
});
