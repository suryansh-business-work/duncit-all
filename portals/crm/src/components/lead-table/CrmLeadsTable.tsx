import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { DuncitTable, type TableFetch } from '@duncit/table';
import {
  buildLeadColumns,
  LEAD_ENTITY_META,
  type CrmLeadEntity,
  type CrmLeadRowBase,
  type LeadFilterOption,
} from './leadColumns';

interface Props<T extends CrmLeadRowBase> {
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

/** Shared server-driven table for the host / venue / ecomm lead triplet. */
export default function CrmLeadsTable<T extends CrmLeadRowBase>({
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
  const columns = useMemo(
    () =>
      buildLeadColumns<T>({ entity, statusOptions, priorityOptions, superCategoryOptions, onEdit, onDelete }),
    [entity, statusOptions, priorityOptions, superCategoryOptions, onEdit, onDelete],
  );
  const meta = LEAD_ENTITY_META[entity];

  return (
    <DuncitTable<T>
      tableId={meta.tableId}
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getLeadRowId}
      onRowClick={onView}
      toolbarActions={toolbarActions}
      emptyText={meta.emptyText}
      defaultSort={{ field: 'next_follow_up_date', dir: 'asc' }}
      searchPlaceholder="Search name, city, phone or email"
      refetchRef={refetchRef}
    />
  );
}
