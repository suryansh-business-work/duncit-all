import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { getPortalAccessColumns } from '../columns';
import type { PortalAccessRequest } from '../helpers';

const makeRow = (over: Partial<PortalAccessRequest> = {}): PortalAccessRequest => ({
  id: 'req-1',
  status: 'PENDING',
  title: null,
  summary: null,
  target_id: 'finance',
  subject_name: 'Asha Rao',
  subject_email: 'asha@duncit.com',
  requested_by_name: 'Asha Rao',
  reviewed_by_name: null,
  reviewed_at: null,
  review_notes: null,
  created_at: '2026-03-01T10:00:00.000Z',
  ...over,
});

interface DepsOverride {
  onApprove?: (row: PortalAccessRequest) => void;
  onDeny?: (row: PortalAccessRequest) => void;
}

const makeDeps = (over: DepsOverride = {}) => ({
  t: (key: string) => key,
  formatDateTime: (value: string) => `FMT<${value}>`,
  onApprove: vi.fn(),
  onDeny: vi.fn(),
  ...over,
});

const columnBy = (field: string, over: DepsOverride = {}) => {
  const col = getPortalAccessColumns(makeDeps(over)).find((c) => c.field === field);
  if (!col) throw new Error(`column ${field} not built`);
  return col;
};

const valueOf = (field: string, row: PortalAccessRequest, over: DepsOverride = {}) =>
  columnBy(field, over).valueGetter?.(row);

const renderCell = (field: string, row: PortalAccessRequest, over: DepsOverride = {}) => {
  const col = columnBy(field, over);
  if (!col.cellRenderer) throw new Error(`column ${field} has no cellRenderer`);
  return render(<>{col.cellRenderer(row)}</>);
};

describe('getPortalAccessColumns / column set', () => {
  it('builds the columns in order', () => {
    const fields = getPortalAccessColumns(makeDeps()).map((c) => c.field);
    expect(fields).toEqual(['subject_name', 'portal', 'created_at', 'reviewed_at', 'status', 'actions']);
  });

  it('labels every header through the injected translator', () => {
    const headers = Object.fromEntries(
      getPortalAccessColumns(makeDeps()).map((c) => [c.field, c.headerName]),
    );
    expect(headers).toEqual({
      subject_name: 'admin.portalAccess.colRequester',
      portal: 'admin.portalAccess.colPortal',
      created_at: 'admin.portalAccess.colRequestedAt',
      reviewed_at: 'admin.portalAccess.colReviewedAt',
      status: 'admin.portalAccess.colStatus',
      actions: 'admin.portalAccess.colActions',
    });
  });

  it('hides the Reviewed at column by default and offers a date filter on both date columns', () => {
    expect(columnBy('reviewed_at').hide).toBe(true);
    expect(columnBy('subject_name').hide).toBeUndefined();
    expect(columnBy('created_at').filter).toEqual({ type: 'date' });
    expect(columnBy('reviewed_at').filter).toEqual({ type: 'date' });
  });

  it('marks the portal and actions columns unsortable', () => {
    expect(columnBy('portal').sortable).toBe(false);
    expect(columnBy('actions').sortable).toBe(false);
  });
});

describe('getPortalAccessColumns / value getters', () => {
  it('dashes a missing requester name', () => {
    expect(valueOf('subject_name', makeRow({ subject_name: null }))).toBe('—');
    expect(valueOf('subject_name', makeRow({ subject_name: 'Asha Rao' }))).toBe('Asha Rao');
  });

  it('resolves the portal name from the target id', () => {
    expect(valueOf('portal', makeRow({ target_id: 'finance' }))).toBe('Finance');
    expect(valueOf('portal', makeRow({ target_id: null }))).toBe('—');
  });

  it('formats populated dates through the injected formatter and blanks unset ones', () => {
    expect(valueOf('created_at', makeRow({ created_at: '2026-03-01T10:00:00.000Z' }))).toBe(
      'FMT<2026-03-01T10:00:00.000Z>',
    );
    expect(valueOf('created_at', makeRow({ created_at: null }))).toBe('');
    expect(valueOf('reviewed_at', makeRow({ reviewed_at: '2026-03-02T00:00:00.000Z' }))).toBe(
      'FMT<2026-03-02T00:00:00.000Z>',
    );
    expect(valueOf('reviewed_at', makeRow({ reviewed_at: null }))).toBe('');
  });

  it('passes the raw status through', () => {
    expect(valueOf('status', makeRow({ status: 'APPROVED' }))).toBe('APPROVED');
  });
});

describe('getPortalAccessColumns / cell renderers', () => {
  it('stacks the requester name above their email, dashing both when absent', () => {
    renderCell('subject_name', makeRow({ subject_name: 'Asha Rao', subject_email: 'asha@duncit.com' }));
    expect(screen.getByText('Asha Rao')).toBeInTheDocument();
    expect(screen.getByText('asha@duncit.com')).toBeInTheDocument();
  });

  it('dashes a requester row with no name or email', () => {
    renderCell('subject_name', makeRow({ subject_name: null, subject_email: null }));
    expect(screen.getAllByText('—')).toHaveLength(2);
  });

  it('renders a colored status chip', () => {
    const { container } = renderCell('status', makeRow({ status: 'DENIED' }));
    expect(screen.getByText('DENIED')).toBeInTheDocument();
    expect(container.querySelector('.MuiChip-colorError')).toBeInTheDocument();
  });

  it('shows Approve/Deny buttons for a PENDING row and wires them to the callbacks', () => {
    const onApprove = vi.fn();
    const onDeny = vi.fn();
    const row = makeRow({ status: 'PENDING' });
    renderCell('actions', row, { onApprove, onDeny });

    fireEvent.click(screen.getByRole('button', { name: 'admin.portalAccess.approve' }));
    fireEvent.click(screen.getByRole('button', { name: 'admin.portalAccess.deny' }));

    expect(onApprove).toHaveBeenCalledWith(row);
    expect(onDeny).toHaveBeenCalledWith(row);
  });

  it('shows the reviewer name instead of actions once a row is decided', () => {
    renderCell('actions', makeRow({ status: 'APPROVED', reviewed_by_name: 'Root Admin' }));
    expect(screen.getByText('Root Admin')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('dashes a decided row with no recorded reviewer', () => {
    renderCell('actions', makeRow({ status: 'DENIED', reviewed_by_name: null }));
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
