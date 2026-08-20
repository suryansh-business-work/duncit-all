import { useCallback, useMemo, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { shellAttendanceLabels } from '@duncit/utils';
import { PodAttendanceView } from '@duncit/host-pod-actions';
import { SectionCard } from '@duncit/pod-details';

interface Toast {
  message: string;
  severity: 'success' | 'error';
}

/**
 * Club Admin > Clubs > Pods > Pod details > Mark Attendance.
 *
 * The same board the host reads in mWeb and the native app, rendered by the
 * same component (rule 40) — what differs is what the server lets this viewer
 * do with it: a Club Admin marks without a scan and without a one-time code,
 * because this path exists precisely for the attendee who cannot produce
 * either. That is also why every mark here goes through a warning first.
 *
 * It sits in the page's `footer` slot rather than inside `@duncit/pod-details`
 * so that package does not have to take a dependency on the host-actions one
 * for a section only this portal renders.
 */
export default function ClubAdminAttendanceSection({ podId }: Readonly<{ podId: string }>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const [toast, setToast] = useState<Toast | null>(null);
  const labels = useMemo(() => shellAttendanceLabels(t), [t]);

  const notifySuccess = useCallback(
    (message: string) => setToast({ message, severity: 'success' }),
    [],
  );
  const notifyError = useCallback((message: string) => setToast({ message, severity: 'error' }), []);
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
      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={toast?.severity ?? 'success'}
          variant="filled"
          onClose={() => setToast(null)}
        >
          {toast?.message}
        </Alert>
      </Snackbar>
    </SectionCard>
  );
}
