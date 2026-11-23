import { useMemo, useState } from 'react';
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import type { IntelSyncRun } from '@duncit/gql-types';
import { formatDateTime, useTranslation } from '@duncit/app-settings';
import { DuncitTable, clientTableFetch, dateColumn, type DuncitColumn } from '@duncit/table';

const RUN_COLOR: Record<string, 'default' | 'info' | 'success' | 'warning' | 'error'> = { QUEUED: 'default', RUNNING: 'info', SUCCESS: 'success', PARTIAL: 'warning', FAILED: 'error', SKIPPED: 'default' };
const RUN_KEYS: Record<string, string> = {
  QUEUED: 'intel.sync.run.QUEUED',
  RUNNING: 'intel.sync.run.RUNNING',
  SUCCESS: 'intel.sync.run.SUCCESS',
  PARTIAL: 'intel.sync.run.PARTIAL',
  FAILED: 'intel.sync.run.FAILED',
  SKIPPED: 'intel.sync.run.SKIPPED',
};

const searchOf = (r: IntelSyncRun) => `${r.connector_name} ${r.kind} ${r.status} ${r.trigger} ${r.error}`;

/** Every recent sync run: what triggered it, what it read and changed — click one for its log. */
export default function SyncRunsTable({ runs }: Readonly<{ runs: IntelSyncRun[] }>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<IntelSyncRun | null>(null);
  const columns = useMemo<DuncitColumn<IntelSyncRun>[]>(
    () => [
      { field: 'connector_name', headerName: t('intel.sync.colConnector'), flex: 1, minWidth: 180, type: 'text', valueGetter: (r) => r.connector_name },
      { field: 'mode', headerName: t('intel.sync.colMode'), width: 120, type: 'text', valueGetter: (r) => (r.mode === 'FULL' ? t('intel.sync.full') : t('intel.sync.incremental')) },
      { field: 'trigger', headerName: t('intel.sync.colTrigger'), width: 120, type: 'text', valueGetter: (r) => r.trigger },
      { field: 'status', headerName: t('intel.sync.colStatus'), width: 120, type: 'text', valueGetter: (r) => r.status, cellRenderer: (r) => <Chip size="small" variant="outlined" color={RUN_COLOR[r.status] ?? 'default'} label={t(RUN_KEYS[r.status] ?? 'intel.sync.run.QUEUED')} /> },
      { field: 'indexed', headerName: t('intel.sync.colIndexed'), width: 100, type: 'number', valueGetter: (r) => r.stats.indexed },
      { field: 'unchanged', headerName: t('intel.sync.colUnchanged'), width: 110, type: 'number', valueGetter: (r) => r.stats.unchanged },
      { field: 'deleted', headerName: t('intel.sync.colDeleted'), width: 100, type: 'number', valueGetter: (r) => r.stats.deleted },
      { field: 'failed', headerName: t('intel.sync.colFailed'), width: 90, type: 'number', valueGetter: (r) => r.stats.failed },
      dateColumn<IntelSyncRun>({ field: 'created_at', headerName: t('intel.sync.colWhen'), hide: false, getDate: (r) => r.created_at }),
    ],
    [t]
  );
  const fetchRows = useMemo(() => clientTableFetch<IntelSyncRun>(runs, searchOf, columns), [runs, columns]);
  return (
    <>
      <DuncitTable<IntelSyncRun> ariaLabel={t('intel.sync.runs')} tableId="intel-sync-runs" columns={columns} fetchRows={fetchRows} getRowId={(r) => r.id} onRowClick={setOpen} emptyText={t('intel.sync.noRuns')} searchPlaceholder={t('intel.sync.searchRuns')} defaultSort={{ field: 'created_at', dir: 'desc' }} />
      <Dialog open={Boolean(open)} onClose={() => setOpen(null)} fullWidth maxWidth="md">
        <DialogTitle>{open ? `${open.connector_name} · ${formatDateTime(open.created_at)}` : ''}</DialogTitle>
        <DialogContent dividers>
          {open?.error && <Typography color="error" variant="body2" sx={{ mb: 1 }}>{open.error}</Typography>}
          <Box component="pre" sx={{ m: 0, fontSize: '0.75rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {open?.log.length ? open.log.join('\n') : t('intel.sync.noLog')}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(null)}>{t('intel.common.close')}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
