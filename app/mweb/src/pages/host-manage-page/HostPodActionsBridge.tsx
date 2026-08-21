import { useCallback, useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildSlotLabels } from '@duncit/slots';
import { podFeedbackPath } from '@duncit/utils';
import {
  HostPodActionsProvider,
  mwebHostPodLabels,
  type MediaFieldRenderProps,
} from '@duncit/host-pod-actions';
import MediaUrlsField from '../create-pod-page/create-pod/fields/MediaUrlsField';
import { notifyError, notifySuccess } from '../../components/notify';
import { shareUrl } from '../../lib/share-link';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * mWeb's half of `@duncit/host-pod-actions`.
 *
 * The dialogs are shared with the Partners console; what is NOT shared is the
 * media picker (mWeb's is Pexels-backed), where a profile link goes, and which
 * origin the rating link is built against. Those are supplied here, once, for
 * every dialog under it.
 */
export default function HostPodActionsBridge({ children }: Readonly<{ children: ReactNode }>) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const labels = useMemo(() => mwebHostPodLabels(t), [t]);
  const slotLabels = useMemo(() => buildSlotLabels(t, 'mweb.slots'), [t]);

  const renderMediaField = useCallback(
    ({ value, onChange, error, label, folder }: Readonly<MediaFieldRenderProps>) => (
      <MediaUrlsField
        value={value}
        onChange={onChange}
        error={error}
        label={label}
        folder={folder}
      />
    ),
    [],
  );

  const onViewProfile = useCallback((path: string) => navigate(path), [navigate]);
  // Every rating link a host sends goes out as a tracked short link, like the
  // rest of mWeb's shares.
  const resolveFeedbackShareUrl = useCallback(
    (podId: string, plainUrl: string) => shareUrl('POD_FEEDBACK', podId, plainUrl),
    [],
  );
  const onOpenFeedback = useCallback(
    (podId: string) => navigate(podFeedbackPath(podId)),
    [navigate],
  );

  return (
    <HostPodActionsProvider
      labels={labels}
      slotLabels={slotLabels}
      renderMediaField={renderMediaField}
      onViewProfile={onViewProfile}
      // Built from THIS origin, so a link opened on a local build stays local
      // instead of pointing at production.
      feedbackBaseUrl={globalThis.window.location.origin}
      onOpenFeedback={onOpenFeedback}
      resolveShareUrl={resolveFeedbackShareUrl}
      notifySuccess={notifySuccess}
      notifyError={notifyError}
    >
      {children}
    </HostPodActionsProvider>
  );
}
