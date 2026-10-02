import { PodLinkRow } from '@/components/host-manage/PodLinkRow';
import { STAR_COLOR } from '@/components/support/AspectRatingRow';
import { useTranslation } from '@/hooks/useTranslation';

interface PodLinkRowsProps {
  primary: string;
  onOpenPodMedia: () => void;
  onSharePodMedia: () => void;
  onCopyPodMedia: () => void;
  onOpenFeedback: () => void;
  onShareFeedback: () => void;
  onCopyFeedback: () => void;
}

/** The pod's two links, one row each: tapping it opens the page, and the two
 * icons beside it hand THE SAME link to the people who came — Share and Copy
 * resolve one address per pod, never two. */
export function PodLinkRows({
  primary,
  onOpenPodMedia,
  onSharePodMedia,
  onCopyPodMedia,
  onOpenFeedback,
  onShareFeedback,
  onCopyFeedback,
}: Readonly<PodLinkRowsProps>) {
  const { t } = useTranslation();
  return (
    <>
      <PodLinkRow
        testID="pod-action-media-link"
        icon="photo-camera-back"
        label={t('mweb.podMedia.uploadPodMedia')}
        tint={primary}
        shareLabel={t('mweb.podMedia.shareLink')}
        copyLabel={t('mweb.podMedia.copyLink')}
        shareTestID="pod-action-share-media"
        copyTestID="pod-action-copy-media"
        onOpen={onOpenPodMedia}
        onShare={onSharePodMedia}
        onCopy={onCopyPodMedia}
      />
      <PodLinkRow
        testID="pod-action-feedback-link"
        icon="star-rate"
        label={t('mweb.podFeedback.feedbackLink')}
        tint={STAR_COLOR}
        shareLabel={t('mweb.podFeedback.shareLink')}
        copyLabel={t('mweb.podFeedback.copyLink')}
        shareTestID="pod-action-share-feedback"
        copyTestID="pod-action-copy-feedback"
        onOpen={onOpenFeedback}
        onShare={onShareFeedback}
        onCopy={onCopyFeedback}
      />
    </>
  );
}
