import { Text, XStack, YStack } from 'tamagui';
import {
  SIGNUP_STEPS,
  SIGNUP_STEP_COUNT,
  buildSignupStepperLabels,
  signupStepIndex,
  type SignupStep,
} from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  step: SignupStep;
}

/**
 * The four-step rail, and the line under it saying what this step is for.
 * Tamagui twin of mWeb's <SignupStepperRail/>.
 *
 * Four bars rather than MUI's numbered rail: on a phone the step NAMES do not
 * fit side by side, so the position is shown and the current step names itself
 * underneath.
 */
export function SignupStepperRail({ step }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = buildSignupStepperLabels(t);
  const current = signupStepIndex(step);

  return (
    <YStack gap={8} testID="signup-stepper">
      <XStack gap={6}>
        {SIGNUP_STEPS.map((id, index) => (
          <YStack
            key={id}
            flex={1}
            height={4}
            borderRadius={2}
            backgroundColor={index < current ? '$primary' : '$borderColor'}
          />
        ))}
      </XStack>
      <YStack gap={2} alignItems="center">
        <Text fontSize={12} color="$muted">
          {labels.stepOf(current, SIGNUP_STEP_COUNT)}
        </Text>
        <Text fontSize={15} fontWeight="700" color="$color">
          {labels.step(step).title}
        </Text>
        <Text fontSize={13} color="$muted" textAlign="center">
          {labels.step(step).subtitle}
        </Text>
      </YStack>
    </YStack>
  );
}
