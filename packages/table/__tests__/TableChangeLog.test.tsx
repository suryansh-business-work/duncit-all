import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TableChangeLogApi, TableChangeLogRow } from '../src/changeLog/changeLogContext';
import type { DuncitColumn } from '../src/types';

// The GET API dialog reads the caller's table-API access over Apollo; this suite
// is about the change log beside it, so the dialog stays out of the way.
vi.mock('../src/tableApi/TableApiDialog', () => ({ TableApiDialog: () => null }));

const { DuncitTable } = await import('../src/DuncitTable');
const { makeApolloTableFetch } = await import('../src/apolloFetch');
const { clientTableFetch } = await import('../src/clientFetch');
const { TableChangeLogProvider } = await import('../src/changeLog/changeLogContext');
const { changeLogColumns } = await import('../src/changeLog/changeLogColumns');
const { fallbackT } = await import('../src/i18n');

type Payout = { id: string; host: string };

const PAYOUTS: Payout[] = [
  { id: 'DUN-PAY-4821', host: 'Asha Rao' },
  { id: 'DUN-PAY-4822', host: 'Kabir Mehta' },
];

const LOG: TableChangeLogRow = {
  id: 'log-1',
  doc_id: 'DUN-PAY-4821',
  action: 'UPDATE',
  field: 'amount',
  old_value: '1200',
  new_value: '1500',
  actor_name: 'Meera Iyer',
  actor_email: 'meera@duncit.com',
  actor_roles: ['FINANCE_MANAGER'],
  source: 'PORTAL',
  ip: '203.0.113.7',
  user_agent: 'Mozilla/5.0',
  created_at: '2026-10-02T09:30:00.000Z',
};

const columns: DuncitColumn<Payout>[] = [{ field: 'host', headerName: 'Host', type: 'text' }];

function serverFetch() {
  const client = {
    query: vi.fn(async () => ({ data: { payoutsTable: { rows: PAYOUTS, total: PAYOUTS.length } } })),
  };
  return makeApolloTableFetch<Payout>(client, { kind: 'Document' }, 'payoutsTable');
}

function setup(api: TableChangeLogApi | null, fetchRows = serverFetch(), ariaLabel: string | null = 'Payouts') {
  return render(
    <TableChangeLogProvider value={api}>
      <DuncitTable<Payout>
        tableId="finance-payouts"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={(row) => row.id}
        ariaLabel={ariaLabel ?? undefined}
      />
    </TableChangeLogProvider>,
  );
}

const apiWith = (fetch: TableChangeLogApi['fetch'], detailed = false): TableChangeLogApi => ({ fetch, detailed });

beforeEach(() => {
  globalThis.localStorage.clear();
});

