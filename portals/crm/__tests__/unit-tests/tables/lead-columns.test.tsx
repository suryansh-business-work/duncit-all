import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { buildLeadColumns, type CrmLeadEntity, type CrmLeadRowBase } from '@/components/lead-table/leadColumns';

type Row = CrmLeadRowBase & Record<string, unknown>;

const t = ((key: string) => key) as Parameters<typeof buildLeadColumns>[0]['t'];

const build = (entity: CrmLeadEntity) =>
  buildLeadColumns<Row>({
    entity,
    statusOptions: [],
    priorityOptions: [],
    superCategoryOptions: [],
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    t,
  });

const row = (overrides: Partial<Row> = {}): Row => ({ id: 'l-1', lead_status: 'New', priority: 'High', ...overrides });

const column = (entity: CrmLeadEntity, field: string) => {
  const found = build(entity).find((c) => c.field === field);
  if (!found) throw new Error(`no ${field} column`);
  return found;
};

const value = (entity: CrmLeadEntity, field: string, r: Row) => column(entity, field).valueGetter?.(r);

describe('buildLeadColumns', () => {
  it('adds the entity-specific column only for hosts and ecomm', () => {
    expect(build('host').map((c) => c.field)).toContain('host_type');
    expect(build('ecomm').map((c) => c.field)).toContain('brand_name');
    expect(build('venue').map((c) => c.field).slice(0, 2)).toEqual(['venue_name', 'city']);
  });

  it('renders the name cell text for strings, numbers, booleans, objects and blanks', () => {
    expect(value('venue', 'venue_name', row({ venue_name: 'Grand Hall' }))).toBe('Grand Hall');
    expect(value('venue', 'venue_name', row({ venue_name: 42 }))).toBe('42');
    expect(value('host', 'host_type', row({ host_type: false }))).toBe('false');
    expect(value('ecomm', 'brand_name', row({ brand_name: { en: 'Pawsome' } }))).toBe('{"en":"Pawsome"}');
    expect(value('venue', 'venue_name', row({ venue_name: '' }))).toBe('—');
    expect(value('host', 'host_name', row())).toBe('—');
  });

  it('shows the first contact number under the name, or a dash when there is none', () => {
    const renderName = column('venue', 'venue_name').cellRenderer as (r: Row) => ReactNode;

    const { unmount } = render(<>{renderName(row({ venue_name: 'Grand Hall', contacts: [{ mobile_number: '9876543210' }] }))}</>);
    expect(screen.getByText('Grand Hall')).toBeInTheDocument();
    expect(screen.getByText('9876543210')).toBeInTheDocument();
    unmount();

    render(<>{renderName(row({ venue_name: 'Grand Hall', contacts: [] }))}</>);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('formats the follow-up date and dashes a missing or unparsable one', () => {
    const formatted = value('venue', 'next_follow_up_date', row({ next_follow_up_date: '2026-09-15T00:00:00.000Z' }));
    expect(formatted).not.toBe('—');
    expect(formatted).toMatch(/2026/);
    expect(value('venue', 'next_follow_up_date', row({ next_follow_up_date: null }))).toBe('—');
    expect(value('venue', 'next_follow_up_date', row({ next_follow_up_date: 'not a date' }))).toBe('—');
  });

  it('formats the created date through the shared date column, dashing an unparsable one', () => {
    expect(value('venue', 'created_at', row({ created_at: '2026-09-15T00:00:00.000Z' }))).toMatch(/2026/);
    expect(value('venue', 'created_at', row({ created_at: 'garbage' }))).toBe('—');
  });

  it('renders status and priority as chips and filters them by their raw value', () => {
    const r = row({ lead_status: 'Contacted', priority: 'Low' });
    const status = column('venue', 'lead_status');
    const priority = column('venue', 'priority');

    expect(status.valueGetter?.(r)).toBe('Contacted');
    expect(priority.valueGetter?.(r)).toBe('Low');
    render(
      <>
        {(status.cellRenderer as (x: Row) => ReactNode)(r)}
        {(priority.cellRenderer as (x: Row) => ReactNode)(r)}
      </>,
    );
    expect(screen.getByText('Contacted').closest('.MuiChip-root')).not.toBeNull();
    expect(screen.getByText('Low').closest('.MuiChip-root')).not.toBeNull();
  });

  it('reads city and super category with dash fallbacks', () => {
    expect(value('venue', 'city', row({ city: 'Pune' }))).toBe('Pune');
    expect(value('venue', 'city', row({ city: null }))).toBe('—');
    expect(value('venue', 'super_category_id', row({ super_category: { name: 'Events' } }))).toBe('Events');
    expect(value('venue', 'super_category_id', row())).toBe('—');
  });
});
