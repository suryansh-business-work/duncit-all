import { XStack } from 'tamagui';

import { ActionRow, RowIconButton } from '@/components/host-manage/ActionRow';
import { STAR_COLOR } from '@/components/support/AspectRatingRow';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  onOpen: () => void;
  onShare: () => void;
  onCopy: () => void;
}

/**
 * The pod's rating link, as one sheet line with three ways to use it: tap the
 * row to open the form yourself, or take the link with the two buttons beside
 * it — most hosts want to send it, not fill it in.
 *
 * The Tamagui twin of mWeb's FeedbackLinkItem (rule 27).
 */
export function FeedbackLinkRow({ onOpen, onShare, onCopy }: Readonly<Props>) {
  const { t } = useTranslation();
  const { color: ink } = useThemeColors();

  return (
    <ActionRow
      testID="pod-action-feedback-link"
      icon="star-rate"
      label={t('mweb.podFeedback.feedbackLink')}
      tint={STAR_COLOR}
      onPress={onOpen}
      trailing={
        <XStack alignItems="center">
          <RowIconButton
            testID="pod-action-share-feedback"
            icon="ios-share"
            label={t('mweb.podFeedback.shareLink')}
            tint={ink}
            onPress={onShare}
          />
          <RowIconButton
            testID="pod-action-copy-feedback"
            icon="content-copy"
            label={t('mweb.podFeedback.copyLink')}
            tint={ink}
            onPress={onCopy}
          />
        </XStack>
      }
    />
  );
}
