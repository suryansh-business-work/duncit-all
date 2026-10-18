import { useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Dialog, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import { ADMIN_DELETE_GIG_JOB, ADMIN_SET_GIG_JOB_STATUS, GIG_JOBS_ADMIN_TABLE } from '../../queries';
import type { GigJobAdminRow } from '../../types';
import InterestsTable from '../interests/InterestsTable';
import { buildGigJobColumns } from './gigJobColumns';

const getRowId = (row: GigJobAdminRow) => row.id;
const DIALOG_TITLE = 'gig-interests-dialog-title';

/**
 * Every gig on Duncit, open and closed. Staff close or reopen one (the poster
 * can too) or delete it with its interests — moderation the server logs with
 * who did it.
 */
export default function GigJobsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const confirm = useConfirm();
  const refetchRef = useRef<(() => void) | null>(null);
  const [viewing, setViewing] = useState<GigJobAdminRow | null>(null);
  const [setStatus] = useMutation(ADMIN_SET_GIG_JOB_STATUS);
  const [remove] = useMutation(ADMIN_DELETE_GIG_JOB);
  const fetchRows = useApolloTableFetch<GigJobAdminRow>(client, GIG_JOBS_ADMIN_TABLE, 'gigJobsAdminTable');

  const columns = useMemo(() => {
    const toggle = async (row: GigJobAdminRow) => {
      const open = row.status === 'OPEN';
      if (open) {
        const ok = await confirm({
          title: t('gigJobs.detail.closeConfirmTitle'),
          message: t('gigJobs.detail.closeConfirmBody'),
          confirmLabel: t('gigJobs.detail.close'),
          destructive: true,
        });
        if (!ok) return;
      }
      try {
        await setStatus({ variables: { id: row.id, status: open ? 'CLOSED' : 'OPEN' } });
        notifySuccess(t('gigJobs.detail.statusSaved'));
        refetchRef.current?.();
      } catch (err) {
        notifyError(parseApiError(err, t('gigJobs.detail.statusFailed')));
      }
    };
    const destroy = async (row: GigJobAdminRow) => {
      const ok = await confirm({
        title: t('gigJobs.console.deleteTitle'),
        message: t('gigJobs.console.deleteBody', { vars: { title: row.title } }),
        confirmLabel: t('gigJobs.console.delete'),
        destructive: true,
      });
      if (!ok) return;
      try {
        await remove({ variables: { id: row.id } });
        notifySuccess(t('gigJobs.console.deleted'));
        refetchRef.current?.();
      } catch (err) {
        notifyError(parseApiError(err, t('gigJobs.console.deleteFailed')));
      }
    };
    return buildGigJobColumns(t, { onInterests: setViewing, onToggleStatus: toggle, onDelete: destroy });
  }, [t, confirm, setStatus, remove]);

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h5" component="h1">
          {t('gigJobs.board.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('gigJobs.console.gigsSubtitle')}
        </Typography>
      </Stack>
      <DuncitTable<GigJobAdminRow>
        tableId="gig-jobs-admin"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        emptyText={t('gigJobs.board.empty')}
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        searchPlaceholder={t('gigJobs.board.search')}
        refetchRef={refetchRef}
      />
      <Dialog open={viewing !== null} onClose={() => setViewing(null)} fullWidth maxWidth="lg" aria-labelledby={DIALOG_TITLE}>
        <DialogTitle id={DIALOG_TITLE}>{viewing?.title}</DialogTitle>
        <DialogContent dividers>{viewing ? <InterestsTable jobId={viewing.id} /> : null}</DialogContent>
      </Dialog>
    </Stack>
  );
}
