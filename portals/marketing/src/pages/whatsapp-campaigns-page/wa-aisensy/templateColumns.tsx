import { Typography } from '@mui/material';
import type { DuncitColumn } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import type { AisensyTemplate } from '../queries';
import TemplateRowActions from './TemplateRowActions';
import SendCountCell from './SendCountCell';
import type { WithSendCount } from './useWaSendCounts';
import { AISENSY_TEMPLATE_STATUS_COLORS, statusKey } from './helpers';

/** A template plus what the campaigns behind it have sent. The figures are real
 * row properties because this table pages in memory and sorts by reading one
 * off the row, never through a `valueGetter`. */
export type TemplateSendRow = AisensyTemplate & WithSendCount;

const renderStatus = (template: AisensyTemplate) => (
  <StatusChip
    status={statusKey(template.status)}
    label={template.status}
    colorMap={AISENSY_TEMPLATE_STATUS_COLORS}
  />
);

/** The first line of the body, so a row hints at the message without becoming
 * the message — the full text is one click away in the sample. */
const renderBody = (template: AisensyTemplate) => (
  <Typography variant="body2" noWrap sx={{ color: 'text.secondary' }}>
    {template.body}
  </Typography>
);

interface ColumnDeps {
  t: (key: string) => string;
  /** True while a delete is in flight, so only that row's action goes inert. */
  busy: boolean;
  onDelete: (template: AisensyTemplate) => void;
  /** Opens the Logs tab narrowed to the campaigns that send this template. */
  onOpenLogs: (campaigns: readonly string[]) => void;
}

/**
 * The template table's columns.
 *
 * Sorting is in memory (the catalogue arrives whole), so every `field` here is
 * a real row property — a synthetic one would sort by undefined.
 */
export function getTemplateColumns({
  t,
  busy,
  onDelete,
  onOpenLogs,
}: Readonly<ColumnDeps>): DuncitColumn<TemplateSendRow>[] {
  return [
    {
      field: 'name',
      headerName: t('marketing.whatsappCampaigns.template'),
      minWidth: 220,
      flex: 1,
    },
    { field: 'category', headerName: t('marketing.whatsappCampaigns.category'), width: 140 },
    { field: 'language', headerName: t('marketing.common.language'), width: 120 },
    {
      field: 'status',
      headerName: t('shell.common.status'),
      width: 130,
      cellRenderer: renderStatus,
    },
    { field: 'param_count', headerName: t('marketing.whatsappCampaigns.params'), width: 100 },
    {
      field: 'body',
      headerName: t('marketing.whatsappCampaigns.message'),
      minWidth: 260,
      flex: 2,
      cellRenderer: renderBody,
    },
    {
      // Nothing is ever logged against a template — a send addresses a
      // CAMPAIGN — so this is the sum of the campaigns that send it.
      field: 'sent_count',
      headerName: t('marketingWhatsapp.sendCount.header'),
      width: 110,
      cellRenderer: (template) => <SendCountCell row={template} onOpenLogs={onOpenLogs} />,
    },
    {
      field: 'actions',
      headerName: t('shell.common.actions'),
      width: 100,
      sortable: false,
      cellRenderer: (template) => (
        <TemplateRowActions template={template} busy={busy} onDelete={onDelete} />
      ),
    },
  ];
}
