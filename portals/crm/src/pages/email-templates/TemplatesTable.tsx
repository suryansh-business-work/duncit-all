import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Chip, Typography } from '@mui/material';
import {
  DuncitTable,
  actionsColumn,
  activeChipColumn,
  dateColumn,
  type DuncitColumn,
  type TableFetch,
} from '@duncit/table';
import type { EmailTemplateRow } from '../../api/emailTemplates.gql';
import { useTranslation } from '@duncit/shell';

interface Props {
  fetchRows: TableFetch<EmailTemplateRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  onEdit: (t: EmailTemplateRow) => void;
  onDelete: (t: EmailTemplateRow) => void;
}

const getTemplateRowId = (t: EmailTemplateRow) => t.template_id;

type Translate = ReturnType<typeof useTranslation>['t'];

const targetLabel = (t: Translate): Record<string, string> => ({ VENUE: t('crm.common.venue'), HOST: 'Host', ECOMM: 'Ecomm', STATIC: 'Static' });

const targetOptions = (t: Translate) => [
  { value: 'VENUE', label: t('crm.common.venue') },
  { value: 'HOST', label: t('crm.common.host') },
  { value: 'ECOMM', label: t('crm.common.ecomm') },
  { value: 'STATIC', label: t('crm.emailTemplates.static') },
];

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

const targetValue = (row: EmailTemplateRow, t: Translate) => targetLabel(t)[row.target] ?? row.target;

const renderTarget = (row: EmailTemplateRow, t: Translate) => (
  <Chip size="small" variant="outlined" color="primary" label={targetValue(row, t)} />
);

/** CRM email templates on the shared server-driven table; row click opens the editor. */
export default function TemplatesTable({
  fetchRows,
  refetchRef,
  toolbarActions,
  onEdit,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<EmailTemplateRow>[]>(
    () => [
      { field: 'name', headerName: t('shell.common.name'), flex: 1, minWidth: 180, cellRenderer: renderName, valueGetter: (t) => t.name },
      { field: 'slug', headerName: t('crm.emailTemplates.slug'), minWidth: 150, cellRenderer: renderSlug, valueGetter: (t) => t.slug },
      {
        field: 'target',
        headerName: t('crm.emailTemplates.for'),
        filter: { type: 'select', options: targetOptions(t) },
        width: 110,
        cellRenderer: (row: EmailTemplateRow) => renderTarget(row, t),
        valueGetter: (row: EmailTemplateRow) => targetValue(row, t),
      },
      { field: 'subject', headerName: t('crm.common.subject'), flex: 1, minWidth: 200, valueGetter: (t) => t.subject },
      activeChipColumn<EmailTemplateRow>(),
      dateColumn<EmailTemplateRow>({ field: 'updated_at', headerName: t('shell.common.updated'), hide: false }),
      dateColumn<EmailTemplateRow>(),
      actionsColumn<EmailTemplateRow>({
        onEdit,
        onDelete,
        edit: { ariaLabel: (t) => `Edit ${t.name}` },
        delete: { ariaLabel: (t) => `Delete ${t.name}` },
      }),
    ],
    [onEdit, onDelete],
  );

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
