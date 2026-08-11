import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Alert, Snackbar } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { buildSlotLabels } from '@duncit/slots';
import { MediaListField } from '@duncit/media-picker';
import { podFeedbackPath } from '@duncit/utils';
import {
  HostPodActionsProvider,
  shellHostPodLabels,
  type MediaFieldRenderProps,
} from '@duncit/host-pod-actions';
import { urlConfigs } from '../../config/url-configs';

interface Toast {
  message: string;
  severity: 'success' | 'error';
}

/**
 * The Partners console's half of `@duncit/host-pod-actions`.
 *
 * The dialogs are shared with mWeb; what differs here is the media field (the
 * portal's ImageKit list field), and where the rating link points — this portal
 * has no rating page of its own, so both the link and the "open" action go to
 * mWeb, which is where a guest fills the form in.
 */
export default function HostPodActionsBridge({ children }: Readonly<{ children: ReactNode }>) {
  const { t } = useTranslation();
  const [toast, setToast] = useState<Toast | null>(null);
  const labels = useMemo(() => shellHostPodLabels(t), [t]);
  const slotLabels = useMemo(() => buildSlotLabels(t, 'shell.slots'), [t]);

  const renderMediaField = useCallback(
    ({ value, onChange, error, label, folder }: Readonly<MediaFieldRenderProps>) => (
      <MediaListField
        label={label}
        value={value}
        onChange={onChange}
        folder={folder}
        helperText={error}
      />
    ),
    [],
  );

  const openExternally = useCallback((path: string) => {
    globalThis.open(`${urlConfigs.mwebUrl}${path}`, '_blank', 'noopener,noreferrer');
  }, []);

  const notifySuccess = useCallback(
    (message: string) => setToast({ message, severity: 'success' }),
    [],
  );
  const notifyError = useCallback((message: string) => setToast({ message, severity: 'error' }), []);

  return (
    <HostPodActionsProvider
      labels={labels}
      slotLabels={slotLabels}
      renderMediaField={renderMediaField}
      onViewProfile={openExternally}
      feedbackBaseUrl={urlConfigs.mwebUrl}
      onOpenFeedback={(podId) => openExternally(podFeedbackPath(podId))}
      notifySuccess={notifySuccess}
      notifyError={notifyError}
    >
      {children}
      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast?.severity ?? 'success'} variant="filled" onClose={() => setToast(null)}>
          {toast?.message}
        </Alert>
      </Snackbar>
    </HostPodActionsProvider>
  );
}
