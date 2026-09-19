import { useMemo, type ReactNode } from 'react';
import { Box, Chip, Stack, Tooltip, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import RemoveIcon from '@mui/icons-material/Remove';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ScienceIcon from '@mui/icons-material/Science';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { formatDateTime } from '@duncit/app-settings';
import { DuncitIconButton } from '@duncit/buttons';
import { dateColumn, DuncitTable, type DuncitColumn } from '@duncit/table';
import { usePortalT } from '../../../shared/i18n';
import { useClientTable } from '../../components/useClientTable';
import type { LiteEnvEntry } from '../../graphql/environment';

type Translate = ReturnType<typeof usePortalT>['t'];

interface Handlers {
  onEdit: (entry: LiteEnvEntry) => void;
  onDelete: (entry: LiteEnvEntry) => void;
  onSetDefault: (entry: LiteEnvEntry) => void;
  onTest: (entry: LiteEnvEntry) => void;
}

interface Props extends Handlers {
  rows: readonly LiteEnvEntry[];
  categoryLabel: string;
  toolbarActions: ReactNode;
}

const rowId = (entry: LiteEnvEntry) => entry.id;
const searchText = (entry: LiteEnvEntry) => `${entry.name} ${entry.description ?? ''}`;

function lastTestText(entry: LiteEnvEntry, t: Translate): string {
  if (entry.last_test_ok === null || !entry.last_tested_at) return t('litePortal.environment.notTested');
  const vars = { vars: { when: formatDateTime(entry.last_tested_at) } };
  return entry.last_test_ok ? t('litePortal.environment.testPassedAt', vars) : t('litePortal.environment.testFailedAt', vars);
}

function LastTested({ entry }: Readonly<{ entry: LiteEnvEntry }>) {
  const { t } = usePortalT();
  const label = lastTestText(entry, t);
  let icon = <RemoveIcon fontSize="small" color="action" />;
  if (entry.last_test_ok === true) icon = <CheckCircleIcon fontSize="small" color="success" />;
  if (entry.last_test_ok === false) icon = <CancelIcon fontSize="small" color="error" />;
  return (
    <Tooltip title={label}>
      <Box component="span" role="img" aria-label={label} sx={{ display: 'inline-flex' }}>
        {icon}
      </Box>
    </Tooltip>
  );
}

function StatusCell({ entry }: Readonly<{ entry: LiteEnvEntry }>) {
  const { t } = usePortalT();
  return (
    <Stack direction="row" spacing={0.5} component="span">
      {entry.is_default && <Chip size="small" color="primary" label={t('litePortal.environment.default')} />}
      <Chip size="small" variant="outlined" color={entry.is_active ? 'success' : 'default'} label={entry.is_active ? t('litePortal.common.active') : t('litePortal.environment.off')} />
    </Stack>
  );
}

function RowActions({ entry, onEdit, onDelete, onSetDefault, onTest }: Readonly<Handlers & { entry: LiteEnvEntry }>) {
  const { t } = usePortalT();
  const vars = { vars: { name: entry.name } };
  const defaultLabel = entry.is_default ? t('litePortal.environment.isDefault', vars) : t('litePortal.environment.setDefault', vars);
  return (
    <Stack direction="row" spacing={0.5} component="span" sx={{ justifyContent: 'flex-end' }}>
      <Tooltip title={t('litePortal.environment.test', vars)}>
        <DuncitIconButton size="small" aria-label={t('litePortal.environment.test', vars)} onClick={() => onTest(entry)} data-testid={`env-test-${entry.id}`}>
          <ScienceIcon fontSize="small" />
        </DuncitIconButton>
      </Tooltip>
      <Tooltip title={t('litePortal.common.edit', vars)}>
        <DuncitIconButton size="small" aria-label={t('litePortal.common.edit', vars)} onClick={() => onEdit(entry)} data-testid={`env-edit-${entry.id}`}>
          <EditIcon fontSize="small" />
        </DuncitIconButton>
      </Tooltip>
      <Tooltip title={defaultLabel}>
        <span>
          <DuncitIconButton size="small" disabled={entry.is_default} aria-label={defaultLabel} aria-pressed={entry.is_default} onClick={() => onSetDefault(entry)} data-testid={`env-default-${entry.id}`}>
            {entry.is_default ? <StarIcon fontSize="small" color="primary" /> : <StarBorderIcon fontSize="small" />}
          </DuncitIconButton>
        </span>
      </Tooltip>
      <Tooltip title={t('litePortal.common.delete', vars)}>
        <DuncitIconButton size="small" color="error" aria-label={t('litePortal.common.delete', vars)} onClick={() => onDelete(entry)} data-testid={`env-delete-${entry.id}`}>
          <DeleteIcon fontSize="small" />
        </DuncitIconButton>
      </Tooltip>
    </Stack>
  );
}

const renderName = (entry: LiteEnvEntry) => (
  <Box sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" component="div" sx={{ fontWeight: 700 }}>
      {entry.name}
    </Typography>
    <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
      {entry.description}
    </Typography>
  </Box>
);

export function EnvEntriesTable({ rows, categoryLabel, toolbarActions, onEdit, onDelete, onSetDefault, onTest }: Readonly<Props>) {
  const { t } = usePortalT();
  const columns = useMemo<DuncitColumn<LiteEnvEntry>[]>(
    () => [
      { field: 'name', headerName: t('litePortal.environment.colName'), type: 'text', flex: 1, minWidth: 220, cellRenderer: renderName, valueGetter: (entry) => entry.name },
      { field: 'is_active', headerName: t('litePortal.environment.colStatus'), type: 'boolean', width: 160, cellRenderer: (entry) => <StatusCell entry={entry} /> },
      { field: 'is_default', headerName: t('litePortal.environment.default'), type: 'boolean', width: 100, hide: true },
      { field: 'last_tested_at', headerName: t('litePortal.environment.colLastTest'), type: 'date', width: 120, cellRenderer: (entry) => <LastTested entry={entry} />, valueGetter: (entry) => lastTestText(entry, t) },
      dateColumn({ headerName: t('litePortal.common.created') }),
      {
        field: 'actions',
        headerName: t('litePortal.common.actions'),
        type: 'actions',
        width: 180,
        cellRenderer: (entry) => <RowActions entry={entry} onEdit={onEdit} onDelete={onDelete} onSetDefault={onSetDefault} onTest={onTest} />,
      },
    ],
    [t, onEdit, onDelete, onSetDefault, onTest],
  );
  const { fetchRows, refetchRef } = useClientTable(rows, searchText, columns);

  return (
    <DuncitTable<LiteEnvEntry>
      tableId="lite-env-entries"
      ariaLabel={categoryLabel}
      columns={columns}
      fetchRows={fetchRows}
      getRowId={rowId}
      toolbarActions={toolbarActions}
      emptyText={t('litePortal.environment.empty')}
      searchPlaceholder={t('litePortal.environment.search')}
      defaultSort={{ field: 'name', dir: 'asc' }}
      refetchRef={refetchRef}
    />
  );
}
