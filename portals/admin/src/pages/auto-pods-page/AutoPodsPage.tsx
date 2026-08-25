import { useCallback, useMemo, useRef } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AutoModeIcon from '@mui/icons-material/AutoMode';
import { useApolloTableFetch } from '@duncit/table';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { parseApiError, shellAutoPodLabels } from '@duncit/utils';
import { AutoPodForm } from './auto-pod-form';
import AutoPodsTable from './AutoPodsTable';
import CancelReasonField from './CancelReasonField';
import useAutoPodEditor from './useAutoPodEditor';
import { ADMIN_AUTO_PODS_TABLE, CANCEL_AUTO_POD, type AutoPodTableRow } from './queries';

/**
 * Admin > Auto Pods — where an Auto Pod is written and its three enrolments are
 * watched. No venue, host or club is chosen here: the first of each to enrol
 * takes it, and the row's tick strip is how far along that is.
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

  const setCancelReason = useCallback((value: string) => {
    cancelReasonRef.current = value;
  }, []);

  const refetch = useCallback(() => refetchRef.current?.(), []);
  const editor = useAutoPodEditor({ t, onSaved: refetch });

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

  const handleViewPod = useCallback(
    (row: AutoPodTableRow) => {
      if (row.pod_id) navigate(`/pods/${row.pod_id}`);
    },
    [navigate]
  );

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1.5} sx={{
        alignItems: "center"
      }}>
        <AutoModeIcon color="primary" />
        <Box>
          <Typography variant="h5" sx={{
            fontWeight: 700
          }}>
            {t('admin.autoPods.title')}
          </Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
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
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={editor.openCreate}
          >
            {t('admin.autoPods.newCta')}
          </Button>
        }
        onEdit={editor.openEdit}
        onCancel={handleCancel}
        onViewPod={handleViewPod}
      />

      <AutoPodForm
        open={editor.open}
        initialValues={editor.initialValues}
        saving={editor.saving}
        error={editor.error}
        t={t}
        dismissLabel={labels.dismiss}
        onClose={editor.close}
        onSubmit={editor.submit}
      />
    </Stack>
  );
}
