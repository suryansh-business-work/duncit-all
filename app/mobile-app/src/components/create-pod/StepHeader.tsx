import { useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import { STEP_TITLE_KEYS, stepSubtitleKey, stepTitleKey } from './create-pod.form';
import { AiMonitorChip } from './AiMonitorChip';
import { PodGuidelinesDialog } from './PodGuidelinesDialog';

interface Props {
  step: number;
  /** Step 3 is "Meeting Time & Medium" for a virtual pod, not "Venue & Slot". */
  podMode?: string | null;
}

/** The stepper header: progress bar, step counter, the "AI monitoring" chip
 * (opens the guidelines dialog) and the step title/subtitle. */
export function StepHeader({ step, podMode }: Readonly<Props>) {
  const [guideOpen, setGuideOpen] = useState(false);
  const { t } = useTranslation();
  const total = STEP_TITLE_KEYS.length;
  const titleKey = stepTitleKey(step, podMode);
  const subtitleKey = stepSubtitleKey(step, podMode);
  return (
    <YStack gap={6}>
      <XStack height={6} borderRadius={999} backgroundColor="$borderColor" overflow="hidden">
        <YStack
          testID="create-pod-progress"
          height="100%"
          backgroundColor="$primary"
          width={`${((step + 1) / total) * 100}%`}
        />
      </XStack>
      <XStack alignItems="center" justifyContent="space-between" gap={8}>
        <Text fontSize={12} fontWeight="700" color="$primary" letterSpacing={1}>
          {t('mweb.createPod.stepCounter', { vars: { step: step + 1, total } })}
        </Text>
        <AiMonitorChip onPress={() => setGuideOpen(true)} />
      </XStack>
      <Text fontSize={20} fontWeight="700" color="$color">
        {titleKey ? t(titleKey) : ''}
      </Text>
      <Text fontSize={13} color="$muted">
        {subtitleKey ? t(subtitleKey) : ''}
      </Text>
      <PodGuidelinesDialog open={guideOpen} onClose={() => setGuideOpen(false)} />
    </YStack>
  );
}
