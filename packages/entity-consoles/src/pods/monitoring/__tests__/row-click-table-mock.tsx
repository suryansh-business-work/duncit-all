import { useEffect, useState, type ReactNode } from 'react';

/**
 * Local stand-in for `@duncit/table`'s `DuncitTable`, in the same spirit as the
 * package's `__tests__/table-mock.tsx` (real valueGetters/cellRenderers, no AG
 * Grid), but ALSO wiring `onRowClick` — the shared mock does not forward it,
 * and the monitoring table is the one console table that uses it.
 */
interface MockColumn {
  field: string;
  headerName: string;
  valueGetter?: (row: never) => unknown;
  cellRenderer?: (row: never) => ReactNode;
}

interface MockTableProps {
  columns: MockColumn[];
  fetchRows: (q: unknown) => Promise<{ rows: unknown[]; total: number }>;
  getRowId: (row: never) => string;
  emptyText?: string;
  onRowClick?: (row: never) => void;
  defaultSort?: { field: string; dir: string };
  refetchRef?: { current: (() => void) | null };
  searchPlaceholder?: string;
}

export function DuncitTable(props: Readonly<MockTableProps>) {
  const { columns, fetchRows, getRowId, emptyText, onRowClick, defaultSort, refetchRef } = props;
  const [rows, setRows] = useState<unknown[]>([]);

  useEffect(() => {
    const load = () => {
      Promise.resolve(
        fetchRows({
          search: '',
          page: 1,
          pageSize: 50,
          sortBy: defaultSort?.field ?? null,
          sortDir: defaultSort?.dir ?? 'asc',
          filters: [],
        }),
      ).then((res) => setRows(res?.rows ?? []));
    };
    if (refetchRef) refetchRef.current = load;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div data-testid="duncit-table" data-search-placeholder={props.searchPlaceholder}>
      <div data-testid="table-headers">
        {columns.map((c) => (
          <span key={c.field} data-testid={`col-${c.field}`}>
            {c.headerName}
          </span>
        ))}
      </div>
      {rows.length === 0 && <div data-testid="table-empty">{emptyText}</div>}
      {rows.map((row) => (
        <div
          key={getRowId(row as never)}
          data-testid="table-row"
          onClick={() => onRowClick?.(row as never)}
        >
          {columns.map((c) => (
            <span key={c.field} data-testid={`cell-${c.field}`}>
              {c.valueGetter ? (
                <span data-testid={`value-${c.field}`}>{String(c.valueGetter(row as never) ?? '')}</span>
              ) : null}
              {c.cellRenderer ? c.cellRenderer(row as never) : null}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
