import { useCallback, useMemo, useRef, useState } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import {
  DuncitTable,
  EM_DASH,
  clientTableFetch,
  fallbackT,
  filterChipLabel,
  formatDateCell,
  tableQueryToGql,
  type DuncitColumn,
  type TableQuerySnapshot,
  type TableQueryState,
} from '@duncit/table';
import { defineDemo, defineDemos } from '../types';

interface QueryMock {
  query: TableQueryState;
  /** Column headers, so a chip can name a field the way the table does. */
  columns: { field: string; headerName: string }[];
}

interface RowsMock {
  rows: { id: string; pod: string; venue: string; created_at: string }[];
  search: string;
  page_size: number;
}

interface MeetingRowMock {
  id: string;
  request_no: string;
  applicant: string;
  status: 'REQUESTED' | 'SCHEDULED' | 'DONE';
}

interface RowUpdateMock {
  rows: MeetingRowMock[];
  /** The row an action lands on, and what its mutation answers with. */
  update: MeetingRowMock;
}

const STATUS_COLOR: Record<MeetingRowMock['status'], 'default' | 'info' | 'success'> = {
  REQUESTED: 'default',
  SCHEDULED: 'info',
  DONE: 'success',
};

const meetingRowId = (row: MeetingRowMock) => row.id;

const renderStatus = (row: MeetingRowMock) => (
  <Chip size="small" color={STATUS_COLOR[row.status]} label={row.status} />
);

const MEETING_COLUMNS: DuncitColumn<MeetingRowMock>[] = [
  { field: 'request_no', headerName: 'Request', minWidth: 160 },
  { field: 'applicant', headerName: 'Applicant', flex: 1, minWidth: 150 },
  {
    field: 'status',
    headerName: 'Status',
    width: 140,
    cellRenderer: renderStatus,
    valueGetter: (row) => row.status,
  },
];

/**
 * The real DuncitTable, driven the way a page drives it after a mutation.
 *
 * `updateRowRef` is filled by the table; the button hands it the row a mutation
 * would have answered with. Nothing is fetched — the row is replaced in place,
 * and because renderer columns are never-equal the Status chip repaints with
 * it. Every other row keeps its identity and is left alone.
 */
function RowUpdateDemo({ rows, update }: Readonly<{ rows: MeetingRowMock[]; update: MeetingRowMock }>) {
  const updateRowRef = useRef<((row: MeetingRowMock) => void) | null>(null);
  const [applied, setApplied] = useState(0);
  const fetchRows = useMemo(
    () => clientTableFetch(rows, (row) => `${row.request_no} ${row.applicant}`),
    [rows],
  );

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1.5} sx={{
        alignItems: "center"
      }}>
        <DuncitButton
          variant="contained"
          size="small"
          onClick={() => {
            updateRowRef.current?.(update);
            setApplied((n) => n + 1);
          }}
        >
          Apply the mutation result
        </DuncitButton>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          {applied === 0
            ? 'Nothing applied yet.'
            : `Applied ${applied}× — ${update.request_no} is now ${update.status}, with no fetch.`}
        </Typography>
      </Stack>
      <DuncitTable<MeetingRowMock>
        tableId="docs-demo-row-update"
        columns={MEETING_COLUMNS}
        fetchRows={fetchRows}
        getRowId={meetingRowId}
        updateRowRef={updateRowRef}
        emptyText="No meetings"
      />
    </Stack>
  );
}

interface ScopeRowMock {
  id: string;
  pod: string;
  city: string;
}

interface ScopeMock {
  rows: ScopeRowMock[];
}

const scopeRowId = (row: ScopeRowMock) => row.id;

const SCOPE_COLUMNS: DuncitColumn<ScopeRowMock>[] = [
  { field: 'id', headerName: 'Pod', width: 150 },
  { field: 'pod', headerName: 'Title', flex: 1, minWidth: 180 },
  { field: 'city', headerName: 'City', width: 130 },
];

/**
 * The two halves of a bulk action, side by side.
 *
 * `selection` reports what is TICKED — this page only, however many pages the
 * query matches. `onQueryChange` reports the query and the server's total, which
 * is the only way to name the rows the grid has never loaded. A destructive
 * action picks one: ids when rows were ticked, the query when the operator asked
 * for everything matching.
 *
 * Search or page through it and watch the two disagree — that disagreement is
 * the entire reason the second prop exists.
 */
