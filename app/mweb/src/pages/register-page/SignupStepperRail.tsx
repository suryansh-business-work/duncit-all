import { Stack, Step, StepLabel, Stepper, Typography } from '@mui/material';
import {
  SIGNUP_STEPS,
  SIGNUP_STEP_COUNT,
  buildSignupStepperLabels,
  signupStepIndex,
  type SignupStep,
} from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  step: SignupStep;
}

/**
 * The four-step rail, and the line under it saying what this step is for.
 *
 * The rail is read-only: a completed step is not a link back, because "Back" is
 * the button that owns that and the last step has no way back at all — the
 * account exists by then.
 */
export default function SignupStepperRail({ step }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = buildSignupStepperLabels(t);
  const active = signupStepIndex(step) - 1;
  const current = labels.step(step);

  return (
    <Stack spacing={1}>
      <Stepper activeStep={active} alternativeLabel>
        {SIGNUP_STEPS.map((id) => (
          <Step key={id}>
            <StepLabel>{labels.step(id).title}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <Stack spacing={0.3} sx={{ alignItems: 'center' }}>
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          {labels.stepOf(signupStepIndex(step), SIGNUP_STEP_COUNT)}
        </Typography>
        <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary' }}>
          {current.subtitle}
        </Typography>
      </Stack>
    </Stack>
  );
}
