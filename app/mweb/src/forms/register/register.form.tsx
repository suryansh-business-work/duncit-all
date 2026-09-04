import { useMemo, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { DuncitButton } from '@duncit/buttons';
import {
  SIGNUP_STEP_FIELDS,
  buildSignupStepperLabels,
  canLeaveSignupStep,
  firstStepWithError,
  nextSignupStep,
  previousSignupStep,
  stepSubmitsAccount,
  type SignupStep,
} from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { useMinSignupAge } from '../../utils/dateFormat';
import { useSignupPolicies } from '../../components/policy-acceptance';
import ContactStep from './steps/ContactStep';
import SecurityStep from './steps/SecurityStep';
import WhoStep from './steps/WhoStep';
import { makeRegisterSchema, registerDefaults, type RegisterFormValues } from './register.types';

interface Props {
  /** Which of the first three steps is showing. VERIFY is the page's, not the
   * form's — it proves the number, and creates the account with these answers. */
  step: SignupStep;
  onStep: (step: SignupStep) => void;
  errorMessage?: string | null;
  initialValues?: RegisterFormValues;
  onSubmit: (values: RegisterFormValues) => Promise<void> | void;
}

/**
 * Join Duncit, steps one to three.
 *
 * ONE react-hook-form across all three, not a form per step: the answers have
 * to survive going back, and `register` needs every one of them at once — held
 * by the page until the code step proves the number they are created against. What
 * the step changes is which boxes are shown and which are validated — "Continue"
 * runs `trigger` over `SIGNUP_STEP_FIELDS[step]` alone, so a person is never
 * told off about a box two screens ahead that they have not reached.
 *
 * The step order and the field lists come from @duncit/utils, which the native
 * signup drives from too (rules 27 and 40).
 */
export default function RegisterForm({
  step,
  onStep,
  errorMessage,
  initialValues,
  onSubmit,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const minAge = useMinSignupAge();
  const { policies, loading: policiesLoading, failed: policiesFailed } = useSignupPolicies();
  const requiredPolicyIds = useMemo(() => policies.map((policy) => policy.id), [policies]);
  const labels = buildSignupStepperLabels(t);
  const schema = useMemo(
    () => makeRegisterSchema(minAge, t, requiredPolicyIds),
    [minAge, t, requiredPolicyIds],
  );
  const {
    control,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<RegisterFormValues, any, RegisterFormValues>({
    defaultValues: initialValues ?? registerDefaults,
    resolver: zodResolver(schema) as unknown as Resolver<
      RegisterFormValues,
      any,
      RegisterFormValues
    >,
    mode: 'onTouched',
  });

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await onSubmit(values);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : t('mweb.auth.somethingWentWrong'));
    }
  });

  /** Continue: check THIS step's boxes, then move on — or create the account. */
  const advance = async () => {
    setSubmitError(null);
    const fields = SIGNUP_STEP_FIELDS[step] as (keyof RegisterFormValues)[];
    if (!(await trigger(fields))) return;

    if (!stepSubmitsAccount(step)) {
      const next = nextSignupStep(step);
      if (next) onStep(next);
      return;
    }

    /*
      The last step submits, and `handleSubmit` re-checks the WHOLE form — so a
      value that is somehow wrong two steps back would otherwise stop the
      account being created with nothing on screen to explain it, because that
      box is not rendered. Check everything first and, if something earlier is
      wrong, go to the step that owns it: the error is then beside the box.
    */
    if (!(await trigger())) {
      const broken = firstStepWithError(Object.keys(errors));
      if (broken && broken !== step) onStep(broken);
      return;
    }
    await submit();
  };

  const back = () => {
    setSubmitError(null);
    const previous = previousSignupStep(step);
    if (previous) onStep(previous);
  };

  const creating = stepSubmitsAccount(step);
  const nextLabel = creating ? labels.createAccount : labels.next;

  return (
    <form
      noValidate
      onSubmit={(event) => {
        // Enter inside a box means "next step", never "submit the account" —
        // the account is created by the third step's button alone.
        event.preventDefault();
        advance().catch(() => undefined);
      }}
    >
      <Stack spacing={1.5}>
        {step === 'WHO' && <WhoStep control={control} minAge={minAge} />}
        {step === 'CONTACT' && <ContactStep control={control} />}
        {step === 'SECURITY' && (
          <SecurityStep
            control={control}
            policies={policies}
            policiesLoading={policiesLoading}
            policiesFailed={policiesFailed}
          />
        )}
      </Stack>

      <Stack spacing={1.2} sx={{ mt: 2 }}>
        {(submitError || errorMessage) && (
          <Alert severity="error">{submitError || errorMessage}</Alert>
        )}
        <Stack direction="row" spacing={1}>
          {canLeaveSignupStep(step) && (
            <DuncitButton
              type="button"
              variant="outlined"
              color="inherit"
              onClick={back}
              startIcon={<ArrowBackIcon />}
              data-testid="signup-back"
            >
              {labels.back}
            </DuncitButton>
          )}
          <DuncitButton
            type="submit"
            variant="contained"
            fullWidth
            endIcon={<ArrowForwardIcon />}
            data-testid="signup-next"
          >
            {nextLabel}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}

export type { RegisterFormValues } from './register.types';
