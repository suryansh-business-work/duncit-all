import {
  EM_DASH,
  clientTableFetch,
  filterChipLabel,
  formatDateCell,
  tableQueryToGql,
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

export default defineDemos('table', [
  defineDemo<QueryMock>({
    id: 'query',
    title: 'The table\u2019s state, as the server receives it',
    note:
      'Every server-side table on the platform sends exactly this. Add a filter to the mock and watch both the payload and the chip label follow — the toolbar is built from the same object.',
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
      'Toolbar chips': mock.query.filters.map((filter) =>
        filterChipLabel(mock.columns, filter)
      ),
      'A blank date cell': formatDateCell(null),
      'The em dash it uses': EM_DASH,
    }),
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