function BulkScopeDemo({ rows }: Readonly<{ rows: ScopeRowMock[] }>) {
  const [ticked, setTicked] = useState<ScopeRowMock[]>([]);
  const [view, setView] = useState<TableQuerySnapshot | null>(null);
  const clearRef = useRef<(() => void) | null>(null);
  const fetchRows = useMemo(
    () => clientTableFetch(rows, (row) => `${row.pod} ${row.city} ${row.id}`),
    [rows],
  );
  const selection = useMemo(() => ({ onChange: setTicked, clearRef }), []);
  const onQueryChange = useCallback((snapshot: TableQuerySnapshot) => setView(snapshot), []);
  const total = view?.total ?? 0;

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Chip size="small" label={`Ticked on this page: ${ticked.length}`} />
        <Chip size="small" color="primary" label={`Matching this view: ${total}`} />
        <DuncitButton size="small" onClick={() => clearRef.current?.()}>
          Clear ticks
        </DuncitButton>
      </Stack>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {ticked.length > 0
          ? `Scope: { ids: [${ticked.map((row) => row.id).join(', ')}] }`
          : `Scope: { query: ${JSON.stringify(view ? tableQueryToGql(view.query).query.filters : [])}, search: ${JSON.stringify(view?.query.search ?? '')} } — ${total} rows`}
      </Typography>
      <DuncitTable<ScopeRowMock>
        tableId="docs-demo-bulk-scope"
        columns={SCOPE_COLUMNS}
        fetchRows={fetchRows}
        getRowId={scopeRowId}
        defaultPageSize={10}
        selection={selection}
        onQueryChange={onQueryChange}
        emptyText="No pods"
      />
    </Stack>
  );
}

