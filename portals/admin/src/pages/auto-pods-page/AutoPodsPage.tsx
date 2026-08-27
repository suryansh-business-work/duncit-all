import { useCallback, useMemo, useRef } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Box, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AutoModeIcon from '@mui/icons-material/AutoMode';
import { DuncitButton } from '@duncit/buttons';
import { useApolloTableFetch } from '@duncit/table';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { parseApiError, shellAutoPodLabels } from '@duncit/utils';
import { AUTO_PODS_PATH } from '../../config/app-config';
import AutoPodsTable from './AutoPodsTable';
import CancelReasonField from './CancelReasonField';
import {
  ADMIN_AUTO_PODS_TABLE,
  CANCEL_AUTO_POD,
  DELETE_AUTO_POD,
  type AutoPodTableRow,
} from './queries';

/**
 * Admin > Auto Pods — where the three enrolments are watched. No venue, host or
 * club is chosen here: the first of each to enrol takes it, in any order, and
 * the row's tick strip is how far along that is. Writing an offer happens on
 * the full-page editor at `/auto-pods/new` and `/auto-pods/:id/edit`.
 */
export default function AutoPodsPage() {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const cancelReasonRef = useRef('');

  const labels = useMemo(() => shellAutoPodLabels(t), [t]);
  const [cancelMutation] = useMutation(CANCEL_AUTO_POD);
  const [deleteMutation] = useMutation(DELETE_AUTO_POD);

  const setCancelReason = useCallback((value: string) => {
    cancelReasonRef.current = value;
  }, []);

  const refetch = useCallback(() => refetchRef.current?.(), []);

  const fetchRows = useApolloTableFetch<AutoPodTableRow>(
    client,
    ADMIN_AUTO_PODS_TABLE,
    'adminAutoPodsTable'
  );

  const handleCancel = useCallback(
    async (row: AutoPodTableRow) => {
      cancelReasonRef.current = '';
      const ok = await confirm({
        title: t('admin.autoPods.cancelTitle'),
        message: (
          <CancelReasonField
            message={t('admin.autoPods.cancelMessage')}
            label={t('admin.autoPods.cancelReason')}
            onReasonChange={setCancelReason}
          />
        ),
        destructive: true,
        confirmLabel: t('admin.autoPods.cancel'),
        cancelLabel: labels.dismiss,
      });
      if (!ok) return;
      const reason = cancelReasonRef.current.trim() || null;
      try {
        await cancelMutation({ variables: { auto_pod_doc_id: row.id, reason } });
        notifySuccess(t('admin.autoPods.cancelled'));
        refetch();
      } catch (error_) {
        notifyError(parseApiError(error_));
      }
    },
    [cancelMutation, confirm, labels.dismiss, refetch, setCancelReason, t]
  );

  const handleDelete = useCallback(
    async (row: AutoPodTableRow) => {
      const ok = await confirm({
        title: t('admin.autoPods.deleteTitle'),
        message: t('admin.autoPods.deleteMessage'),
        destructive: true,
        confirmLabel: t('admin.autoPods.delete'),
        cancelLabel: labels.dismiss,
      });
      if (!ok) return;
      try {
        await deleteMutation({ variables: { auto_pod_doc_id: row.id } });
        notifySuccess(t('admin.autoPods.deleted'));
        refetch();
      } catch (error_) {
        notifyError(parseApiError(error_));
      }
    },
    [confirm, deleteMutation, labels.dismiss, refetch, t]
  );

  const handleEdit = useCallback(
    (row: AutoPodTableRow) => navigate(`${AUTO_PODS_PATH}/${row.id}/edit`),
    [navigate]
  );

  const handleViewPod = useCallback(
    (row: AutoPodTableRow) => {
      if (row.pod_id) navigate(`/pods/${row.pod_id}`);
    },
    [navigate]
  );

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <AutoModeIcon color="primary" />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {t('admin.autoPods.title')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('admin.autoPods.subtitle')}
          </Typography>
        </Box>
      </Stack>

      <AutoPodsTable
        t={t}
        labels={labels}
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        formatDateTime={formatDateTime}
        toolbarActions={
          <DuncitButton
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate(`${AUTO_PODS_PATH}/new`)}
          >
            {t('admin.autoPods.newCta')}
          </DuncitButton>
        }
        onEdit={handleEdit}
        onCancel={handleCancel}
        onDelete={handleDelete}
        onViewPod={handleViewPod}
      />
    </Stack>
  );
}
