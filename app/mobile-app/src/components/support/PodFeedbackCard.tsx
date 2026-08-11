import { Text, XStack, YStack } from 'tamagui';
import {
  canSubmitPodFeedback,
  type PodFeedbackAspect,
  type PodFeedbackScores,
} from '@duncit/utils';

import { PodFeedbackFields } from '@/components/support/PodFeedbackFields';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  podTitle: string;
  /** True once this guest has rated the pod — the form opens on their answers. */
  rated: boolean;
  aspects: readonly PodFeedbackAspect[];
  scores: PodFeedbackScores;
  onScore: (aspect: PodFeedbackAspect, value: number) => void;
  message: string;
  onMessage: (value: string) => void;
  saving: boolean;
  failed: boolean;
  saved: boolean;
  onSubmit: () => void;
  onLeave: () => void;
}

/** The rating form as a screen — the Tamagui twin of mWeb's PodFeedbackCard
 * (rule 27), for a guest who arrived on the link their host shared. */
export function PodFeedbackCard({
  podTitle,
  rated,
  aspects,
  scores,
  onScore,
  message,
  onMessage,
  saving,
  failed,
  saved,
  onSubmit,
  onLeave,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const ready = canSubmitPodFeedback(scores) && !saving;
  const submitLabel = rated ? t('mweb.podFeedback.update') : t('mweb.podFeedback.submit');
  const busyLabel = rated ? t('mweb.podFeedback.updating') : t('mweb.podFeedback.submitting');
  const leaveLabel = saved ? t('mweb.podFeedback.done') : t('mweb.podFeedback.skip');

  return (
    <YStack gap={12} padding={16} borderRadius={16} backgroundColor="$background">
      <Text fontSize={16} fontWeight="700" color="$color">
        {t('mweb.podFeedback.title', { vars: { title: podTitle } })}
      </Text>
      <Text fontSize={12} color="$muted">
        {t('mweb.podFeedback.subtitle')}
      </Text>
      {rated ? (
        <Text testID="pod-feedback-already-rated" fontSize={12} color="$primary">
          {t('mweb.podFeedback.alreadyRated')}
        </Text>
      ) : null}

      <PodFeedbackFields
        aspects={aspects}
        scores={scores}
        onScore={onScore}
        message={message}
        onMessage={onMessage}
      />

      {failed ? (
        <Text testID="pod-feedback-error" fontSize={12} color="$danger">
          {t('mweb.podFeedback.failed')}
        </Text>
      ) : null}
      {saved ? (
        <Text testID="pod-feedback-saved" fontSize={12} color="$success">
          {t('mweb.podFeedback.saved')}
        </Text>
      ) : null}

      <XStack gap={8} justifyContent="flex-end">
        <XStack
          testID="pod-feedback-skip"
          role="button"
          aria-label={leaveLabel}
          onPress={onLeave}
          height={42}
          paddingHorizontal={18}
          alignItems="center"
          justifyContent="center"
          borderRadius={999}
          borderWidth={1}
          borderColor="$borderColor"
        >
          <Text fontSize={14} fontWeight="600" color="$color">
            {leaveLabel}
          </Text>
        </XStack>
        <XStack
          testID="pod-feedback-submit"
          role="button"
          aria-label={submitLabel}
          aria-disabled={!ready}
          onPress={ready ? onSubmit : undefined}
          height={42}
          paddingHorizontal={18}
          alignItems="center"
          justifyContent="center"
          borderRadius={999}
          backgroundColor="$primary"
          opacity={ready ? 1 : 0.5}
        >
          <Text fontSize={14} fontWeight="600" color="$onPrimary">
            {saving ? busyLabel : submitLabel}
          </Text>
        </XStack>
      </XStack>
    </YStack>
  );
}