export default defineDemos('table', [
  defineDemo<QueryMock>({
    id: 'query',
    title: 'The table\u2019s state, as the server receives it',
    note:
      'Every server-side table on the platform sends exactly this. Add a filter to the mock and watch both the payload and the chip label follow — the toolbar is built from the same object. The date lines below it are the other half: empty and unreadable both print the em dash, because a value getter that throws takes the page down with it. Sorting is the fetch’s job alone: the grid keeps the order the rows arrive in, so a date column sorted on the server stays chronological instead of being re-sorted by its formatted text.',
    mock: {
      query: {
        search: 'badminton',
        page: 2,
        pageSize: 25,
        sortBy: 'created_at',
        sortDir: 'desc',
        filters: [
          { field: 'status', op: 'in', values: ['ACTIVE', 'PENDING'] },
          { field: 'is_paid', op: 'is_true' },
          { field: 'created_at', op: 'between', values: ['2026-09-01', '2026-09-30'] },
        ],
      },
      columns: [
        { field: 'status', headerName: 'Status' },
        { field: 'is_paid', headerName: 'Paid' },
        { field: 'created_at', headerName: 'Created' },
      ],
    },
    compute: (mock) => ({
      'GraphQL variables': tableQueryToGql(mock.query),
      // The chip words ("Yes", "contains") come from the catalogue, so the
      // label takes a translator; outside React that is the package's own.
      'Toolbar chips': mock.query.filters.map((filter) =>
        filterChipLabel(mock.columns, filter, fallbackT)
      ),
      'A blank date cell': formatDateCell(null),
      // Unreadable reads as blank on purpose: a value getter runs inside the
      // grid's paint, so throwing there costs the page rather than the cell.
      'A date cell it cannot read': formatDateCell('1787824800000'),
      'The em dash it uses': EM_DASH,
    }),
  }),

  defineDemo<RowUpdateMock>({
    id: 'row-update',
    title: 'Repainting one row instead of re-asking for the page',
    note:
      'Press the button: the table is handed the "update" row exactly as a mutation would answer, and only that row repaints — no fetch, and the Status chip follows because renderer columns are declared never-equal. Edit update.status and press it again.',
    mock: {
      rows: [
        { id: 'm1', request_no: 'DUN-MTG-4821', applicant: 'Asha Nair', status: 'SCHEDULED' },
        { id: 'm2', request_no: 'DUN-MTG-4822', applicant: 'Ravi Menon', status: 'REQUESTED' },
        { id: 'm3', request_no: 'DUN-MTG-4823', applicant: 'Priya Rao', status: 'SCHEDULED' },
      ],
      update: { id: 'm1', request_no: 'DUN-MTG-4821', applicant: 'Asha Nair', status: 'DONE' },
    },
    render: (mock) => <RowUpdateDemo rows={mock.rows} update={mock.update} />,
  }),

  defineDemo<ScopeMock>({
    id: 'bulk-scope',
    title: 'Ticked rows, and the rows nobody has loaded',
    note:
      'Twelve pods at ten a page. Tick a couple and the scope is their ids; clear the ticks and it becomes the query plus the server’s total, which covers page two as well. Shift-click a second checkbox to take everything between it and the last one you ticked. Type in the search box and watch the total move while the ticks stay where they were — that gap is why a bulk delete has to choose between the two rather than pretend selection covers both.',
    mock: {
      rows: [
        { id: 'DUN-POD-4821', pod: 'Sunday Badminton Doubles', city: 'Bengaluru' },
        { id: 'DUN-POD-4822', pod: 'Evening Football 5s', city: 'Bengaluru' },
        { id: 'DUN-POD-4823', pod: 'Badminton Beginners', city: 'Bengaluru' },
        { id: 'DUN-POD-4824', pod: 'Morning Cricket Nets', city: 'Hyderabad' },
        { id: 'DUN-POD-4825', pod: 'Box Cricket Doubles', city: 'Hyderabad' },
        { id: 'DUN-POD-4826', pod: 'Table Tennis Ladder', city: 'Pune' },
        { id: 'DUN-POD-4827', pod: 'Sunrise Yoga', city: 'Pune' },
        { id: 'DUN-POD-4828', pod: 'Terrace Chess Club', city: 'Mumbai' },
        { id: 'DUN-POD-4829', pod: 'Weekend Trek: Rajmachi', city: 'Mumbai' },
        { id: 'DUN-POD-4830', pod: 'Board Game Night', city: 'Delhi' },
        { id: 'DUN-POD-4831', pod: 'Pickleball Rally', city: 'Delhi' },
        { id: 'DUN-POD-4832', pod: 'Sunday Badminton Singles', city: 'Chennai' },
      ],
    },
    render: (mock) => <BulkScopeDemo rows={mock.rows} />,
  }),

  defineDemo<RowsMock>({
    id: 'client-fetch',
    title: 'The same table, paged in the browser',
    note:
      'Not every table has a server endpoint. clientTableFetch gives an in-memory array the identical contract, so the component never learns which kind it is looking at.',
    mock: {
      search: 'hsr',
      page_size: 2,
      rows: [
        { id: 'DUN-POD-4821', pod: 'Sunday Badminton Doubles', venue: 'Play Arena, HSR Layout', created_at: '2026-09-01T06:30:00.000Z' },
        { id: 'DUN-POD-4822', pod: 'Evening Football 5s', venue: 'Turf Park, HSR Layout', created_at: '2026-09-03T12:00:00.000Z' },
        { id: 'DUN-POD-4823', pod: 'Badminton Beginners', venue: 'Smash Court, Koramangala', created_at: '2026-09-05T09:15:00.000Z' },
      ],
    },
    compute: (mock) => {
      // The fetch is a Promise by contract, so the demo shows the contract and
      // the filtering it does rather than pretending to await it in a getter.
      const fetch = clientTableFetch(mock.rows, (row) => `${row.pod} ${row.venue} ${row.id}`);
      const matches = mock.rows.filter((row) =>
        `${row.pod} ${row.venue} ${row.id}`.toLowerCase().includes(mock.search.toLowerCase())
      );
      return {
        'Rows in memory': mock.rows.length,
        'Matching the search': matches.map((row) => row.id),
        'Pages at this size': Math.max(1, Math.ceil(matches.length / mock.page_size)),
        'Dates as the table prints them': mock.rows.map((row) => formatDateCell(row.created_at)),
        'What clientTableFetch returns': `${typeof fetch} — (q: TableQueryState) => Promise<TablePage<T>>, the same contract a server table has`,
      };
    },
  }),
]);
