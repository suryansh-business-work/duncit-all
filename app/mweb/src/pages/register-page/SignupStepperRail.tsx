import { Stack, Typography } from '@mui/material';
import {
  SIGNUP_STEPS,
  SIGNUP_STEP_COUNT,
  buildSignupStepperLabels,
  signupStepIndex,
  type SignupStep,
} from '@duncit/utils';
import StepProgressBar from '../../components/StepProgressBar';
import { useTranslation } from '../../i18n/useTranslation';

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
 * The four-step rail: a slim segmented bar, and the current step's name under
 * it. Native twin: app/mobile-app/src/screens/SignupScreen/SignupStepperRail.
 *
 * The rail is read-only: a completed step is not a link back, because "Back" is
 * the button that owns that and the last step has no way back at all — the
 * account exists by then. "Step X of N" is the bar's accessible name now rather
 * than a caption, since the bar already shows the position.
 */
export default function SignupStepperRail({ step, askingNumber }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = buildSignupStepperLabels(t);
  const current = signupStepIndex(step);
  // Decided above the JSX (S3358).
  const title = askingNumber ? labels.detailsTitle : labels.step(step).title;

  return (
    <Stack spacing={1.5} data-testid="signup-stepper">
      <StepProgressBar
        steps={SIGNUP_STEPS}
        current={current}
        label={labels.stepOf(current, SIGNUP_STEP_COUNT)}
      />
      <Typography sx={{ fontSize: 17, fontWeight: 600, textAlign: 'center' }}>{title}</Typography>
    </Stack>
  );
}
