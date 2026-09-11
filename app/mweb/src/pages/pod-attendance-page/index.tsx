import { useMemo } from 'react';
import { useParams } from 'react-router';
import { Stack } from '@mui/material';
import { mwebAttendanceLabels } from '@duncit/utils';
import { PodAttendanceView } from '@duncit/host-pod-actions';
import HostPodActionsBridge from '../host-manage-page/HostPodActionsBridge';
import PageBackHeader from '../pod-pending-page/PageBackHeader';
import { notifyError, notifySuccess } from '../../components/notify';
import { useDateFormat } from '../../utils/dateFormat';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * Host Studio > Your Pods > ⋮ > See Marked Attendance.
 *
 * A page rather than another dialog. Attendance used to be a list inside the
 * Complete-pod dialog's money preview — three levels deep in a form about
 * something else, with no way to link to it and no way back to it. Here it has
 * a URL, Back works, and a reload keeps the host where they were.
 *
 * Everything below the header is `@duncit/host-pod-actions`' shared view, so
 * the Partners console's Club Admin section cannot drift from it (rule 40).
 */
function PodAttendanceBody({ podId }: Readonly<{ podId: string }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const labels = useMemo(() => mwebAttendanceLabels(t), [t]);

  return (
    <Stack spacing={2.5} sx={{ p: 2, pb: 4 }}>
      <PageBackHeader title={labels.pageTitle} backLabel={labels.back} />

      <PodAttendanceView
        podId={podId}
        labels={labels}
        formatDateTime={formatDateTime}
        notifySuccess={notifySuccess}
        notifyError={notifyError}
      />
    </Stack>
  );
}

export default function PodAttendancePage() {
  const { podId = '' } = useParams();
  // The scanner the view opens is the package's own dialog, so it needs the
  // same per-surface config (media picker, profile links, notices) that the
  // Host Studio list supplies.
  return (
    <HostPodActionsBridge>
      <PodAttendanceBody podId={podId} />
    </HostPodActionsBridge>
  );
}
