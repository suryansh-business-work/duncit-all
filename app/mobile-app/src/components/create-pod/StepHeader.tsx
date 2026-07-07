import { useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';

import { STEP_SUBTITLES, STEP_TITLES } from './create-pod.form';
import { AiMonitorChip } from './AiMonitorChip';
import { PodGuidelinesDialog } from './PodGuidelinesDialog';

interface Props {
  step: number;
}

/** The stepper header: progress bar, step counter, the "AI monitoring" chip
 * (opens the guidelines dialog) and the step title/subtitle. */
export function StepHeader({ step }: Readonly<Props>) {
  const [guideOpen, setGuideOpen] = useState(false);
  return (
    <YStack gap={6}>
      <XStack height={6} borderRadius={999} backgroundColor="$borderColor" overflow="hidden">
        <YStack
          testID="create-pod-progress"
          height="100%"
          backgroundColor="$primary"
          width={`${((step + 1) / STEP_TITLES.length) * 100}%`}
        />
      </XStack>
      <XStack alignItems="center" justifyContent="space-between" gap={8}>
        <Text fontSize={12} fontWeight="900" color="$primary" letterSpacing={1}>
          Step {step + 1} of {STEP_TITLES.length}
        </Text>
        <AiMonitorChip onPress={() => setGuideOpen(true)} />
      </XStack>
      <Text fontSize={20} fontWeight="900" color="$color">
        {STEP_TITLES[step]}
      </Text>
      <Text fontSize={13} color="$muted">
        {STEP_SUBTITLES[step]}
      </Text>
      <PodGuidelinesDialog open={guideOpen} onClose={() => setGuideOpen(false)} />
    </YStack>
  );
}
