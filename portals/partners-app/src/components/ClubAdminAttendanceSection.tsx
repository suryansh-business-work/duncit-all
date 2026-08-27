import { useCallback, useMemo } from 'react';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { shellAttendanceLabels } from '@duncit/utils';
import { PodAttendanceView, useHostPodActionsConfig } from '@duncit/host-pod-actions';
import { SectionCard } from '@duncit/pod-details';
import HostPodActionsBridge from './HostPodActionsBridge';

/** Inside the bridge, so the board reports through the same toast its dialogs do. */
function AttendanceBoard({ podId }: Readonly<{ podId: string }>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const { notifySuccess, notifyError } = useHostPodActionsConfig();
  const labels = useMemo(() => shellAttendanceLabels(t), [t]);
  const formatDateTime = useCallback((iso: string) => fmt.formatDateTime(iso), [fmt]);

  return (
    <SectionCard icon={<FactCheckIcon fontSize="small" />} title={labels.pageTitle}>
      <PodAttendanceView
        podId={podId}
        labels={labels}
        formatDateTime={formatDateTime}
        notifySuccess={notifySuccess}
        notifyError={notifyError}
      />
    </SectionCard>
  );
}

/**
 * A Club Admin's Mark Attendance board for one pod.
 *
 * The same board the host reads in mWeb and the native app, rendered by the
 * same component (rule 40) — what differs is what the server lets this viewer
 * do with it: a Club Admin marks without a scan and without a one-time code,
 * because this path exists precisely for the attendee who cannot produce
 * either. That is also why every mark here goes through a warning first.
 *
 * The bridge is not optional. `podAttendanceBoard` answers `viewer: HOST` when
 * the caller hosts the pod — a club admin hosting one of their own club's pods
 * is the ordinary case — and the host's board carries the door scanner, whose
 * dialog reads the host-actions config. Without it the roster threw the moment
 * the board answered.
 *
 * Two surfaces render this, which is why it lives here rather than beside
 * either of them: the pod details page's `footer` slot, and the Pod Attendance
 * page the club pods table opens. It stays out of `@duncit/pod-details` so that
 * package does not have to take a dependency on the host-actions one for a
 * section only this portal renders.
 */
export default function ClubAdminAttendanceSection({ podId }: Readonly<{ podId: string }>) {
  return (
    <HostPodActionsBridge>
      <AttendanceBoard podId={podId} />
    </HostPodActionsBridge>
  );
}
