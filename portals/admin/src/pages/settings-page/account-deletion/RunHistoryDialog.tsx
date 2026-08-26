import { useMemo } from 'react';
import { useApolloClient } from '@apollo/client';
import { Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { DuncitTable, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { formatDateTime, useTranslation } from '@duncit/app-settings';
import { ACCOUNT_DELETION_RUNS, type DeletionRun } from './queries';

const getRowId = (row: DeletionRun) => row.id;

// Cells live at module scope so a re-render does not hand the table a brand-new
// component type per column (S6478).
const renderRunId = (row: DeletionRun) => (
  <Typography variant="body2" noWrap sx={{ fontFamily: 'monospace' }}>
    {row.run_id}
  </Typography>
);

const renderTrigger = (row: DeletionRun) => (
  <Chip size="small" variant="outlined" label={row.trigger} />
);

const renderStatus = (row: DeletionRun) => (
  <Chip
    size="small"
    color={row.status === 'FAILED' ? 'error' : 'success'}
    label={row.status}
  />
);

const renderStarted = (row: DeletionRun) => (
  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
    {formatDateTime(row.started_at)}
  </Typography>
);

/**
 * Purged, and how many did not go through.
 *
 * The failures are coloured only when there ARE any: a run where every account
 * went through must not carry a red zero, or the colour stops meaning anything
 * on the night it matters.
 */
const renderOutcome = (row: DeletionRun) => (
  <Typography variant="body2">
    {row.purged}
    {row.failed > 0 && (
      <Typography component="span" variant="body2" sx={{ color: 'error.main', fontWeight: 700 }}>
        {` · ${row.failed} failed`}
      </Typography>
    )}
  </Typography>
);

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * The audit log: every sweep, newest first.
 *
 * A run is written whether or not it found anybody, which is what makes this
 * table answerable in both directions — it shows that accounts were removed on
 * a date, and it shows that the job was alive on a night it removed nobody. A
 * missing row is the signal; without the empty runs there would be nothing to
 * tell "nobody was due" apart from "the sweep never fired".
 */
export default function RunHistoryDialog({ open, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const fetchRows = useApolloTableFetch<DeletionRun>(
    client,
    ACCOUNT_DELETION_RUNS,
    'accountDeletionRuns'
  );

  const columns = useMemo<DuncitColumn<DeletionRun>[]>(
    () => [
      {
        field: 'run_id',
        headerName: t('admin.accountDeletion.runReference'),
        width: 165,
        cellRenderer: renderRunId,
      },
      {
        field: 'started_at',
        headerName: t('admin.accountDeletion.runStarted'),
        width: 190,
        cellRenderer: renderStarted,
      },
      {
        field: 'trigger',
        headerName: t('admin.accountDeletion.runTrigger'),
        width: 130,
        cellRenderer: renderTrigger,
      },
      {
        field: 'status',
        headerName: t('admin.accountDeletion.runStatus'),
        width: 130,
        cellRenderer: renderStatus,
      },
      {
        field: 'eligible',
        headerName: t('admin.accountDeletion.runEligible'),
        width: 110,
      },
      {
        field: 'purged',
        headerName: t('admin.accountDeletion.runPurged'),
        width: 150,
        cellRenderer: renderOutcome,
      },
    ],
    [t]
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ fontWeight: 800 }}>{t('admin.accountDeletion.runsTitle')}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          {t('admin.accountDeletion.runsIntro')}
        </Typography>
        <DuncitTable<DeletionRun>
          columns={columns}
          fetchRows={fetchRows}
          getRowId={getRowId}
          emptyText={t('admin.accountDeletion.runsEmpty')}
          tableId="admin-deletion-runs"
          defaultSort={{ field: 'started_at', dir: 'desc' }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('admin.accountDeletion.close')}</Button>
      </DialogActions>
    </Dialog>
  );
}
