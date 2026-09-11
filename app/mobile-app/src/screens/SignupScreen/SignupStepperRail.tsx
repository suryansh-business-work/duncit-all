import { Text, YStack } from 'tamagui';
import {
  SIGNUP_STEPS,
  SIGNUP_STEP_COUNT,
  buildSignupStepperLabels,
  signupStepIndex,
  type SignupStep,
} from '@duncit/utils';

import { StepProgressBar } from '@/components/StepProgressBar';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  step: SignupStep;
  /**
   * The Google door's own step, which sits inside VERIFY rather than beside
   * it: Google has already answered the first three steps, so the position is
   * right and only the words need to say which half of the last one is showing.
   */
  askingNumber?: boolean;
}

/**
 * The four-step rail: a slim segmented bar, and the current step's name under
 * it. Tamagui twin of mWeb's <SignupStepperRail/>.
 *
 * "Step X of N" is the bar's accessible name now rather than a caption, since
 * the bar already shows the position.
 */
export function SignupStepperRail({ step, askingNumber }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = buildSignupStepperLabels(t);
  const current = signupStepIndex(step);
  // Decided above the JSX (S3358).
  const title = askingNumber ? labels.detailsTitle : labels.step(step).title;

  return (
    <YStack gap={12} testID="signup-stepper">
      <StepProgressBar
        steps={SIGNUP_STEPS}
        current={current}
        label={labels.stepOf(current, SIGNUP_STEP_COUNT)}
      />
      <Text fontSize={17} fontWeight="600" color="$color" textAlign="center">
        {title}
      </Text>
    </YStack>
  );
}
