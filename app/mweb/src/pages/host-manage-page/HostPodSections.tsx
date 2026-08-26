import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stack } from '@mui/material';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import CancelScheduleSendIcon from '@mui/icons-material/CancelScheduleSend';
import { splitHostPods } from '@duncit/utils';
import { useHostPodActions } from '@duncit/host-pod-actions';
import HostPodsCard from './HostPodsCard';
import PodClubAdminDialog, { type PodClubAdminTarget } from './PodClubAdminDialog';
import { VenueRequestsCard } from './venue-requests';
import type { HostPodRowActions } from './hostPodRowActions';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  pods: any[];
  loading: boolean;
  errorMessage?: string;
  /** Fired after anything that alters a pod, so the page refetches the list. */
  onChanged: () => void;
}

/**
 * The three pod sections of Host Studio, in the order the host reads them:
 * Requested Pods (awaiting the venue), Your Pods, then Rejected Pods.
 *
 * The split is derived from `venue_approval_status` on every render, so the
 * venue's decision landing is all it takes to move a pod between them — an
 * approval drops it into Your Pods (whose default filter is Upcoming), a
 * refusal into Rejected Pods, which does not exist until something is refused.
 *
 * One `useHostPodActions` for all three: a pod keeps the same overflow menu
 * wherever it currently sits, and only one set of dialogs is ever mounted.
 */
export default function HostPodSections({
  pods,
  loading,
  errorMessage,
  onChanged,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { menuHandlers, dialogs } = useHostPodActions(onChanged);
  const [clubAdminPod, setClubAdminPod] = useState<PodClubAdminTarget | null>(null);

  // A failed read means the split is unknown, so the request sections stay away
  // rather than claiming "No Requested Pods". Your Pods reports the error.
  const { requested, yours, rejected } = splitHostPods(errorMessage ? [] : pods);

  const rowProps = (pod: any): HostPodRowActions => ({
    actions: menuHandlers(pod),
    onClubAdmin: () => setClubAdminPod(pod),
    onSeeAttendance: () => navigate(`/host/pod/${pod.id}/attendance`),
    onSlotRequest: () => navigate(`/host/pod-pending/${pod.id}`),
  });

  const requestedEmpty = {
    title: t('mweb.hostManage.noRequestedPods'),
    text: t('mweb.hostManage.requestedPodsEmpty'),
  };

  return (
    <Stack spacing={2.25}>
      {!errorMessage && (
        <VenueRequestsCard
          icon={HourglassTopIcon}
          iconColor="warning"
          title={t('mweb.hostManage.requestedPods')}
          subtitle={t('mweb.hostManage.requestedPodsSubtitle')}
          empty={requestedEmpty}
          pods={requested}
          loading={loading}
          rowProps={rowProps}
        />
      )}

      <HostPodsCard
        pods={yours}
        loading={loading}
        errorMessage={errorMessage}
        rowProps={rowProps}
      />

      <VenueRequestsCard
        icon={CancelScheduleSendIcon}
        iconColor="error"
        title={t('mweb.hostManage.rejectedPods')}
        subtitle={t('mweb.hostManage.rejectedPodsSubtitle')}
        empty={null}
        pods={rejected}
        loading={loading}
        rowProps={rowProps}
      />

      <PodClubAdminDialog pod={clubAdminPod} onClose={() => setClubAdminPod(null)} />
      {dialogs}
    </Stack>
  );
}
