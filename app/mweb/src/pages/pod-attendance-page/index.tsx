import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { IconButton, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { mwebAttendanceLabels } from '@duncit/utils';
import { PodAttendanceView } from '@duncit/host-pod-actions';
import HostPodActionsBridge from '../host-manage-page/HostPodActionsBridge';
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
  const navigate = useNavigate();
  const { formatDateTime } = useDateFormat();
  const labels = useMemo(() => mwebAttendanceLabels(t), [t]);

  return (
    <Stack spacing={2} sx={{ p: 1.5, pb: 4 }}>
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <IconButton aria-label={labels.back} onClick={() => navigate(-1)} size="small">
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          {labels.pageTitle}
        </Typography>
      </Stack>

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
