import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  clubAdminColumns,
  clubAdminStatusLabels,
} from '../../../src/club-admins/list/clubAdminColumns';
import type { ClubAdminRow } from '../../../src/club-admins/queries';
import { clubAdminRecord } from '../../fixtures';

const t = (key: string) => key;
const columns = clubAdminColumns(t);
const column = (field: string) => {
  const found = columns.find((c) => c.field === field);
  if (!found) throw new Error(`no column ${field}`);
  return found;
};
const row: ClubAdminRow = clubAdminRecord;

describe('clubAdminColumns', () => {
  it('has a column for every fact the list promises', () => {
    expect(columns.map((c) => c.field)).toEqual([
      'full_name',
      'email',
      'assigned_clubs',
      'category',
      'status',
      'is_active',
      'commission_pct',
      'joined_at',
    ]);
  });

  it('names THREE statuses — a club admin never applies', () => {
    expect(Object.keys(clubAdminStatusLabels(t))).toEqual(['DRAFT', 'APPROVED', 'REJECTED']);
  });

  it('lists the clubs they run by name', () => {
    expect(column('assigned_clubs').valueGetter?.(row)).toBe(
      'Delhi Board Gamers, Gurgaon Catan Club',
    );
  });

  it('shows an em-dash when no club is assigned yet', () => {
    expect(column('assigned_clubs').valueGetter?.({ ...row, assigned_clubs: [] })).toBe('—');
  });

  it('reads the category as the full path it was onboarded under', () => {
    expect(column('category').valueGetter?.(row)).toBe('Social › Board Games › Catan Night');
  });

  it('shows only the levels the record actually has', () => {
    expect(
      column('category').valueGetter?.({ ...row, category: null, sub_category: null }),
    ).toBe('Social');
    expect(
      column('category').valueGetter?.({
        ...row,
        super_category: null,
        category: null,
        sub_category: null,
      }),
    ).toBe('—');
  });

  it('reads a set commission as a percentage and an unset one as the default', () => {
    expect(column('commission_pct').valueGetter?.(row)).toBe('15%');
    expect(column('commission_pct').valueGetter?.({ ...row, commission_pct: null })).toBe(
      'directory.hostEditor.commissionDefault',
    );
  });

  it('renders the admin over their permanent CADM- id', () => {
    render(<>{column('full_name').cellRenderer?.(row)}</>);
    expect(screen.getByText('Kabir Sethi')).toBeInTheDocument();
    expect(screen.getByText('CADM-000042')).toBeInTheDocument();
  });

  it('chips the status and the live flag', () => {
    render(<>{column('status').cellRenderer?.(row)}</>);
    expect(screen.getByText('directory.venueEditor.statusApproved')).toBeInTheDocument();

    render(<>{column('is_active').cellRenderer?.({ ...row, is_active: false })}</>);
    expect(screen.getByText('directory.hostEditor.paused')).toBeInTheDocument();
  });

  it('renders both halves of the contact, em-dashing what is missing', () => {
    render(<>{column('email').cellRenderer?.({ ...row, phone: '' })}</>);
    expect(screen.getByText('kabir.sethi@example.com')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows an em-dash for a record that never joined', () => {
    expect(column('joined_at').valueGetter?.({ ...row, joined_at: null })).toBe('—');
  });

  it('sorts and exports by the plain record values', () => {
    expect(column('full_name').valueGetter?.(row)).toBe('Kabir Sethi');
    expect(column('email').valueGetter?.(row)).toBe('kabir.sethi@example.com');
    expect(column('status').valueGetter?.(row)).toBe('APPROVED');
    expect(column('is_active').valueGetter?.(row)).toBe('true');
    expect(column('is_active').valueGetter?.({ ...row, is_active: false })).toBe('false');
  });

  it('formats a join date and treats a missing club list like an empty one', () => {
    expect(column('joined_at').valueGetter?.(row)).not.toBe('—');
    expect(
      column('assigned_clubs').valueGetter?.({ ...row, assigned_clubs: undefined } as unknown as ClubAdminRow),
    ).toBe('—');
  });

  it('em-dashes a name, id and email the record does not have', () => {
    render(<>{column('full_name').cellRenderer?.({ ...row, full_name: '', club_admin_no: '' })}</>);
    expect(screen.getAllByText('—')).toHaveLength(2);

    render(<>{column('email').cellRenderer?.({ ...row, email: '' })}</>);
    expect(screen.getByText('9711203344')).toBeInTheDocument();
  });

  it('colours each status, with a live chip for an active admin', () => {
    render(<>{column('status').cellRenderer?.({ ...row, status: 'REJECTED' })}</>);
    expect(screen.getByText('directory.venueEditor.statusRejected')).toBeInTheDocument();

    render(<>{column('status').cellRenderer?.({ ...row, status: 'DRAFT' })}</>);
    expect(screen.getByText('directory.clubAdminEditor.statusDraft')).toBeInTheDocument();

    render(<>{column('is_active').cellRenderer?.(row)}</>);
    expect(screen.getByText('directory.hostEditor.live')).toBeInTheDocument();
  });
});
