import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { useTheme } from '@mui/material/styles';
import { DuncitTable, type TableFetch } from '@duncit/table';
import {
  buildLeadColumns,
  leadEntityMeta,
  type CrmLeadEntity,
  type CrmLeadRowBase,
  type LeadFilterOption,
} from './leadColumns';
import { duplicateRowStyle, withDuplicateMark, type DuplicateFlagged } from './duplicateRow';
import { useTranslation } from '@duncit/shell';

type LeadRow = CrmLeadRowBase & DuplicateFlagged;

interface Props<T extends LeadRow> {
  entity: CrmLeadEntity;
  fetchRows: TableFetch<T>;
  refetchRef: MutableRefObject<(() => void) | null>;
  statusOptions: ReadonlyArray<LeadFilterOption>;
  priorityOptions: ReadonlyArray<LeadFilterOption>;
  superCategoryOptions: ReadonlyArray<LeadFilterOption>;
  toolbarActions?: ReactNode;
  onView: (lead: T) => void;
  onEdit: (lead: T) => void;
  onDelete: (lead: T) => void;
}

const getLeadRowId = (row: CrmLeadRowBase) => row.id;

/** Shared server-driven table for every lead kind; a duplicate lead's row is red. */
export default function CrmLeadsTable<T extends LeadRow>({
  entity,
  fetchRows,
  refetchRef,
  statusOptions,
  priorityOptions,
  superCategoryOptions,
  toolbarActions,
  onView,
  onEdit,
  onDelete,
}: Readonly<Props<T>>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const columns = useMemo(
    () =>
      withDuplicateMark(
        buildLeadColumns<T>({ entity, statusOptions, priorityOptions, superCategoryOptions, onEdit, onDelete, t }),
        t,
      ),
    [entity, statusOptions, priorityOptions, superCategoryOptions, onEdit, onDelete, t],
  );
  const getRowStyle = useMemo(() => duplicateRowStyle(theme), [theme]);
  const meta = leadEntityMeta(t)[entity];

  return (
    <DuncitTable<T>
      tableId={meta.tableId}
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getLeadRowId}
      getRowStyle={getRowStyle}
      onRowClick={onView}
      toolbarActions={toolbarActions}
      emptyText={meta.emptyText}
      defaultSort={{ field: 'next_follow_up_date', dir: 'asc' }}
      searchPlaceholder="Search name, city, phone or email"
      refetchRef={refetchRef}
    />
  );
}
