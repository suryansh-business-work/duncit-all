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
import { useCrmStaffSearch } from '../../hooks/useCrmStaffSearch';
import type { NearbyLeads } from '../../hooks/useNearbyLeads';
import { distanceColumn, type NearbyRowFields } from '../nearby-leads/distanceColumn';
import NearbyLeadsControl from '../nearby-leads/NearbyLeadsControl';

/** The Assigned To filter lists the whole CRM team; it is a small group. */
const ASSIGNEE_FILTER_LIMIT = 50;

type LeadRow = CrmLeadRowBase & DuplicateFlagged & NearbyRowFields;

interface Props<T extends LeadRow> {
  entity: CrmLeadEntity;
  fetchRows: TableFetch<T>;
  refetchRef: MutableRefObject<(() => void) | null>;
  statusOptions: ReadonlyArray<LeadFilterOption>;
  priorityOptions: ReadonlyArray<LeadFilterOption>;
  superCategoryOptions: ReadonlyArray<LeadFilterOption>;
  toolbarActions?: ReactNode;
  /** Nearby leads for this table (useLeadsTableFetch); adds the toolbar control and, while on, the Distance column. */
  nearby?: NearbyLeads;
  onView: (lead: T) => void;
  onEdit: (lead: T) => void;
  onDelete: (lead: T) => void;
}

const getLeadRowId = (row: CrmLeadRowBase) => row.id;
const FOLLOW_UP_FIRST = { field: 'next_follow_up_date', dir: 'asc' } as const;
const NEAREST_FIRST = { field: 'distance_km', dir: 'asc' } as const;

/** Shared server-driven table for every lead kind; a duplicate lead's row is red. */
export default function CrmLeadsTable<T extends LeadRow>({
  entity,
  fetchRows,
  refetchRef,
  statusOptions,
  priorityOptions,
  superCategoryOptions,
  toolbarActions,
  nearby,
  onView,
  onEdit,
  onDelete,
}: Readonly<Props<T>>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { users } = useCrmStaffSearch('', { limit: ASSIGNEE_FILTER_LIMIT });
  const assigneeOptions = useMemo(
    () => users.map((user) => ({ value: user.id, label: user.name || user.email || user.id })),
    [users],
  );
  const nearbyOn = Boolean(nearby?.near);
  const columns = useMemo(() => {
    const base = buildLeadColumns<T>({ entity, statusOptions, priorityOptions, superCategoryOptions, assigneeOptions, onEdit, onDelete, t });
    // The Distance column sits right after the lead name while a nearby search is on.
    const withDistance = nearbyOn ? [base[0], distanceColumn<T>(t), ...base.slice(1)] : base;
    return withDuplicateMark(withDistance, t);
  }, [entity, statusOptions, priorityOptions, superCategoryOptions, assigneeOptions, onEdit, onDelete, t, nearbyOn]);
  const getRowStyle = useMemo(() => duplicateRowStyle(theme), [theme]);
  const meta = leadEntityMeta(t)[entity];

  return (
    <DuncitTable<T>
      // Turning a nearby search on or off starts the table fresh, so it sorts nearest first (or by follow-up again).
      key={nearbyOn ? 'nearby' : 'all'}
      tableId={meta.tableId}
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getLeadRowId}
      getRowStyle={getRowStyle}
      onRowClick={onView}
      toolbarActions={
        nearby ? (
          <>
            <NearbyLeadsControl nearby={nearby} />
            {toolbarActions}
          </>
        ) : (
          toolbarActions
        )
      }
      emptyText={meta.emptyText}
      defaultSort={nearbyOn ? NEAREST_FIRST : FOLLOW_UP_FIRST}
      searchPlaceholder="Search name, city, phone or email"
      refetchRef={refetchRef}
    />
  );
}
