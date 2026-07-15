import type { ReactNode } from 'react';
import { IconButton, Stack, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { format } from 'date-fns';
import type { DuncitColumn } from '@duncit/table';
import { PriorityChip, StatusChip } from '../StatusChips';

/** Fields shared by host / venue / ecomm lead rows that the table touches. */
export interface CrmLeadRowBase {
  id: string;
  city?: string | null;
  lead_status: string;
  priority: string;
  next_follow_up_date?: string | null;
  created_at?: string | null;
  super_category?: { name: string } | null;
  contacts?: { mobile_number?: string | null }[];
}

export type CrmLeadEntity = 'host' | 'venue' | 'ecomm';
export type LeadFilterOption = { value: string; label: string };

interface EntityMeta {
  tableId: string;
  nameField: string;
  nameHeader: string;
  /** Entity-specific column between the name and City (host Type / ecomm Brand). */
  extra?: { field: string; headerName: string };
  emptyText: string;
}

export const LEAD_ENTITY_META: Record<CrmLeadEntity, EntityMeta> = {
  host: {
    tableId: 'crm-host-leads',
    nameField: 'host_name',
    nameHeader: 'Host',
    extra: { field: 'host_type', headerName: 'Type' },
    emptyText: 'No host leads yet. Click "New Host Lead" to create the first one.',
  },
  venue: {
    tableId: 'crm-venue-leads',
    nameField: 'venue_name',
    nameHeader: 'Venue',
    emptyText: 'No venue leads yet. Click "New Venue Lead" to create the first one.',
  },
  ecomm: {
    tableId: 'crm-ecomm-leads',
    nameField: 'seller_name',
    nameHeader: 'Seller',
    extra: { field: 'brand_name', headerName: 'Brand' },
    emptyText: 'No ecomm leads yet. Click "New Ecomm Lead" to create the first one.',
  },
};

const fieldText = (row: object, key: string): string => {
  const value = (row as Record<string, unknown>)[key];
  if (value == null || value === '') return '—';
  return String(value);
};

const fmtDate = (value?: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : format(date, 'dd MMM yyyy');
};

const renderStatus = (row: CrmLeadRowBase) => <StatusChip value={row.lead_status} />;
const renderPriority = (row: CrmLeadRowBase) => <PriorityChip value={row.priority} />;
const superCategoryName = (row: CrmLeadRowBase) => row.super_category?.name ?? '—';
const followUpValue = (row: CrmLeadRowBase) => fmtDate(row.next_follow_up_date);
const createdValue = (row: CrmLeadRowBase) => fmtDate(row.created_at);

export interface LeadColumnOptions<T extends CrmLeadRowBase> {
  entity: CrmLeadEntity;
  statusOptions: ReadonlyArray<LeadFilterOption>;
  priorityOptions: ReadonlyArray<LeadFilterOption>;
  superCategoryOptions: ReadonlyArray<LeadFilterOption>;
  onEdit: (lead: T) => void;
  onDelete: (lead: T) => void;
}

/** Column set for one lead entity; sortable/filterable fields follow the server allowlists. */
export function buildLeadColumns<T extends CrmLeadRowBase>(
  options: LeadColumnOptions<T>,
): DuncitColumn<T>[] {
  const meta = LEAD_ENTITY_META[options.entity];
  const { extra } = meta;
  const renderName = (row: T): ReactNode => (
    <Stack sx={{ lineHeight: 1.2 }} component="span">
      <Typography variant="body2" fontWeight={700} noWrap component="span">
        {fieldText(row, meta.nameField)}
      </Typography>
      <Typography variant="caption" color="text.secondary" noWrap component="span">
        {row.contacts?.[0]?.mobile_number || '—'}
      </Typography>
    </Stack>
  );
  const renderActions = (row: T): ReactNode => (
    <Stack direction="row" spacing={0.5} justifyContent="flex-end" component="span">
      <Tooltip title="Edit">
        <IconButton size="small" aria-label="Edit lead" onClick={() => options.onEdit(row)}>
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete">
        <IconButton size="small" color="error" aria-label="Delete lead" onClick={() => options.onDelete(row)}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );

  const columns: DuncitColumn<T>[] = [
    {
      field: meta.nameField,
      headerName: meta.nameHeader,
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
      filter: { type: 'text' },
      valueGetter: (row) => fieldText(row, extra.field),
    });
  }
  columns.push(
    { field: 'city', headerName: 'City', minWidth: 120, filter: { type: 'text' }, valueGetter: (row) => row.city ?? '—' },
    {
      field: 'lead_status',
      headerName: 'Status',
      minWidth: 130,
      filter: { type: 'select', options: options.statusOptions },
      cellRenderer: renderStatus,
      valueGetter: (row) => row.lead_status,
    },
    {
      field: 'priority',
      headerName: 'Priority',
      minWidth: 110,
      filter: { type: 'select', options: options.priorityOptions },
      cellRenderer: renderPriority,
      valueGetter: (row) => row.priority,
    },
    {
      field: 'super_category_id',
      headerName: 'Super Category',
      hide: true,
      minWidth: 150,
      filter: { type: 'select', options: options.superCategoryOptions },
      valueGetter: superCategoryName,
    },
    { field: 'next_follow_up_date', headerName: 'Follow-up', minWidth: 140, filter: { type: 'date' }, valueGetter: followUpValue },
    { field: 'created_at', headerName: 'Created', hide: true, width: 130, filter: { type: 'date' }, valueGetter: createdValue },
    { field: 'actions', headerName: 'Actions', sortable: false, width: 110, cellRenderer: renderActions },
  );
  return columns;
}
