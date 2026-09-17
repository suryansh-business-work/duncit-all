import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../testkit';
import {
  DELETE_ALL_EMAIL_LOGS,
  DELETE_EMAIL_LOGS,
  EMAIL_LOG_STATS,
  type EmailLogRow,
} from '../../src/pages/email-logs-page/queries';

const m = vi.hoisted(() => ({
  confirmMock: vi.fn(),
  notify: vi.fn(),
  refetchSpy: vi.fn(),
  user: { roles: ['SUPER_ADMIN'] } as { roles?: string[] } | null,
}));

vi.mock('@duncit/dialogs', () => ({ notify: m.notify, useConfirm: () => m.confirmMock }));
vi.mock('@duncit/table', () => ({ useApolloTableFetch: () => vi.fn() }));
vi.mock('@duncit/user-context', () => ({ useUserData: () => ({ user: m.user }) }));

const makeRow = (id: string): EmailLogRow => ({
  id,
  to: `${id}@example.com`,
  cc: [],
  bcc: [],
  subject: 'Your spot was filled',
  template: 'pod-backout-spot-filled',
  fragment_key: null,
  category: 'transactional',
  status: 'SENT',
  reason: '',
  provider: 'smtp',
  message_id: 'm-1',
  source: 'SERVER',
  source_detail: '',
  duration_ms: 42,
  created_at: '2026-08-06T10:00:00.000Z',
});

const rowA = makeRow('L1');
const rowB = makeRow('L2');

interface StubTableProps {
  refetchRef: { current: (() => void) | null };
  selection: {
    onChange: (rows: EmailLogRow[]) => void;
    clearRef: { current: (() => void) | null };
  };
  onRowClick: (row: EmailLogRow) => void;
  toolbarActions?: ReactNode;
}

vi.mock('../../src/pages/email-logs-page/EmailLogsTable', () => ({
  default: (p: StubTableProps) => {
    p.refetchRef.current = m.refetchSpy;
    // Mirrors @duncit/table: the clear runs in the grid, which then echoes the
    // now-empty selection back through onChange rather than the page resetting it.
    p.selection.clearRef.current = () => p.selection.onChange([]);
    return (
      <div>
        {p.toolbarActions}
        <button type="button" onClick={() => p.selection.onChange([rowA, rowB])}>
          tick-two
        </button>
        <button type="button" onClick={() => p.onRowClick(rowA)}>
          click-row
        </button>
      </div>
    );
  },
}));

vi.mock('../../src/pages/email-logs-page/EmailLogDrawer', () => ({
  default: (p: { logId: string | null; onClose: () => void }) =>
    p.logId ? (
      <button type="button" onClick={p.onClose}>
        drawer:{p.logId}
      </button>
    ) : null,
}));

import EmailLogsPage from '../../src/pages/email-logs-page';

const ALL_TIME = 12480;

const statsMock = (): MockedResponse => ({
  request: { query: EMAIL_LOG_STATS, variables: () => true },
  result: {
    data: {
      emailLogStats: {
        __typename: 'EmailLogStats',
        days: 7,
        sent: 5,
        skipped: 1,
        failed: 2,
        total: 8,
        all_time_total: ALL_TIME,
      },
    },
  },
  maxUsageCount: 20,
});

const deleteMock = (over: { count?: number | null; error?: string } = {}): MockedResponse => ({
  request: { query: DELETE_EMAIL_LOGS, variables: () => true },
  result: over.error
    ? { errors: [{ message: over.error }] }
    : { data: { deleteEmailLogs: over.count } },
  maxUsageCount: 20,
});

const deleteAllMock = (count: number | null): MockedResponse => ({
  request: { query: DELETE_ALL_EMAIL_LOGS, variables: () => true },
  result: { data: { deleteAllEmailLogs: count } },
  maxUsageCount: 20,
});

const tickTwo = () => fireEvent.click(screen.getByRole('button', { name: 'tick-two' }));
const clickDelete = () => fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

beforeEach(() => {
  m.confirmMock.mockReset();
  m.notify.mockReset();
  m.refetchSpy.mockReset();
  m.user = { roles: ['SUPER_ADMIN'] };
});

