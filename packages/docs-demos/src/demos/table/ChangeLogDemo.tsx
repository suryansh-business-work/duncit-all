import { useMemo } from 'react';
import {
  DuncitTable,
  TableChangeLogProvider,
  makeApolloTableFetch,
  type DuncitColumn,
  type TableChangeLogApi,
  type TableChangeLogRow,
} from '@duncit/table';

export interface PayoutRowMock {
  id: string;
  host: string;
  amount: number;
}

export interface ChangeLogMock {
  rows: PayoutRowMock[];
  logs: TableChangeLogRow[];
  /** The Finance console's view: email, roles, surface, address and browser too. */
  detailed: boolean;
}

const PAYOUT_COLUMNS: DuncitColumn<PayoutRowMock>[] = [
  { field: 'id', headerName: 'Payout', type: 'text', minWidth: 150 },
  { field: 'host', headerName: 'Host', type: 'text', flex: 1, minWidth: 150 },
  { field: 'amount', headerName: 'Amount (₹)', type: 'number', width: 130 },
];

const payoutRowId = (row: PayoutRowMock) => row.id;

/**
 * A server-backed grid inside a console that provides a change log: the
 * History button carries the count, and opens every recorded change. The
 * "server" here answers from the mock, page by page, the way the shell does.
 */
export function ChangeLogDemo({ rows, logs, detailed }: Readonly<ChangeLogMock>) {
  const fetchRows = useMemo(() => {
    const client = { query: async () => ({ data: { payoutsTable: { rows, total: rows.length } } }) };
    return makeApolloTableFetch<PayoutRowMock>(client, { kind: 'Document' }, 'payoutsTable');
  }, [rows]);
  const api = useMemo<TableChangeLogApi>(
    () => ({
      detailed,
      fetch: async (_table, _variables, query) => {
        const start = (query.page - 1) * query.pageSize;
        return { rows: logs.slice(start, start + query.pageSize), total: logs.length };
      },
    }),
    [logs, detailed]
  );

  return (
    <TableChangeLogProvider value={api}>
      <DuncitTable<PayoutRowMock>
        tableId="docs-demo-change-log"
        ariaLabel="Payouts"
        columns={PAYOUT_COLUMNS}
        fetchRows={fetchRows}
        getRowId={payoutRowId}
      />
    </TableChangeLogProvider>
  );
}

/** Real Duncit-shaped payouts and two recorded changes — what the docs page opens on. */
export const CHANGE_LOG_MOCK: ChangeLogMock = {
  detailed: true,
  rows: [
    { id: 'DUN-PAY-4821', host: 'Asha Rao', amount: 1500 },
    { id: 'DUN-PAY-4822', host: 'Kabir Mehta', amount: 2400 },
  ],
  logs: [
    {
      id: 'log-2',
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
      user_agent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/141',
      created_at: '2026-10-02T09:30:00.000Z',
    },
    {
      id: 'log-1',
      doc_id: 'DUN-PAY-4822',
      action: 'CREATE',
      field: '',
      old_value: '',
      new_value: '',
      actor_name: 'Rohan Das',
      actor_email: 'rohan@duncit.com',
      actor_roles: ['FINANCE_USER'],
      source: 'PORTAL',
      ip: '198.51.100.24',
      user_agent: 'Mozilla/5.0 (Macintosh) Safari/18',
      created_at: '2026-10-01T15:05:00.000Z',
    },
  ],
};
