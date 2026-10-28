import { useCallback, useState } from 'react';
import { Link as RouterLink } from 'react-router';
import { Alert, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ViewKanbanOutlinedIcon from '@mui/icons-material/ViewKanbanOutlined';
import { DuncitButton } from '@duncit/buttons';
import { notifyError } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { PageHeader, QueryGuard } from '@duncit/ui';
import { manualErrorText } from '../shared/errors';
import { useManualColumns } from '../shared/useManualLookups';
import type { ManualColumn } from '../shared/types';
import { ColumnDialog, DeleteColumnDialog } from './ColumnDialogs';
import ColumnsList from './ColumnsList';
import { useReorderColumns } from './useReorderColumns';

/** Which dialog is open: editing (null column = adding), or deleting a column. */
type DialogState = { kind: 'edit'; column: ManualColumn | null } | { kind: 'delete'; column: ManualColumn } | null;

const WHERE = { page: '/manual/settings', component: 'ManualSettingsPage' };

/** Manual Testing > Settings — the board's columns: order, names, meaning, WIP limits. */
export default function ManualSettingsPage() {
  const { t } = useTranslation();
  const { columns, loading, error, refetch } = useManualColumns();
  const [dialog, setDialog] = useState<DialogState>(null);
  const reload = useCallback(() => {
    refetch().catch((err: unknown) => notifyError(manualErrorText(t, err, t('testsManual.settings.loadFailed'), WHERE)));
  }, [refetch, t]);
  const order = useReorderColumns(columns, reload);
  const edit = useCallback((column: ManualColumn) => setDialog({ kind: 'edit', column }), []);
  const remove = useCallback((column: ManualColumn) => setDialog({ kind: 'delete', column }), []);
  const close = useCallback(() => setDialog(null), []);

  return (
    <Stack spacing={2}>
      <PageHeader
        title={t('testsManual.settings.title')}
        subtitle={t('testsManual.settings.subtitle')}
        actions={
          <Stack direction="row" spacing={1}>
            <DuncitButton component={RouterLink} to="/manual/board" startIcon={<ViewKanbanOutlinedIcon />}>
              {t('testsManual.cases.board')}
            </DuncitButton>
            <DuncitButton variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ kind: 'edit', column: null })}>
              {t('testsManual.settings.addColumn')}
            </DuncitButton>
          </Stack>
        }
      />
      <QueryGuard loading={loading && columns.length === 0} error={columns.length ? undefined : error}>
        {columns.length === 0 ? (
          <Alert severity="info">{t('testsManual.board.noColumns')}</Alert>
        ) : (
          <ColumnsList columns={order.ordered} onMove={order.move} onEdit={edit} onDelete={remove} />
        )}
      </QueryGuard>
      {dialog?.kind === 'edit' ? <ColumnDialog column={dialog.column} onClose={close} onSaved={reload} /> : null}
      {dialog?.kind === 'delete' ? (
        <DeleteColumnDialog
          column={dialog.column}
          targets={columns.filter((column) => column.id !== dialog.column.id)}
          onClose={close}
          onDeleted={reload}
        />
      ) : null}
    </Stack>
  );
}
