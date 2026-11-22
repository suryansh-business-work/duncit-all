import type { ReactNode } from 'react';
import { Stack, Typography } from '@mui/material';
import { actionsColumn, dateColumn, type DuncitColumn } from '@duncit/table';
import { PriorityChip, StatusChip } from '../StatusChips';
import { EmailStatusBadge } from '../email-status';
import { formatDate } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import type { LeadQualitySummary } from '../../api/leadQuality.gql';

/** Fields shared by host / venue / ecomm lead rows that the table touches. */
export interface CrmLeadRowBase {
  id: string;
  city?: string | null;
  lead_status: string;
  priority: string;
  next_follow_up_date?: string | null;
  created_at?: string | null;
  assigned_to?: string | null;
  super_category?: { name: string } | null;
  contacts?: { mobile_number?: string | null; email?: string | null }[];
  /** The lead's Lead Quality Score summary; null until it is first scored. */
  quality?: LeadQualitySummary | null;
}

export { leadEntityMeta, type CrmLeadEntity, type LeadFilterOption } from './leadEntityMeta';
import { leadEntityMeta, type CrmLeadEntity, type LeadFilterOption } from './leadEntityMeta';

type Translate = ReturnType<typeof useTranslation>['t'];

const fieldText = (row: object, key: string): string => {
  const value = (row as Record<string, unknown>)[key];
  if (value == null || value === '') return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
};

const fmtDate = (value?: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  return formatDate(date) || '—';
};

const renderStatus = (row: CrmLeadRowBase) => <StatusChip value={row.lead_status} />;
const renderPriority = (row: CrmLeadRowBase) => <PriorityChip value={row.priority} />;
const superCategoryName = (row: CrmLeadRowBase) => row.super_category?.name ?? '—';
const primaryEmail = (row: CrmLeadRowBase) => row.contacts?.[0]?.email ?? '';
/** The primary contact's email with its verification status — the green tick when verified. */
const renderEmail = (row: CrmLeadRowBase) => {
  const email = primaryEmail(row);
  if (!email) return '—';
  return (
    <Stack direction="row" spacing={1} component="span" sx={{ alignItems: 'center', minWidth: 0 }}>
      <Typography variant="body2" noWrap component="span">
        {email}
      </Typography>
      <EmailStatusBadge email={email} />
    </Stack>
  );
};
const followUpValue = (row: CrmLeadRowBase) => fmtDate(row.next_follow_up_date);
/** NaN-guarded `dd MMM yyyy` formatter for the shared date column. */
const fmtDateObj = (date: Date): string =>
  formatDate(date) || '—';

export interface LeadColumnOptions<T extends CrmLeadRowBase> {
  entity: CrmLeadEntity;
  statusOptions: ReadonlyArray<LeadFilterOption>;
  priorityOptions: ReadonlyArray<LeadFilterOption>;
  superCategoryOptions: ReadonlyArray<LeadFilterOption>;
  /** CRM team members for the Assigned To filter (value = user id). */
  assigneeOptions: ReadonlyArray<LeadFilterOption>;
  onEdit: (lead: T) => void;
  onDelete: (lead: T) => void;
  /** Headings are copy — the table hands its translator down. */
  t: Translate;
}

/** Column set for one lead entity; sortable/filterable fields follow the server allowlists. */
export function buildLeadColumns<T extends CrmLeadRowBase>(
  options: LeadColumnOptions<T>,
): DuncitColumn<T>[] {
  const { t } = options;
  const meta = leadEntityMeta(t)[options.entity];
  const { extra } = meta;
  const renderName = (row: T): ReactNode => (
    <Stack sx={{ lineHeight: 1.2 }} component="span">
      <Typography variant="body2" noWrap component="span" sx={{
        fontWeight: 700
      }}>
        {fieldText(row, meta.nameField)}
      </Typography>
      <Typography variant="caption" noWrap component="span" sx={{
        color: "text.secondary"
      }}>
        {row.contacts?.[0]?.mobile_number || '—'}
      </Typography>
    </Stack>
  );
  const columns: DuncitColumn<T>[] = [
    {
      field: meta.nameField,
      headerName: meta.nameHeader,
      type: 'text',
      flex: 1.4,
      minWidth: 200,
      cellRenderer: renderName,
      valueGetter: (row) => fieldText(row, meta.nameField),
    },
  ];
  if (extra) {
    columns.push({
      field: extra.field,
      headerName: extra.headerName,
      minWidth: 120,
      type: 'text',
      valueGetter: (row) => fieldText(row, extra.field),
    });
  }
  columns.push(
    {
      field: 'email',
      headerName: t('shell.common.email'),
      minWidth: 260,
      type: 'text',
      cellRenderer: renderEmail,
      valueGetter: primaryEmail,
    },
    { field: 'city', headerName: t('crm.common.city'), minWidth: 120, type: 'text', valueGetter: (row) => row.city ?? '—' },
    {
      field: 'lead_status',
      headerName: t('shell.common.status'),
      minWidth: 130,
      type: 'enum',
      options: options.statusOptions,
      cellRenderer: renderStatus,
      valueGetter: (row) => row.lead_status,
    },
    {
      field: 'priority',
      headerName: t('crm.common.priority'),
      minWidth: 110,
      type: 'enum',
      options: options.priorityOptions,
      cellRenderer: renderPriority,
      valueGetter: (row) => row.priority,
    },
    {
      field: 'super_category_id',
      headerName: t('crm.common.superCategory'),
      hide: true,
      minWidth: 150,
      type: 'enum',
      options: options.superCategoryOptions,
      valueGetter: superCategoryName,
    },
    {
      // Sorted by the assignee's name, filtered by their user id (server: assigned_to → assigned_user_id).
      field: 'assigned_to',
      headerName: t('crm.forms.assignedTo'),
      minWidth: 150,
      type: 'enum',
      options: options.assigneeOptions,
      valueGetter: (row) => row.assigned_to || '—',
    },
    { field: 'next_follow_up_date', headerName: 'Follow-up', minWidth: 140, type: 'date', valueGetter: followUpValue },
    dateColumn<T>({ formatDate: fmtDateObj }),
    actionsColumn<T>({
      onEdit: options.onEdit,
      onDelete: options.onDelete,
      edit: { ariaLabel: 'Edit lead' },
      delete: { ariaLabel: 'Delete lead' },
    }),
  );
  return columns;
}
