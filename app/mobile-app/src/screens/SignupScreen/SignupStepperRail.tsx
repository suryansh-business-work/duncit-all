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
  /**
   * The Google door's number step, which sits inside VERIFY rather than beside
   * it: Google has already answered the first three steps, so the position is
   * right and only the words need to say which half of the last one is showing.
   */
  askingNumber?: boolean;
}

/**
 * The four-step rail, and the line under it saying what this step is for.
 * Tamagui twin of mWeb's <SignupStepperRail/>.
 *
 * Four bars rather than MUI's numbered rail: on a phone the step NAMES do not
 * fit side by side, so the position is shown and the current step names itself
 * underneath.
 */
export function SignupStepperRail({ step, askingNumber }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = buildSignupStepperLabels(t);
  const current = signupStepIndex(step);
  // Decided above the JSX (S3358).
  const heading = askingNumber
    ? { title: labels.numberTitle, subtitle: labels.numberSubtitle }
    : labels.step(step);

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
          {heading.title}
        </Text>
        <Text fontSize={13} color="$muted" textAlign="center">
          {heading.subtitle}
        </Text>
      </YStack>
    </YStack>
  );
}
