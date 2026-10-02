import {
  EM_DASH,
  clientTableFetch,
  fallbackT,
  filterChipLabel,
  formatDateCell,
  tableQueryToGql,
  type DuncitColumn,
  type TableQueryState,
} from '@duncit/table';
import { defineDemo, defineDemos } from '../types';
// Each rendered demo's component and mock shape live beside this file.
import { TypedColumnsDemo, type TypedColumnsMock } from './table/TypedColumnsDemo';
import { RowUpdateDemo, type RowUpdateMock } from './table/RowUpdateDemo';
import { BulkScopeDemo, type ScopeMock } from './table/BulkScopeDemo';
import { CHANGE_LOG_MOCK, ChangeLogDemo, type ChangeLogMock } from './table/ChangeLogDemo';

interface QueryMock {
  query: TableQueryState;
  /** The columns, so a chip names a field — and prints its value — the way the table does. */
  columns: DuncitColumn<Record<string, unknown>>[];
}

interface ClientRow {
  id: string;
  pod: string;
  venue: string;
  created_at: string;
}

interface RowsMock {
  rows: ClientRow[];
  search: string;
  page_size: number;
}

const CLIENT_COLUMNS: DuncitColumn<ClientRow>[] = [
  { field: 'id', headerName: 'Pod', type: 'text' },
  { field: 'pod', headerName: 'Title', type: 'text' },
  { field: 'venue', headerName: 'Venue', type: 'text' },
  { field: 'created_at', headerName: 'Created', type: 'date' },
];

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
        {
          field: 'status',
          headerName: 'Status',
          type: 'enum',
          options: [
            { value: 'ACTIVE', label: 'Active' },
            { value: 'PENDING', label: 'Pending' },
          ],
        },
        { field: 'is_paid', headerName: 'Paid', type: 'boolean' },
        { field: 'created_at', headerName: 'Created', type: 'date' },
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

  defineDemo<TypedColumnsMock>({
    id: 'typed-columns',
    title: 'Every column sorts and filters by what it holds',
    note:
      'One column of each type. Open a header’s filter: Payout and Host offer contains / equals / does not equal, Amount offers = ≠ ≥ ≤ and between, Status is a pick-list of its options, Instant is yes / no, Requested is a from–to date range. Click a header to sort — Amount and Requested start largest / newest first, the text columns A→Z. Sorting and filtering compare the raw value by type, so ₹900 sorts below ₹12,400 and dates stay chronological even though the cells print formatted text.',
    mock: {
      rows: [
        { id: 'p1', payout_no: 'DUN-PAY-10241', host_name: 'Aarav Mehta', amount: 8250, payout_status: 'PENDING', is_instant: true, requested_at: '2026-09-12T09:15:00.000Z' },
        { id: 'p2', payout_no: 'DUN-PAY-10240', host_name: 'Nikita Rao', amount: 12400, payout_status: 'PAID', is_instant: false, requested_at: '2026-09-08T11:40:00.000Z' },
        { id: 'p3', payout_no: 'DUN-PAY-10239', host_name: 'Kabir Singh', amount: 900, payout_status: 'ON_HOLD', is_instant: false, requested_at: '2026-09-10T06:05:00.000Z' },
        { id: 'p4', payout_no: 'DUN-PAY-10238', host_name: 'Meera Iyer', amount: 4600, payout_status: 'PAID', is_instant: true, requested_at: '2026-09-01T14:20:00.000Z' },
        { id: 'p5', payout_no: 'DUN-PAY-10237', host_name: 'Rohan Das', amount: 15200, payout_status: 'PENDING', is_instant: false, requested_at: '2026-09-14T18:45:00.000Z' },
      ],
    },
    render: (mock) => <TypedColumnsDemo rows={mock.rows} />,
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

  defineDemo<ChangeLogMock>({
    id: 'change-log',
    title: 'Who changed what, in every grid',
    note:
      'The History button beside Download carries how many changes a person made to the rows this view holds. Open it: each entry names who, when, the record, the field and the value before and after. Set detailed to false and the account’s email, roles, surface, address and browser drop out — only the Finance console asks for them.',
    mock: CHANGE_LOG_MOCK,
    render: (mock) => <ChangeLogDemo rows={mock.rows} logs={mock.logs} detailed={mock.detailed} />,
  }),

  defineDemo<RowsMock>({
    id: 'client-fetch',
    title: 'The same table, paged in the browser',
    note:
      'Not every table has a server endpoint. clientTableFetch gives an in-memory array the identical contract — search, every column filter and the sort, compared by each column’s type — so the component never learns which kind it is looking at.',
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
      const fetch = clientTableFetch(mock.rows, (row) => `${row.pod} ${row.venue} ${row.id}`, CLIENT_COLUMNS);
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