describe('DuncitTable change log', () => {
  it('shows no change log outside a console that provides one', async () => {
    setup(null);
    await screen.findByText('Asha Rao');
    expect(screen.queryByTestId('table-change-logs')).toBeNull();
  });

  it('shows no change log for a grid with no server table query behind it', async () => {
    setup(apiWith(vi.fn()), clientTableFetch(PAYOUTS));
    await screen.findByText('Asha Rao');
    expect(screen.queryByTestId('table-change-logs')).toBeNull();
  });

  it("carries how many changes were recorded for the view's rows", async () => {
    const fetch = vi.fn(async () => ({ rows: [LOG], total: 3 }));
    setup(apiWith(fetch));
    await waitFor(() => expect(screen.getByTestId('table-change-logs')).toHaveAccessibleName('Change logs (3)'));
    expect(fetch).toHaveBeenCalledWith('payoutsTable', expect.objectContaining({ query: expect.anything() }), expect.objectContaining({ pageSize: 1 }));
  });

  it('falls back to the plain label when the count cannot be read', async () => {
    setup(apiWith(vi.fn(async () => Promise.reject(new Error('offline')))));
    await screen.findByText('Asha Rao');
    await waitFor(() => expect(screen.getByTestId('table-change-logs')).toHaveAccessibleName('Change logs'));
  });

  it('opens every recorded change — who, what, before and after — and closes again', async () => {
    setup(apiWith(vi.fn(async () => ({ rows: [LOG], total: 1 })), true));
    fireEvent.click(await screen.findByTestId('table-change-logs'));

    const drawer = await screen.findByRole('dialog', { name: 'Change logs — Payouts' });
    expect(await within(drawer).findByText('Meera Iyer')).toBeInTheDocument();
    expect(within(drawer).getByText('1500')).toBeInTheDocument();
    // The detailed view (Finance) names the account and where the change came from.
    expect(within(drawer).getByText('meera@duncit.com')).toBeInTheDocument();
    expect(within(drawer).getByText('203.0.113.7')).toBeInTheDocument();
    // The log's own grid offers no log of itself.
    expect(within(drawer).queryByTestId('table-change-logs')).toBeNull();

    fireEvent.click(within(drawer).getByRole('button', { name: 'Close change logs' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});

describe('DuncitTable change log — edges', () => {
  it('names the drawer by the table query when the grid has no label, in the plain view', async () => {
    setup(apiWith(vi.fn(async () => ({ rows: [LOG], total: 1 }))), serverFetch(), null);
    fireEvent.click(await screen.findByTestId('table-change-logs'));
    const drawer = await screen.findByRole('dialog', { name: 'Change logs — payoutsTable' });
    expect(await within(drawer).findByText('Meera Iyer')).toBeInTheDocument();
    expect(within(drawer).queryByText('203.0.113.7')).toBeNull();
  });

  it('drops a count that arrives after the grid is gone, answered or refused', async () => {
    const settle: Array<{ ok: () => void; fail: () => void }> = [];
    const fetch = vi.fn(
      () =>
        new Promise<{ rows: TableChangeLogRow[]; total: number }>((resolve, reject) => {
          settle.push({ ok: () => resolve({ rows: [], total: 4 }), fail: () => reject(new Error('gone')) });
        })
    );
    const first = setup(apiWith(fetch));
    await waitFor(() => expect(settle).toHaveLength(1));
    first.unmount();
    settle[0].ok();

    const second = setup(apiWith(fetch));
    await waitFor(() => expect(settle).toHaveLength(2));
    second.unmount();
    settle[1].fail();
    await Promise.resolve();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe('changeLogColumns', () => {
  const read = (cols: DuncitColumn<TableChangeLogRow>[], field: string, row: TableChangeLogRow) =>
    cols.find((col) => col.field === field)?.valueGetter?.(row);

  it('reads an empty value, an unnamed author and a create entry readably', () => {
    const cols = changeLogColumns(fallbackT, true);
    const created: TableChangeLogRow = {
      ...LOG,
      action: 'CREATE',
      field: '',
      old_value: '',
      new_value: '',
      actor_name: '',
      actor_roles: [],
      ip: '',
      user_agent: '',
      created_at: '',
    };
    expect(read(cols, 'action', created)).toBe('Created');
    expect(read(cols, 'actor_name', created)).toBe('meera@duncit.com');
    expect(read(cols, 'actor_name', { ...created, actor_email: '' })).toBe('—');
    for (const field of ['field', 'old_value', 'new_value', 'actor_roles', 'ip', 'user_agent', 'created_at']) {
      expect(read(cols, field, created)).toBe('—');
    }
    expect(read(cols, 'actor_email', { ...created, actor_email: '' })).toBe('—');
    expect(read(cols, 'actor_roles', LOG)).toBe('FINANCE_MANAGER');
    expect(read(cols, 'action', { ...LOG, action: 'DELETE' })).toBe('Deleted');
  });

  it('keeps the plain view to who, what and when', () => {
    expect(changeLogColumns(fallbackT, false).map((col) => col.field)).not.toContain('ip');
  });
});
