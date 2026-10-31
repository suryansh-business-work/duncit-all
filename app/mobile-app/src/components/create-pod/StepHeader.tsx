import { useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';
import { CREATE_POD_STEP_COUNT } from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';
import { stepSubtitleKey, stepTitleKey } from './create-pod.form';
import { AiMonitorChip } from './AiMonitorChip';
import { PodGuidelinesDialog } from './PodGuidelinesDialog';

interface Props {
  step: number;
  /** Where & when is "Meeting Time & Medium" for a virtual pod. */
  podMode?: string | null;
  /** Money without a venue offer is only the ticket, and its line says so. */
  sendsOffer: boolean;
}

const STEPS = Array.from({ length: CREATE_POD_STEP_COUNT }, (_, index) => index);

/** The stepper header: one slim pill per step (done/current in green), the step
 * title with the "AI monitoring" chip (opens the guidelines dialog), and the
 * line under it. The step counter is the progress bar's accessible name rather
 * than a caption. mWeb twin: StepHero. */
export function StepHeader({ step, podMode, sendsOffer }: Readonly<Props>) {
  const [guideOpen, setGuideOpen] = useState(false);
  const { t } = useTranslation();
  const titleKey = stepTitleKey(step, podMode);
  const subtitleKey = stepSubtitleKey(step, podMode, sendsOffer);
  return (
    <YStack gap={14}>
      <XStack
        testID="create-pod-progress"
        role="progressbar"
        aria-label={t('mweb.createPod.stepCounter', { vars: { step: step + 1, total: CREATE_POD_STEP_COUNT } })}
        gap={6}
      >
        {STEPS.map((index) => (
          <YStack
            key={index}
            flex={1}
            height={5}
            borderRadius={999}
            backgroundColor={index <= step ? '$primary' : '$soft'}
          />
        ))}
      </XStack>
      <YStack gap={4}>
        <XStack alignItems="center" justifyContent="space-between" gap={8}>
          <Text
            testID="create-pod-step-title"
            role="heading"
            flex={1}
            fontSize={20}
            fontWeight="600"
            color="$color"
          >
            {titleKey ? t(titleKey) : ''}
          </Text>
          <AiMonitorChip onPress={() => setGuideOpen(true)} />
        </XStack>
        {subtitleKey ? (
          <Text testID="create-pod-step-subtitle" fontSize={13} color="$muted">
            {t(subtitleKey)}
          </Text>
        ) : null}
      </YStack>
      <PodGuidelinesDialog open={guideOpen} onClose={() => setGuideOpen(false)} />
    </YStack>
  );
}
