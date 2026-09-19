import type { ComponentPropsWithRef } from 'react';
import { Box, Stack, Switch, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SendIcon from '@mui/icons-material/Send';
import { DuncitIconButton } from '@duncit/buttons';
import { dateColumn, type DuncitColumn } from '@duncit/table';
import { usePortalT } from '../../../shared/i18n';
import type { LiteEmailTemplate } from '../../graphql/email';

type Translate = ReturnType<typeof usePortalT>['t'];

export const templateRowId = (row: LiteEmailTemplate): string => row.id;
export const templateSearchText = (row: LiteEmailTemplate): string => `${row.name} ${row.key} ${row.description}`;

export interface TemplateHandlers {
  onEdit: (row: LiteEmailTemplate) => void;
  onSendTest: (row: LiteEmailTemplate) => void;
  onToggle: (row: LiteEmailTemplate, enabled: boolean) => void;
}

const renderName = (row: LiteEmailTemplate) => (
  <Box sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" component="div" sx={{ fontWeight: 700 }}>
      {row.name}
    </Typography>
    <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
      {row.description}
    </Typography>
  </Box>
);

const renderKey = (row: LiteEmailTemplate) => (
  <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
    {row.key}
  </Typography>
);

type SwitchInputProps = ComponentPropsWithRef<'input'> & { 'data-testid'?: string };

function EnabledSwitch({ row, onToggle }: Readonly<{ row: LiteEmailTemplate; onToggle: TemplateHandlers['onToggle'] }>) {
  const { t } = usePortalT();
  const inputProps: SwitchInputProps = { 'aria-label': t('litePortal.emailTemplates.toggle', { vars: { name: row.name } }), 'data-testid': `template-enabled-${row.key}` };
  return <Switch size="small" checked={row.enabled} onChange={(event) => onToggle(row, event.target.checked)} slotProps={{ input: inputProps }} />;
}

function RowActions({ row, onEdit, onSendTest }: Readonly<{ row: LiteEmailTemplate; onEdit: TemplateHandlers['onEdit']; onSendTest: TemplateHandlers['onSendTest'] }>) {
  const { t } = usePortalT();
  const vars = { vars: { name: row.name } };
  return (
    <Stack direction="row" spacing={0.5} component="span" sx={{ justifyContent: 'flex-end' }}>
      <Tooltip title={t('litePortal.common.edit', vars)}>
        <DuncitIconButton size="small" aria-label={t('litePortal.common.edit', vars)} onClick={() => onEdit(row)} data-testid={`template-edit-${row.key}`}>
          <EditIcon fontSize="small" />
        </DuncitIconButton>
      </Tooltip>
      <Tooltip title={t('litePortal.emailTemplates.sendTest', vars)}>
        <DuncitIconButton size="small" aria-label={t('litePortal.emailTemplates.sendTest', vars)} onClick={() => onSendTest(row)} data-testid={`template-send-test-${row.key}`}>
          <SendIcon fontSize="small" />
        </DuncitIconButton>
      </Tooltip>
    </Stack>
  );
}

export function buildTemplateColumns(t: Translate, handlers: TemplateHandlers): DuncitColumn<LiteEmailTemplate>[] {
  const enabled = t('litePortal.common.enabled');
  const disabled = t('litePortal.common.disabled');
  return [
    { field: 'name', headerName: t('litePortal.emailTemplates.colName'), type: 'text', flex: 1, minWidth: 240, cellRenderer: renderName, valueGetter: (row) => row.name },
    { field: 'key', headerName: t('litePortal.emailTemplates.colKey'), type: 'text', width: 220, cellRenderer: renderKey },
    {
      field: 'enabled',
      headerName: t('litePortal.emailTemplates.colEnabled'),
      type: 'boolean',
      width: 110,
      cellRenderer: (row) => <EnabledSwitch row={row} onToggle={handlers.onToggle} />,
      valueGetter: (row) => (row.enabled ? enabled : disabled),
    },
    { field: 'sent_count', headerName: t('litePortal.emailTemplates.colSent'), type: 'number', width: 90 },
    dateColumn({ field: 'updated_at', headerName: t('litePortal.emailTemplates.colUpdated'), hide: false, width: 130 }),
    { field: 'actions', headerName: t('litePortal.common.actions'), type: 'actions', width: 100, cellRenderer: (row) => <RowActions row={row} onEdit={handlers.onEdit} onSendTest={handlers.onSendTest} /> },
  ];
}
