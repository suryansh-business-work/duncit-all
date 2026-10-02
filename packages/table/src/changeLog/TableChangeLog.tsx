import { useEffect, useMemo, useState } from 'react';
import HistoryIcon from '@mui/icons-material/History';
import Badge from '@mui/material/Badge';
import Tooltip from '@mui/material/Tooltip';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../i18n';
import { tableApiSourceOf, type TableApiSource } from '../tableApi/source';
import type { TableFetch, TableQueryState } from '../types';
import { useTableChangeLogApi, type TableChangeLogApi } from './changeLogContext';
import { TableChangeLogDrawer } from './TableChangeLogDrawer';

/** The count needs no rows — one row, newest first. */
const COUNT_QUERY: TableQueryState = {
  search: '',
  page: 1,
  pageSize: 1,
  sortBy: null,
  sortDir: 'desc',
  filters: [],
};

export interface TableChangeLogProps<T> {
  tableId: string;
  fetchRows: TableFetch<T>;
  /** The query the grid last fetched — the view whose rows the log covers. */
  query: TableQueryState;
  /** The grid is fetching; the count is read again once it settles. */
  loading: boolean;
  label?: string;
}

interface ControlProps {
  api: TableChangeLogApi;
  source: TableApiSource;
  tableId: string;
  query: TableQueryState;
  loading: boolean;
  label?: string;
}

function ChangeLogControl({ api, source, tableId, query, loading, label }: Readonly<ControlProps>) {
  const { t } = useTranslation();
  const [count, setCount] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const { search, filters, sortBy, sortDir, pageSize } = query;
  // The view's rows, not its page: paging through them is not a different view.
  const variables = useMemo(
    () => source.variablesOf({ search, filters, sortBy, sortDir, pageSize, page: 1 }),
    [source, search, filters, sortBy, sortDir, pageSize]
  );

  useEffect(() => {
    if (loading) return undefined;
    let live = true;
    api
      .fetch(source.resultKey, variables, COUNT_QUERY)
      .then((page) => {
        if (live) setCount(page.total);
      })
      .catch(() => {
        if (live) setCount(null);
      });
    return () => {
      live = false;
    };
  }, [api, source.resultKey, variables, loading]);

  const title = count === null ? t('shell.table.changeLogs') : t('shell.table.changeLogsCount', { vars: { count } });
  return (
    <>
      <Tooltip title={title}>
        <DuncitIconButton size="small" aria-label={title} data-testid="table-change-logs" onClick={() => setOpen(true)}>
          <Badge badgeContent={count ?? 0} max={999} color="primary" showZero={false}>
            <HistoryIcon fontSize="small" />
          </Badge>
        </DuncitIconButton>
      </Tooltip>
      {open && (
        <TableChangeLogDrawer
          api={api}
          table={source.resultKey}
          tableId={tableId}
          variables={variables}
          label={label}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

/**
 * The change log of the rows a grid shows: a toolbar button carrying how many
 * changes were recorded, opening every one of them — who, what, when and from
 * where. Shown for a grid backed by a server `<name>Table` query, inside a
 * console whose shell provides the change log; nothing otherwise.
 */
export function TableChangeLog<T>({ tableId, fetchRows, query, loading, label }: Readonly<TableChangeLogProps<T>>) {
  const api = useTableChangeLogApi();
  const source = tableApiSourceOf(fetchRows);
  if (!api || !source) return null;
  return <ChangeLogControl api={api} source={source} tableId={tableId} query={query} loading={loading} label={label} />;
}
