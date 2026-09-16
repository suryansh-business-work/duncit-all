import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { formatDateCell } from '@duncit/table';
import type { PodChangeRow } from '@duncit/utils';
import { buildChangeRequestColumns, type ChangeRequestColumnDeps } from '../columns';
import { makeOffer, makeRequest } from './fixtures';

/** Echoes the key, and the vars when there are any, so a cell's copy is exact. */
const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key} ${JSON.stringify(options.vars)}` : key;

const makeDeps = (over: Partial<ChangeRequestColumnDeps> = {}): ChangeRequestColumnDeps => ({
  role: 'VENUE',
  t,
  onCancelPod: vi.fn(),
  onAssign: vi.fn(),
  ...over,
});

const columnBy = (field: string, deps: Partial<ChangeRequestColumnDeps> = {}) => {
  const col = buildChangeRequestColumns(makeDeps(deps)).find((c) => c.field === field);
  if (!col) throw new Error(`column ${field} not built`);
  return col;
};

/** A column's filter contract under the typed-column API: its type, plus the options an enum carries. */
const filterOf = (field: string) => {
  const col = columnBy(field);
  return 'options' in col ? { type: col.type, options: col.options } : { type: col.type };
};

const valueOf = (field: string, row: PodChangeRow) => columnBy(field).valueGetter?.(row);

const renderCell = (field: string, row: PodChangeRow, deps: Partial<ChangeRequestColumnDeps> = {}) => {
  const col = columnBy(field, deps);
  if (!col.cellRenderer) throw new Error(`column ${field} has no cellRenderer`);
  return render(<>{col.cellRenderer(row)}</>);
};

describe('buildChangeRequestColumns / column set', () => {
  it('builds id, pod, requester, requested at, attendees, status and actions, in that order', () => {
    const columns = buildChangeRequestColumns(makeDeps());
    expect(columns.map((c) => c.field)).toEqual([
      'change_request_no',
      'pod',
      'requested_by',
      'created_at',
      'attendees',
      'status',
      'actions',
    ]);
    expect(columns.map((c) => c.headerName)).toEqual([
      'admin.changeRequests.colRequestId',
      'admin.changeRequests.colPod',
      'admin.changeRequests.colRequestedBy',
      'admin.changeRequests.colRequestedAt',
      'admin.changeRequests.colAttendees',
      'admin.changeRequests.colStatus',
      'shell.common.actions',
    ]);
  });

  it('offers the four SDL statuses as the status filter, labelled like the chip', () => {
    expect(filterOf('status')).toEqual({
      type: 'enum',
      options: [
        { value: 'OPEN', label: 'changeRequest.statusOpen' },
        { value: 'OFFERED', label: 'changeRequest.statusOffered' },
        { value: 'RESOLVED', label: 'changeRequest.statusResolved' },
        { value: 'WITHDRAWN', label: 'changeRequest.statusWithdrawn' },
      ],
    });
    expect(filterOf('change_request_no')).toEqual({ type: 'text' });
  });
});

describe('buildChangeRequestColumns / value getters', () => {
  it('names the pod, marking a cancelled one', () => {
    expect(valueOf('pod', makeRequest())).toBe('Sunday board games');
    expect(valueOf('pod', makeRequest({ pod_cancelled: true }))).toBe('Sunday board games (cancelled)');
  });

  it('joins the requester’s name, phone and email, skipping blanks', () => {
    expect(valueOf('requested_by', makeRequest())).toBe('Asha Rao · +91 98450 12345 · asha@thirdwave.in');
    const noPhone = makeRequest({
      requested_by: { user_id: 'user-venue-1', full_name: 'Asha Rao', email: 'asha@thirdwave.in', phone: '' },
    });
    expect(valueOf('requested_by', noPhone)).toBe('Asha Rao · asha@thirdwave.in');
  });

  it('formats the request date, reads the live attendee count, and translates the status', () => {
    const row = makeRequest({ status: 'RESOLVED', resolution: 'REPLACED' });
    expect(valueOf('created_at', row)).toBe(formatDateCell('2026-09-12T08:15:00.000Z'));
    expect(valueOf('attendees', row)).toBe(9);
    expect(valueOf('status', row)).toBe('changeRequest.resolvedReplaced');
  });

  it('keys the actions value on the status and the cancelled flag both buttons read', () => {
    expect(valueOf('actions', makeRequest())).toBe('OPEN:false');
    expect(valueOf('actions', makeRequest({ status: 'OFFERED', pod_cancelled: true }))).toBe('OFFERED:true');
  });
});

describe('buildChangeRequestColumns / pod and status cells', () => {
  it('shows the pod title and date, without a cancelled line for a live pod', () => {
    renderCell('pod', makeRequest());
    expect(screen.getByText('Sunday board games')).toBeInTheDocument();
    expect(screen.getByText(formatDateCell('2026-10-04T12:30:00.000Z'))).toBeInTheDocument();
    expect(screen.queryByText('changeRequest.resolvedCancelled')).not.toBeInTheDocument();
  });

  it('flags a cancelled pod under its date', () => {
    renderCell('pod', makeRequest({ pod_cancelled: true }));
    expect(screen.getByText('changeRequest.resolvedCancelled')).toBeInTheDocument();
  });

  it('renders the status chip with the translated state', () => {
    renderCell('status', makeRequest({ status: 'RESOLVED', resolution: 'POD_CANCELLED' }));
    expect(screen.getByText('changeRequest.resolvedCancelled').closest('.MuiChip-root')).toHaveClass(
      'MuiChip-colorError',
    );
  });
});

describe('buildChangeRequestColumns / requester cell', () => {
  it('shows a venue requester with the venue they asked from and both contacts', () => {
    renderCell('requested_by', makeRequest());
    expect(screen.getByText('Asha Rao')).toBeInTheDocument();
    expect(screen.getByText('Third Wave Coffee, Indiranagar')).toBeInTheDocument();
    expect(screen.getByText('+91 98450 12345 · asha@thirdwave.in')).toBeInTheDocument();
    expect(screen.queryByText('Bangalore Board Gamers')).not.toBeInTheDocument();
  });

  it('shows a host requester with the club they run the pod for', () => {
    renderCell('requested_by', makeRequest({ role: 'HOST' }));
    expect(screen.getByText('Bangalore Board Gamers')).toBeInTheDocument();
    expect(screen.queryByText('Third Wave Coffee, Indiranagar')).not.toBeInTheDocument();
  });

  it('falls back to the email as the name, and drops an empty context line', () => {
    renderCell(
      'requested_by',
      makeRequest({
        role: 'CLUB_ADMIN',
        from_club_name: '',
        requested_by: { user_id: 'user-ca-1', full_name: '', email: 'ravi@boardgamers.in', phone: '' },
      }),
    );
    expect(screen.getAllByText('ravi@boardgamers.in')).toHaveLength(2);
    expect(screen.queryByText('—')).not.toBeInTheDocument();
  });

  it('dashes the name and the contacts of a requester with neither', () => {
    renderCell(
      'requested_by',
      makeRequest({ requested_by: { user_id: 'user-venue-9', full_name: '', email: '', phone: '' } }),
    );
    expect(screen.getAllByText('—')).toHaveLength(2);
  });
});

describe('buildChangeRequestColumns / actions cell', () => {
  it('opens the assign drawer and the cancel dialog for a live request, per tab', () => {
    const onAssign = vi.fn();
    const onCancelPod = vi.fn();
    const row = makeRequest();
    renderCell('actions', row, { role: 'HOST', onAssign, onCancelPod });

    const assign = screen.getByRole('button', { name: 'admin.changeRequests.assignHost' });
    expect(assign.parentElement).toHaveAttribute('aria-label', 'admin.changeRequests.assignHost');
    fireEvent.click(assign);
    expect(onAssign).toHaveBeenCalledWith(row);

    const cancel = screen.getByRole('button', { name: 'admin.changeRequests.cancelTitle' });
    expect(cancel.parentElement).toHaveAttribute('aria-label', 'admin.changeRequests.cancelTooltip');
    fireEvent.click(cancel);
    expect(onCancelPod).toHaveBeenCalledWith(row);
  });

  it('names the club-admin swap on that tab', () => {
    renderCell('actions', makeRequest(), { role: 'CLUB_ADMIN' });
    expect(screen.getByRole('button', { name: 'admin.changeRequests.assignClubAdmin' })).toBeEnabled();
  });

  it('closes the swap while an offer waits on somebody, and says who', () => {
    renderCell('actions', makeRequest({ status: 'OFFERED', offer: makeOffer() }));
    const assign = screen.getByRole('button', { name: 'admin.changeRequests.assignVenue' });
    expect(assign).toBeDisabled();
    expect(assign.parentElement).toHaveAttribute(
      'aria-label',
      'admin.changeRequests.alreadyOffered {"name":"Dialogues Cafe"}',
    );
    expect(screen.getByRole('button', { name: 'admin.changeRequests.cancelTitle' })).toBeEnabled();
  });

  it('leaves the name blank when an offered row carries no offer', () => {
    renderCell('actions', makeRequest({ status: 'OFFERED', offer: null }));
    expect(screen.getByRole('button', { name: 'admin.changeRequests.assignVenue' }).parentElement).toHaveAttribute(
      'aria-label',
      'admin.changeRequests.alreadyOffered {"name":""}',
    );
  });

  it('closes both answers once the request is resolved', () => {
    renderCell('actions', makeRequest({ status: 'RESOLVED', resolution: 'REPLACED' }));
    expect(screen.getByRole('button', { name: 'admin.changeRequests.assignVenue' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'admin.changeRequests.cancelTitle' })).toBeDisabled();
  });

  it('closes both answers once the request is withdrawn', () => {
    renderCell('actions', makeRequest({ status: 'WITHDRAWN' }));
    expect(screen.getByRole('button', { name: 'admin.changeRequests.assignVenue' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'admin.changeRequests.cancelTitle' })).toBeDisabled();
  });

  it('keeps the swap open but not the cancel on a request whose pod is already cancelled', () => {
    renderCell('actions', makeRequest({ pod_cancelled: true }));
    expect(screen.getByRole('button', { name: 'admin.changeRequests.assignVenue' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'admin.changeRequests.cancelTitle' })).toBeDisabled();
  });
});
