import StarRateIcon from '@mui/icons-material/StarRate';
import PhotoCameraBackIcon from '@mui/icons-material/PhotoCameraBack';
import PodLinkMenuItem from '../PodLinkMenuItem';
import { useHostPodActionsConfig } from '../HostPodActionsProvider';
import type { HostPodMenuItemsProps } from './types';

type Props = Pick<
  HostPodMenuItemsProps,
  | 'podId'
  | 'showAttendeeActions'
  | 'pick'
  | 'onOpenPodMedia'
  | 'onSharePodMedia'
  | 'onCopyPodMedia'
  | 'onOpenFeedback'
  | 'onShareFeedback'
  | 'onCopyFeedback'
>;

/** The pod's media link and rating link — the two rows a host shares from. */
export default function PodLinkRows({
  podId,
  showAttendeeActions,
  pick,
  onOpenPodMedia,
  onSharePodMedia,
  onCopyPodMedia,
  onOpenFeedback,
  onShareFeedback,
  onCopyFeedback,
}: Readonly<Props>) {
  const { labels, podMediaLabels } = useHostPodActionsConfig();

  return (
    <>
      {/* The pod's two links, each one row: clicking it opens the page, and
          the two icons beside it hand THE SAME link to the people who came —
          Share and Copy resolve one address per pod, never two. */}
      {showAttendeeActions && onOpenPodMedia && onSharePodMedia && onCopyPodMedia && (
        <PodLinkMenuItem
          icon={<PhotoCameraBackIcon fontSize="small" color="primary" />}
          label={podMediaLabels.pageTitle}
          shareLabel={podMediaLabels.shareLink}
          copyLabel={podMediaLabels.copyLink}
          onOpen={pick(onOpenPodMedia)}
          onShare={pick(onSharePodMedia)}
          onCopy={pick(onCopyPodMedia)}
          testId={`host-pod-action-media-link-${podId}`}
          shareTestId={`host-pod-action-share-media-${podId}`}
          copyTestId={`host-pod-action-copy-media-${podId}`}
        />
      )}
      {showAttendeeActions && (
        <PodLinkMenuItem
          icon={<StarRateIcon fontSize="small" sx={{ color: 'warning.main' }} />}
          label={labels.feedbackLink}
          shareLabel={labels.shareLink}
          copyLabel={labels.copyLink}
          onOpen={pick(onOpenFeedback)}
          onShare={pick(onShareFeedback)}
          onCopy={pick(onCopyFeedback)}
          testId={`host-pod-action-feedback-link-${podId}`}
          shareTestId={`host-pod-action-share-feedback-${podId}`}
          copyTestId={`host-pod-action-copy-feedback-${podId}`}
        />
      )}
    </>
  );
}