describe('Email log bulk delete', () => {
  it('takes no space until rows are ticked, and gives the count back', () => {
    renderWithProviders(<EmailLogsPage />, { mocks: [statsMock()] });
    expect(screen.queryByText(/selected on this page/)).not.toBeInTheDocument();

    tickTwo();
    expect(screen.getByText('2 selected on this page')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.queryByText(/selected on this page/)).not.toBeInTheDocument();
  });

  it('asks first, and a declined confirm deletes nothing', async () => {
    m.confirmMock.mockResolvedValue(false);
    renderWithProviders(<EmailLogsPage />, { mocks: [statsMock()] });
    tickTwo();
    clickDelete();

    await waitFor(() => expect(m.confirmMock).toHaveBeenCalled());
    expect(m.confirmMock).toHaveBeenCalledWith({
      title: 'Delete 2 selected rows?',
      message:
        'The 2 rows ticked on this page will be deleted permanently. Nothing else is touched.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    // Nothing left, nothing reported, and the ticks are still where they were.
    expect(m.notify).not.toHaveBeenCalled();
    expect(m.refetchSpy).not.toHaveBeenCalled();
    expect(screen.getByText('2 selected on this page')).toBeInTheDocument();
  });

  it('reports the number the server removed, not the number it was asked for', async () => {
    m.confirmMock.mockResolvedValue(true);
    // Two ids were sent; one row had already gone.
    renderWithProviders(<EmailLogsPage />, { mocks: [statsMock(), deleteMock({ count: 1 })] });
    tickTwo();
    clickDelete();

    await waitFor(() => expect(m.notify).toHaveBeenCalledWith('Deleted 1 log row', 'success'));
    expect(m.refetchSpy).toHaveBeenCalled();
    expect(screen.queryByText(/selected on this page/)).not.toBeInTheDocument();
  });

  it('reports nothing removed when the response carries no count', async () => {
    m.confirmMock.mockResolvedValue(true);
    renderWithProviders(<EmailLogsPage />, { mocks: [statsMock(), deleteMock({ count: null })] });
    tickTwo();
    clickDelete();

    await waitFor(() => expect(m.notify).toHaveBeenCalledWith('Deleted 0 log rows', 'success'));
  });

  it('surfaces a failed delete and leaves the selection alone', async () => {
    m.confirmMock.mockResolvedValue(true);
    renderWithProviders(<EmailLogsPage />, {
      mocks: [statsMock(), deleteMock({ error: 'not permitted' })],
    });
    tickTwo();
    clickDelete();

    await waitFor(() => expect(m.notify).toHaveBeenCalledWith('not permitted', 'error'));
    expect(m.refetchSpy).not.toHaveBeenCalled();
    expect(screen.getByText('2 selected on this page')).toBeInTheDocument();
  });

  it('opens the drawer on a row click — ticking rows never does', () => {
    renderWithProviders(<EmailLogsPage />, { mocks: [statsMock()] });
    tickTwo();
    expect(screen.queryByRole('button', { name: /^drawer:/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'click-row' }));
    const drawer = screen.getByRole('button', { name: 'drawer:L1' });
    fireEvent.click(drawer);
    expect(screen.queryByRole('button', { name: /^drawer:/ })).not.toBeInTheDocument();
  });
});

describe('Email log delete all', () => {
  it('says it deletes the whole history, not the filtered view', async () => {
    m.confirmMock.mockResolvedValue(true);
    renderWithProviders(<EmailLogsPage />, {
      mocks: [statsMock(), deleteAllMock(4210)],
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Delete all' }));

    await waitFor(() => expect(m.confirmMock).toHaveBeenCalled());
    expect(m.confirmMock).toHaveBeenCalledWith({
      title: 'Delete every email log?',
      message: `This deletes all ${ALL_TIME.toLocaleString()} rows ever recorded — the entire history, not the page on screen. Your search and filters do not narrow it, and there is no undo.`,
      confirmLabel: 'Delete everything',
      destructive: true,
    });
    await waitFor(() => expect(m.notify).toHaveBeenCalledWith('Deleted 4210 log rows', 'success'));
    expect(m.refetchSpy).toHaveBeenCalled();
  });

  it('reports nothing removed when the response carries no count', async () => {
    m.confirmMock.mockResolvedValue(true);
    renderWithProviders(<EmailLogsPage />, { mocks: [statsMock(), deleteAllMock(null)] });
    fireEvent.click(await screen.findByRole('button', { name: 'Delete all' }));

    await waitFor(() => expect(m.notify).toHaveBeenCalledWith('Deleted 0 log rows', 'success'));
  });

  it('wipes nothing when the confirm is declined', async () => {
    m.confirmMock.mockResolvedValue(false);
    renderWithProviders(<EmailLogsPage />, { mocks: [statsMock()] });
    fireEvent.click(await screen.findByRole('button', { name: 'Delete all' }));

    await waitFor(() => expect(m.confirmMock).toHaveBeenCalled());
    expect(m.notify).not.toHaveBeenCalled();
    expect(m.refetchSpy).not.toHaveBeenCalled();
  });

  it('is not offered to anyone but a SUPER_ADMIN', async () => {
    m.user = { roles: ['TECH_MANAGER'] };
    const { unmount } = renderWithProviders(<EmailLogsPage />, { mocks: [statsMock()] });
    // The stats query settles first, so the button's absence is a role decision.
    expect(await screen.findByText('5 sent')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete all' })).not.toBeInTheDocument();
    unmount();

    m.user = null;
    renderWithProviders(<EmailLogsPage />, { mocks: [statsMock()] });
    expect(await screen.findByText('5 sent')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete all' })).not.toBeInTheDocument();
  });
});
