import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { format } from 'date-fns';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import type { EmailTemplateRow } from '../../api/emailTemplates.gql';

interface Props {
  fetchRows: TableFetch<EmailTemplateRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  onEdit: (t: EmailTemplateRow) => void;
  onDelete: (t: EmailTemplateRow) => void;
}

const getTemplateRowId = (t: EmailTemplateRow) => t.template_id;

const fmt = (iso?: string | null) => (iso ? format(new Date(iso), 'd MMM yyyy') : '—');

const TARGET_LABEL: Record<string, string> = { VENUE: 'Venue', HOST: 'Host', ECOMM: 'Ecomm', STATIC: 'Static' };

const TARGET_OPTIONS = [
  { value: 'VENUE', label: 'Venue' },
  { value: 'HOST', label: 'Host' },
  { value: 'ECOMM', label: 'Ecomm' },
  { value: 'STATIC', label: 'Static' },
] as const;

const renderName = (t: EmailTemplateRow) => (
  <Typography variant="body2" fontWeight={700} component="span">
    {t.name}
  </Typography>
);

const renderSlug = (t: EmailTemplateRow) => (
  <Typography variant="caption" sx={{ fontFamily: 'monospace' }} component="span">
    {t.slug}
  </Typography>
);

const targetValue = (t: EmailTemplateRow) => TARGET_LABEL[t.target] ?? t.target;

const renderTarget = (t: EmailTemplateRow) => (
  <Chip size="small" variant="outlined" color="primary" label={targetValue(t)} />
);

const renderStatus = (t: EmailTemplateRow) => (
  <Chip size="small" color={t.is_active ? 'success' : 'default'} label={t.is_active ? 'Active' : 'Inactive'} />
);

/** CRM email templates on the shared server-driven table; row click opens the editor. */
export default function TemplatesTable({
  fetchRows,
  refetchRef,
  toolbarActions,
  onEdit,
  onDelete,
}: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<EmailTemplateRow>[]>(() => {
    const renderActions = (t: EmailTemplateRow) => (
      <Stack direction="row" spacing={0.5} justifyContent="flex-end" component="span">
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => onEdit(t)} aria-label={`Edit ${t.name}`}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton size="small" color="error" onClick={() => onDelete(t)} aria-label={`Delete ${t.name}`}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    );
    return [
      { field: 'name', headerName: 'Name', flex: 1, minWidth: 180, cellRenderer: renderName, valueGetter: (t) => t.name },
      { field: 'slug', headerName: 'Slug', minWidth: 150, cellRenderer: renderSlug, valueGetter: (t) => t.slug },
      {
        field: 'target',
        headerName: 'For',
        filter: { type: 'select', options: TARGET_OPTIONS },
        width: 110,
        cellRenderer: renderTarget,
        valueGetter: targetValue,
      },
      { field: 'subject', headerName: 'Subject', flex: 1, minWidth: 200, valueGetter: (t) => t.subject },
      {
        field: 'is_active',
        headerName: 'Status',
        filter: { type: 'boolean' },
        width: 110,
        cellRenderer: renderStatus,
        valueGetter: (t) => (t.is_active ? 'Active' : 'Inactive'),
      },
      { field: 'updated_at', headerName: 'Updated', filter: { type: 'date' }, width: 130, valueGetter: (t) => fmt(t.updated_at) },
      { field: 'created_at', headerName: 'Created', filter: { type: 'date' }, hide: true, width: 130, valueGetter: (t) => fmt(t.created_at) },
      { field: 'actions', headerName: 'Actions', sortable: false, width: 110, cellRenderer: renderActions },
    ];
  }, [onEdit, onDelete]);

  return (
    <DuncitTable<EmailTemplateRow>
      tableId="crm-email-templates"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getTemplateRowId}
      onRowClick={onEdit}
      toolbarActions={toolbarActions}
      emptyText='No templates yet. Click "New template" to create your first one.'
      defaultSort={{ field: 'name', dir: 'asc' }}
      searchPlaceholder="Search name, slug or subject"
      refetchRef={refetchRef}
    />
  );
}
