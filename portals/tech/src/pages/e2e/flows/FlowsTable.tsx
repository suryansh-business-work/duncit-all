import { useMemo, type ReactNode, type RefObject } from 'react';
import { useTranslation } from '@duncit/shell';
import {
  DuncitTable,
  actionsColumn,
  dateColumn,
  type DuncitColumn,
  type TableFetch,
} from '@duncit/table';
import { getRowId, namedActions, renderNameCell } from './cells';
import type { E2eFlowRow } from './queries';

interface Props {
  fetchRows: TableFetch<E2eFlowRow>;
  refetchRef: RefObject<(() => void) | null>;
  toolbarActions: ReactNode;
  onOpen: (row: E2eFlowRow) => void;
  onEdit: (row: E2eFlowRow) => void;
  onDelete: (row: E2eFlowRow) => void;
}

export default function FlowsTable({
  fetchRows,
  refetchRef,
  toolbarActions,
  onOpen,
  onEdit,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<E2eFlowRow>[]>(
    () => [
      {
        field: 'name',
        headerName: t('shell.common.name'),
        flex: 1,
        minWidth: 260,
        cellRenderer: renderNameCell,
        valueGetter: (row) => row.name,
      },
      {
        field: 'sub_flow_count',
        headerName: t('tech.e2eFlows.colSubFlows'),
        width: 120,
        sortable: false,
        valueGetter: (row) => String(row.sub_flow_count),
      },
      dateColumn<E2eFlowRow>({
        field: 'updated_at',
        headerName: t('shell.common.updated'),
        hide: false,
        width: 165,
      }),
      actionsColumn<E2eFlowRow>({ width: 120, onEdit, onDelete, ...namedActions(t) }),
    ],
    [t, onEdit, onDelete]
  );

  return (
    <DuncitTable<E2eFlowRow>
      ariaLabel={t('tech.e2eFlows.title')}
      tableId="tech-e2e-flows"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('tech.e2eFlows.empty')}
      defaultSort={{ field: 'updated_at', dir: 'desc' }}
      searchPlaceholder={t('tech.e2eFlows.searchPlaceholder')}
      toolbarActions={toolbarActions}
      refetchRef={refetchRef}
      onRowClick={onOpen}
    />
  );
}
