import { useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import { STEP_TITLE_KEYS, stepTitleKey } from './create-pod.form';
import { AiMonitorChip } from './AiMonitorChip';
import { PodGuidelinesDialog } from './PodGuidelinesDialog';

interface Props {
  step: number;
  /** Step 3 is "Meeting Time & Medium" for a virtual pod, not "Venue & Slot". */
  podMode?: string | null;
}

/** The stepper header: one slim pill per step (done/current in green), the step
 * title and the "AI monitoring" chip (opens the guidelines dialog). The step
 * counter is the progress bar's accessible name rather than a caption. */
export function StepHeader({ step, podMode }: Readonly<Props>) {
  const [guideOpen, setGuideOpen] = useState(false);
  const { t } = useTranslation();
  const total = STEP_TITLE_KEYS.length;
  const titleKey = stepTitleKey(step, podMode);
  return (
    <YStack gap={14}>
      <XStack
        testID="create-pod-progress"
        role="progressbar"
        aria-label={t('mweb.createPod.stepCounter', { vars: { step: step + 1, total } })}
        gap={6}
      >
        {STEP_TITLE_KEYS.map((key, index) => (
          <YStack
            key={key}
            flex={1}
            height={5}
            borderRadius={999}
            backgroundColor={index <= step ? '$primary' : '$soft'}
          />
        ))}
      </XStack>
      <XStack alignItems="center" justifyContent="space-between" gap={8}>
        <Text flex={1} fontSize={20} fontWeight="600" color="$color">
          {titleKey ? t(titleKey) : ''}
        </Text>
        <AiMonitorChip onPress={() => setGuideOpen(true)} />
      </XStack>
      <PodGuidelinesDialog open={guideOpen} onClose={() => setGuideOpen(false)} />
    </YStack>
  );
}
