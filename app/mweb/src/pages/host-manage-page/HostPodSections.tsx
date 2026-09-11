import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Stack } from '@mui/material';
import { changeRequestMenuKey, splitHostPods } from '@duncit/utils';
import { useHostPodActions } from '@duncit/host-pod-actions';
import { useRequestPodChange } from '@duncit/pod-change-requests';
import { notifySuccess } from '../../components/notify';
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
  // One instance for all three sections, exactly like the actions above: a pod
  // keeps the same menu wherever it currently sits, and one dialog is mounted.
  const change = useRequestPodChange({ onFiled: notifySuccess });
  const [clubAdminPod, setClubAdminPod] = useState<PodClubAdminTarget | null>(null);

  // A failed read means the split is unknown, so the request sections stay away
  // rather than claiming "No Requested Pods". Your Pods reports the error.
  const { requested, yours, rejected } = splitHostPods(errorMessage ? [] : pods);

  const rowProps = (pod: any): HostPodRowActions => ({
    actions: menuHandlers(pod),
    onClubAdmin: () => setClubAdminPod(pod),
    onSeeAttendance: () => navigate(`/host/pod/${pod.id}/attendance`),
    onSlotRequest: () => navigate(`/host/pod-pending/${pod.id}`),
    onRequestChange: () =>
      change.open({
        podDocId: pod.id,
        role: 'HOST',
        attendeeCount: pod.seats_taken ?? pod.pod_attendees?.length ?? 0,
      }),
    requestChangeLabel: t(changeRequestMenuKey('HOST')),
  });

  return (
    <Stack spacing={3}>
      {!errorMessage && (
        <VenueRequestsCard
          title={t('mweb.hostManage.requestedPods')}
          emptyText={t('mweb.hostManage.requestedPodsEmpty')}
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
        title={t('mweb.hostManage.rejectedPods')}
        emptyText={null}
        pods={rejected}
        loading={loading}
        rowProps={rowProps}
      />

      <PodClubAdminDialog pod={clubAdminPod} onClose={() => setClubAdminPod(null)} />
      {dialogs}
      {change.dialog}
    </Stack>
  );
}
