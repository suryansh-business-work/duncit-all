import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { hostColumns, statusLabels } from '../../../src/hosts/list/hostColumns';
import type { HostRow } from '../../../src/hosts/queries';
import { hostRecord } from '../../fixtures';

/**
 * The hosts list columns.
 *
 * Every cell here is a function the grid calls, so the assertions run the real
 * `valueGetter`s and `cellRenderer`s rather than the screen — which is what the
 * table mock does in the list suites too.
 */
const t = (key: string) => key;
const columns = hostColumns(t);
const column = (field: string) => {
  const found = columns.find((c) => c.field === field);
  if (!found) throw new Error(`no column ${field}`);
  return found;
};
const row: HostRow = hostRecord;

describe('hostColumns', () => {
  it('has a column for every fact the list promises', () => {
    expect(columns.map((c) => c.field)).toEqual([
      'full_name',
      'email',
      'host_categories',
      'status',
      'is_active',
      'host_commission_pct',
      'created_at',
    ]);
  });

  it('names every lifecycle state', () => {
    expect(Object.keys(statusLabels(t))).toEqual([
      'DRAFT',
      'SUBMITTED',
      'APPROVED',
      'REJECTED',
    ]);
  });

  it('lists the categories a host runs by their most specific level', () => {
    // A row seeded from a meeting may have no sub, so the category name is the
    // fallback — an em-dash would hide a host who genuinely runs something.
    expect(column('host_categories').valueGetter?.(row)).toBe('Catan Night, Trivia');
  });

  it('shows an em-dash when a host runs nothing yet', () => {
    expect(column('host_categories').valueGetter?.({ ...row, host_categories: [] })).toBe('—');
  });

  it('reads a set commission as a percentage and an unset one as the default', () => {
    expect(column('host_commission_pct').valueGetter?.(row)).toBe('12%');
    expect(
      column('host_commission_pct').valueGetter?.({ ...row, host_commission_pct: null }),
    ).toBe('directory.hostEditor.commissionDefault');
    // 0 is not "no commission" — it means inherit, so it reads as the default too.
    expect(column('host_commission_pct').valueGetter?.({ ...row, host_commission_pct: 0 })).toBe(
      'directory.hostEditor.commissionDefault',
    );
  });

  it('renders the host over their permanent HOST- id', () => {
    render(<>{column('full_name').cellRenderer?.(row)}</>);
    expect(screen.getByText('Ananya Iyer')).toBeInTheDocument();
    expect(screen.getByText('HOST-000317')).toBeInTheDocument();
  });

  it('falls back to em-dashes for a record with no name or id', () => {
    render(<>{column('full_name').cellRenderer?.({ ...row, full_name: '', host_no: null })}</>);
    expect(screen.getAllByText('—')).toHaveLength(2);
  });

  it('renders both halves of the contact', () => {
    render(<>{column('email').cellRenderer?.(row)}</>);
    expect(screen.getByText('ananya.iyer@example.com')).toBeInTheDocument();
    expect(screen.getByText('9820045612')).toBeInTheDocument();
  });

  it('chips the status and the live flag', () => {
    render(<>{column('status').cellRenderer?.(row)}</>);
    expect(screen.getByText('directory.hostEditor.statusApproved')).toBeInTheDocument();

    render(<>{column('is_active').cellRenderer?.(row)}</>);
    expect(screen.getByText('directory.hostEditor.live')).toBeInTheDocument();
  });

  it('chips a paused host differently from a live one', () => {
    render(<>{column('is_active').cellRenderer?.({ ...row, is_active: false })}</>);
    expect(screen.getByText('directory.hostEditor.paused')).toBeInTheDocument();
  });

  it('sorts and filters is_active on a string, because the grid filter does', () => {
    expect(column('is_active').valueGetter?.(row)).toBe('true');
    expect(column('is_active').valueGetter?.({ ...row, is_active: false })).toBe('false');
  });

  it('offers every status as a filter option', () => {
    const filter = column('status').filter as { type: string; options: { value: string }[] };
    expect(filter.type).toBe('select');
    expect(filter.options.map((o) => o.value)).toEqual([
      'DRAFT',
      'SUBMITTED',
      'APPROVED',
      'REJECTED',
    ]);
  });
});
