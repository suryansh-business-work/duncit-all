import { TextArea, YStack } from 'tamagui';
import {
  POD_FEEDBACK_ASPECT_KEY,
  type PodFeedbackAspect,
  type PodFeedbackScores,
} from '@duncit/utils';

import { Field } from '@/components/Field';
import { AspectRatingRow } from '@/components/support/AspectRatingRow';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  aspects: readonly PodFeedbackAspect[];
  scores: PodFeedbackScores;
  onScore: (aspect: PodFeedbackAspect, value: number) => void;
  message: string;
  onMessage: (value: string) => void;
}

/**
 * The questions themselves — one row per part of the pod, plus the comment box.
 *
 * Shared by the pop-up that appears after a pod and the screen behind the link
 * a host shares, and the RN twin of mWeb's PodFeedbackFields (rule 27): a guest
 * who answers on one surface and edits on the other sees the same form.
 */
export function PodFeedbackFields({
  aspects,
  scores,
  onScore,
  message,
  onMessage,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <YStack gap={12}>
      <YStack gap={2}>
        {aspects.map((aspect) => {
          const label = t(POD_FEEDBACK_ASPECT_KEY[aspect]);
          return (
            <AspectRatingRow
              key={aspect}
              aspect={aspect}
              label={label}
              value={scores[aspect] ?? 0}
              onChange={(value) => onScore(aspect, value)}
              starLabel={(stars) =>
                t('mweb.podFeedback.rateAspect', { vars: { aspect: label, stars } })
              }
            />
          );
        })}
      </YStack>

      <Field label={t('mweb.podFeedback.comments')}>
        <TextArea
          testID="pod-feedback-comment"
          aria-label={t('mweb.podFeedback.comments')}
          value={message}
          onChangeText={onMessage}
          placeholder={t('mweb.podFeedback.commentsPlaceholder')}
          placeholderTextColor="$muted"
          maxLength={1000}
          backgroundColor="$surface"
          borderColor="$borderColor"
        />
      </Field>
    </YStack>
  );
}
