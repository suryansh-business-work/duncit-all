import { useCallback, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client';
import { Box, Stack, Typography } from '@mui/material';
import { useApolloTableFetch } from '@duncit/table';
import { ConfirmDialog } from '@duncit/dialogs';
import HardDeleteDialog from '../../components/HardDeleteDialog';
import { useEntityLifecycle } from '../../components/useEntityLifecycle';
import { DELETE_HOST, HOSTS_TABLE, SET_HOST_ACTIVE, type HostRow } from './queries';
import { useHostReview } from './useHostReview';
import HostEditDialog from './HostEditDialog';
import HostReviewDialog from './HostReviewDialog';
import HostsTable from './HostsTable';
import { useTranslation } from '@duncit/app-settings';

export default function HostsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const refresh = useCallback(() => refetchRef.current?.(), []);
  const lifecycle = useEntityLifecycle(SET_HOST_ACTIVE, DELETE_HOST, refresh);
  const review = useHostReview(refresh);
  const [editing, setEditing] = useState<any>(null);

  const fetchRows = useApolloTableFetch<HostRow>(client, HOSTS_TABLE, 'hostsTable');

  return (
    <Box>
      <Stack spacing={0.25} sx={{
        mb: 2
      }}>
        <Typography variant="h5" sx={{
          fontWeight: 700
        }}>{t('onboarding.common.hosts')}</Typography>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          Review submitted host requests and manage approved hosts for Duncit communities.
        </Typography>
      </Stack>

      <HostsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        onEdit={setEditing}
        onReview={review.openReview}
        canHardDelete={lifecycle.canHardDelete}
        onToggleActive={lifecycle.setToggleTarget}
        onDelete={lifecycle.setDeleteTarget}
      />

      <ConfirmDialog
        open={!!lifecycle.toggleTarget}
        title={lifecycle.toggleTarget?.is_active === false ? 'Activate host' : 'Deactivate host'}
        message={
          lifecycle.toggleTarget?.is_active === false
            ? 'This host will be able to create and host pods again.'
            : 'This host will be unable to create pods and will be hidden from public discovery. You can reactivate them anytime.'
        }
        confirmLabel={lifecycle.toggleTarget?.is_active === false ? 'Activate' : 'Deactivate'}
        confirmColor={lifecycle.toggleTarget?.is_active === false ? 'success' : 'warning'}
        loading={lifecycle.toggling}
        busyLabel="Working…"
        onClose={() => lifecycle.setToggleTarget(null)}
        onConfirm={lifecycle.confirmToggle}
      />

      <HardDeleteDialog
        open={!!lifecycle.deleteTarget}
        entityLabel="host"
        entityName={lifecycle.deleteTarget?.full_name ?? ''}
        loading={lifecycle.deleting}
        error={lifecycle.deleteError}
        onClose={lifecycle.closeDelete}
        onConfirm={lifecycle.confirmDelete}
      />

      <HostReviewDialog
        active={review.active}
        notes={review.notes}
        setNotes={review.setNotes}
        tagsText={review.tagsText}
        setTagsText={review.setTagsText}
        saveError={review.saveError}
        dismissError={review.dismissError}
        defaultCommissionPct={review.defaultCommissionPct}
        surveyCategory={review.surveyCategory}
        onClose={review.closeReview}
        onApprove={review.doApprove}
        onReject={review.doReject}
        onSaveCommission={review.saveCommission}
        onSaveCategories={review.saveCategories}
        savingCategories={review.savingCategories}
        savingCommission={review.savingCommission}
        deciding={review.deciding}
      />

      <HostEditDialog host={editing} onClose={() => setEditing(null)} onSaved={refresh} />
    </Box>
  );
}
