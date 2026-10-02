import { useCallback, useMemo, useRef, useState } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTable, clientTableFetch, tableQueryToGql, type DuncitColumn, type TableQuerySnapshot } from '@duncit/table';

export interface ScopeRowMock {
  id: string;
  pod: string;
  city: string;
}

export interface ScopeMock {
  rows: ScopeRowMock[];
}

const scopeRowId = (row: ScopeRowMock) => row.id;

const SCOPE_COLUMNS: DuncitColumn<ScopeRowMock>[] = [
  { field: 'id', headerName: 'Pod', type: 'text', width: 150 },
  { field: 'pod', headerName: 'Title', type: 'text', flex: 1, minWidth: 180 },
  { field: 'city', headerName: 'City', type: 'text', width: 130 },
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
export function BulkScopeDemo({ rows }: Readonly<{ rows: ScopeRowMock[] }>) {
  const [ticked, setTicked] = useState<ScopeRowMock[]>([]);
  const [view, setView] = useState<TableQuerySnapshot | null>(null);
  const clearRef = useRef<(() => void) | null>(null);
  const fetchRows = useMemo(
    () => clientTableFetch(rows, (row) => `${row.pod} ${row.city} ${row.id}`, SCOPE_COLUMNS),
    [rows],
  );
  const selection = useMemo(() => ({ onChange: setTicked, clearRef }), []);
  const onQueryChange = useCallback((snapshot: TableQuerySnapshot) => setView(snapshot), []);
  const total = view?.total ?? 0;
  const viewFilters = view ? tableQueryToGql(view.query).query.filters : [];

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
          : `Scope: { query: ${JSON.stringify(viewFilters)}, search: ${JSON.stringify(view?.query.search ?? '')} } — ${total} rows`}
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
