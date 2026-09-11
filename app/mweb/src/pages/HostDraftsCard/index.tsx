import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Stack, Typography } from '@mui/material';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import { splitDraftsByExpiry } from '@duncit/utils';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useDraftRetentionDays } from '../../utils/dateFormat';
import { useTranslation } from '../../i18n/useTranslation';
import HostSectionHeader from '../host-manage-page/HostSectionHeader';
import RowGroup from '../host-manage-page/RowGroup';
import DraftRow from './DraftRow';
import ExpiringDraftsPanel from './ExpiringDraftsPanel';
import { DELETE_POD_DRAFT, MY_POD_DRAFTS, type DraftRowData } from './drafts';

/**
 * Resumable Create Pod drafts for the signed-in host. Drafts the retention
 * sweep deletes within the next 24 hours are lifted out of the list into the
 * warning panel at the top; the rest follow in their normal order.
 */
export default function HostDraftsCard() {
  const { t } = useTranslation();
  const { data, loading, refetch } = useQuery<any>(MY_POD_DRAFTS, { fetchPolicy: 'cache-and-network' });
  const [deleteMut, { loading: deleting }] = useMutation<any>(DELETE_POD_DRAFT);
  const [target, setTarget] = useState<string | null>(null);
  const retentionDays = useDraftRetentionDays();
  const drafts: DraftRowData[] = data?.myPodDrafts ?? [];

  const confirmDelete = async () => {
    if (!target) return;
    await deleteMut({ variables: { draft_id: target } });
    setTarget(null);
    await refetch();
  };

  if (loading && !data) return null;
  if (drafts.length === 0) return null;

  const { expiring, rest } = splitDraftsByExpiry(drafts);

  return (
    <Stack spacing={1.5}>
      <HostSectionHeader title={t('mweb.hostManage.draftPods')} count={drafts.length} />
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
        <ScheduleRoundedIcon sx={{ fontSize: 16, color: 'warning.main', mt: '2px' }} />
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('mweb.hostManage.draftRetentionNote', { vars: { days: retentionDays } })}
        </Typography>
      </Stack>
      {expiring.length > 0 ? (
        <ExpiringDraftsPanel drafts={expiring} onDelete={setTarget} />
      ) : null}
      {expiring.length > 0 && rest.length > 0 ? (
        <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600 }}>
          {t('mweb.hostManage.otherDrafts')}
        </Typography>
      ) : null}
      {rest.length > 0 ? (
        <RowGroup>
          {rest.map((draft) => (
            <DraftRow key={draft.id} draft={draft} expiring={false} onDelete={setTarget} />
          ))}
        </RowGroup>
      ) : null}
      <ConfirmDialog
        open={!!target}
        title={t('mweb.common.deleteDraft')}
        message={t('mweb.common.thisInProgressPodWillBe')}
        confirmLabel={t('mweb.common.delete')}
        destructive
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onClose={() => setTarget(null)}
      />
    </Stack>
  );
}
