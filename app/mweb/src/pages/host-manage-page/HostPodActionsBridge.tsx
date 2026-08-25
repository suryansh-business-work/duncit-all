import { useCallback, useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildSlotLabels } from '@duncit/slots';
import { mwebPodMediaLabels, podFeedbackPath, podMediaPath } from '@duncit/utils';
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
  const podMediaLabels = useMemo(() => mwebPodMediaLabels(t), [t]);

  const renderMediaField = useCallback(
    ({ value, onChange, error, label, folder, deviceOnly }: Readonly<MediaFieldRenderProps>) => (
      <MediaUrlsField
        value={value}
        onChange={onChange}
        error={error}
        label={label}
        folder={folder}
        deviceOnly={deviceOnly}
      />
    ),
    [],
  );

  const onViewProfile = useCallback((path: string) => navigate(path), [navigate]);
  // Every per-pod link a host sends goes out as a tracked short link, like the
  // rest of mWeb's shares — and Share and Copy both resolve THIS one, so a pod
  // has one media address rather than two.
  const resolvePodShareUrl = useCallback(
    (kind: 'POD_FEEDBACK' | 'POD_MEDIA', podId: string, plainUrl: string) =>
      shareUrl(kind, podId, plainUrl),
    [],
  );
  const onOpenFeedback = useCallback(
    (podId: string) => navigate(podFeedbackPath(podId)),
    [navigate],
  );
  const onOpenPodMedia = useCallback((podId: string) => navigate(podMediaPath(podId)), [navigate]);

  return (
    <HostPodActionsProvider
      labels={labels}
      slotLabels={slotLabels}
      podMediaLabels={podMediaLabels}
      renderMediaField={renderMediaField}
      onViewProfile={onViewProfile}
      // Built from THIS origin, so a link opened on a local build stays local
      // instead of pointing at production.
      linkBaseUrl={globalThis.window.location.origin}
      onOpenFeedback={onOpenFeedback}
      onOpenPodMedia={onOpenPodMedia}
      resolveShareUrl={resolvePodShareUrl}
      notifySuccess={notifySuccess}
      notifyError={notifyError}
    >
      {children}
    </HostPodActionsProvider>
  );
}
