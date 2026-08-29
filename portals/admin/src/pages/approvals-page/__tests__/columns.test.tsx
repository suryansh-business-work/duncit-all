import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { getApprovalColumns } from '../columns';
import type { ApprovalRequest } from '../helpers';

const makeRequest = (over: Partial<ApprovalRequest> = {}): ApprovalRequest => ({
  id: 'req-1',
  type: 'VENUE_CHANGE_REQUEST',
  status: 'PENDING',
  source_portal: 'partners',
  title: 'Venue change',
  summary: 'Wants to move venue',
  details: [],
  kind: 'Venue',
  subject_name: 'Alice',
  subject_email: 'alice@duncit.com',
  subject_phone: null,
  requested_by_name: 'Bob',
  reviewed_by_name: null,
  reviewed_at: null,
  review_notes: null,
  created_at: '2026-01-02T08:00:00.000Z',
  updated_at: '2026-01-02T08:00:00.000Z',
  ...over,
});

const formatDateTime = (s: string) => `fmt<${s}>`;

const makeDeps = () => ({
  formatDateTime,
  onReview: vi.fn(),
  t: (key: string) => key,
});

const columnBy = (field: string) => {
  const col = getApprovalColumns(makeDeps()).find((c) => c.field === field);
  if (!col) throw new Error(`column ${field} not built`);
  return col;
};

const valueOf = (field: string, row: ApprovalRequest) => columnBy(field).valueGetter?.(row);

const renderCell = (field: string, row: ApprovalRequest, deps: ReturnType<typeof makeDeps> = makeDeps()) => {
  const col = getApprovalColumns(deps).find((c) => c.field === field);
  if (!col?.cellRenderer) throw new Error(`column ${field} has no cellRenderer`);
  return render(<>{col.cellRenderer(row)}</>);
};

describe('getApprovalColumns / column set', () => {
  it('builds the column set in order', () => {
    const fields = getApprovalColumns(makeDeps()).map((c) => c.field);
    expect(fields).toEqual([
      'subject_name',
      'kind',
      'type',
      'source_portal',
      'requested_by_name',
      'created_at',
      'reviewed_at',
      'status',
      'actions',
    ]);
  });

  it('labels every header with the translated key', () => {
    const headers = Object.fromEntries(getApprovalColumns(makeDeps()).map((c) => [c.field, c.headerName]));
    expect(headers).toEqual({
      subject_name: 'admin.contact.subject',
      kind: 'admin.approvals.colKind',
      type: 'admin.roles.type',
      source_portal: 'admin.approvals.colSourcePortal',
      requested_by_name: 'admin.approvals.colRequestedBy',
      created_at: 'admin.approvals.colRequestedAt',
      reviewed_at: 'admin.approvals.colReviewedAt',
      status: 'shell.common.status',
      actions: 'admin.activity.action',
    });
  });

  it('hides the type and reviewed-at columns by default', () => {
    const hidden = getApprovalColumns(makeDeps())
      .filter((c) => c.hide)
      .map((c) => c.field);
    expect(hidden).toEqual(['type', 'reviewed_at']);
  });

  it('marks the actions column unsortable', () => {
    expect(columnBy('actions').sortable).toBe(false);
  });
});

describe('getApprovalColumns / value getters', () => {
  it('falls back to "Unnamed" when the subject has no name', () => {
    expect(valueOf('subject_name', makeRequest({ subject_name: 'Alice' }))).toBe('Alice');
    expect(valueOf('subject_name', makeRequest({ subject_name: null }))).toBe('Unnamed');
  });

  it('dashes the kind when absent', () => {
    expect(valueOf('kind', makeRequest({ kind: 'Venue' }))).toBe('Venue');
    expect(valueOf('kind', makeRequest({ kind: null }))).toBe('—');
  });

  it('humanizes the raw type', () => {
    expect(valueOf('type', makeRequest({ type: 'VENUE_CHANGE_REQUEST' }))).toBe('Venue Change Request');
  });

  it('dashes the source portal when absent', () => {
    expect(valueOf('source_portal', makeRequest({ source_portal: 'partners' }))).toBe('partners');
    expect(valueOf('source_portal', makeRequest({ source_portal: null }))).toBe('—');
  });

  it('dashes the requester name when absent', () => {
    expect(valueOf('requested_by_name', makeRequest({ requested_by_name: 'Bob' }))).toBe('Bob');
    expect(valueOf('requested_by_name', makeRequest({ requested_by_name: null }))).toBe('—');
  });

  it('formats created_at and blanks it when missing', () => {
    const iso = '2026-01-02T08:00:00.000Z';
    expect(valueOf('created_at', makeRequest({ created_at: iso }))).toBe(`fmt<${iso}>`);
    expect(valueOf('created_at', makeRequest({ created_at: null }))).toBe('');
  });

  it('formats reviewed_at and blanks it when missing', () => {
    const iso = '2026-01-03T08:00:00.000Z';
    expect(valueOf('reviewed_at', makeRequest({ reviewed_at: iso }))).toBe(`fmt<${iso}>`);
    expect(valueOf('reviewed_at', makeRequest({ reviewed_at: null }))).toBe('');
  });

  it('passes the raw status through', () => {
    expect(valueOf('status', makeRequest({ status: 'APPROVED' }))).toBe('APPROVED');
  });
});

describe('getApprovalColumns / cell renderers', () => {
  it('renders the subject name and email, falling back for both', () => {
    renderCell('subject_name', makeRequest({ subject_name: 'Alice', subject_email: 'alice@duncit.com' }));
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('alice@duncit.com')).toBeInTheDocument();
  });

  it('falls back to Unnamed and a dash when subject fields are missing', () => {
    renderCell('subject_name', makeRequest({ subject_name: null, subject_email: null }));
    expect(screen.getByText('Unnamed')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders a chip for a known kind', () => {
    renderCell('kind', makeRequest({ kind: 'Venue' }));
    expect(screen.getByText('Venue')).toBeInTheDocument();
  });

  it('renders a dash instead of a chip when kind is absent', () => {
    const { container } = renderCell('kind', makeRequest({ kind: null }));
    expect(container.querySelector('.MuiChip-root')).toBeNull();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders the status as a StatusChip', () => {
    renderCell('status', makeRequest({ status: 'DENIED' }));
    expect(screen.getByText('DENIED')).toBeInTheDocument();
  });

  it('renders the review action button and hands the row to onReview', () => {
    const deps = makeDeps();
    const row = makeRequest({ id: 'req-9' });
    const { container } = renderCell('actions', row, deps);
    fireEvent.click(within(container).getByRole('button'));
    expect(deps.onReview).toHaveBeenCalledWith(row);
  });
});
