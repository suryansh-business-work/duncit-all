import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';
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

import { DuncitButton } from '@/components/DuncitButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useSignupPolicies } from '@/hooks/usePolicies';
import { useTranslation } from '@/hooks/useTranslation';
import { allPoliciesAccepted } from '@/utils/policy-acceptance';
import { formResolver } from '../../utils/form-resolver';
import { ContactStep } from './steps/ContactStep';
import { SecurityStep } from './steps/SecurityStep';
import { WhoStep } from './steps/WhoStep';
import { makeSignupSchema, signupDefaults, type SignupFormValues } from './signup.types';

export interface SignupFormProps {
  /** Which of the first three steps is showing. VERIFY is the screen's. */
  step: SignupStep;
  onStep: (step: SignupStep) => void;
  loading?: boolean;
  errorMessage?: string | null;
  initialValues?: SignupFormValues;
  onSubmit: (values: SignupFormValues) => void | Promise<void>;
}

/**
 * Join Duncit, steps one to three. Tamagui twin of mWeb's <RegisterForm/>.
 *
 * ONE react-hook-form across all three, not a form per step: the answers have
 * to survive going back, and `register` needs every one of them at once. What
 * the step changes is which boxes are shown and which are validated — the step
 * order and the field lists come from @duncit/utils (rules 27 and 40).
 */
export function SignupForm({
  step,
  onStep,
  loading,
  errorMessage,
  initialValues,
  onSubmit,
}: Readonly<SignupFormProps>) {
  const { t } = useTranslation();
  const { minSignupAge } = useAppSettings();
  const { policies, loaded } = useSignupPolicies();
  const requiredPolicyIds = useMemo(() => policies.map((policy) => policy.id), [policies]);
  const labels = buildSignupStepperLabels(t);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const schema = useMemo(
    () => makeSignupSchema(minSignupAge, t, requiredPolicyIds),
    [minSignupAge, t, requiredPolicyIds],
  );
  const {
    control,
    handleSubmit,
    trigger,
    watch,
    formState: { errors },
  } = useForm<SignupFormValues, any, SignupFormValues>({
    defaultValues: initialValues ?? signupDefaults,
    resolver: formResolver<SignupFormValues>(schema),
    mode: 'onBlur',
  });

  // The gate stays shut until the server has said what must be accepted: an
  // empty list is vacuously accepted, which is only true once it has answered.
  const policiesAccepted = loaded && allPoliciesAccepted(policies, watch('acceptedPolicyIds'));

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
    const fields = SIGNUP_STEP_FIELDS[step] as (keyof SignupFormValues)[];
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
      wrong, go to the step that owns it.
    */
    if (!(await trigger())) {
      const broken = firstStepWithError(Object.keys(errors));
      if (broken && broken !== step) onStep(broken);
      return;
    }
    await submit();
  };

  const creating = stepSubmitsAccount(step);
  let nextLabel = labels.next;
  if (creating) nextLabel = loading ? labels.creating : labels.createAccount;

  return (
    <YStack gap={16}>
      {step === 'WHO' ? <WhoStep control={control} minAge={minSignupAge} /> : null}
      {step === 'CONTACT' ? <ContactStep control={control} /> : null}
      {step === 'SECURITY' ? (
        <SecurityStep control={control} policiesAccepted={policiesAccepted} />
      ) : null}

      {errorMessage || submitError ? (
        <Text fontSize={14} color="$danger" testID="signup-error">
          {errorMessage || submitError}
        </Text>
      ) : null}

      <XStack gap={12}>
        {canLeaveSignupStep(step) ? (
          <YStack flex={1}>
            <DuncitButton
              testID="signup-back"
              label={labels.back}
              variant="outline"
              fullWidth
              onPress={() => {
                setSubmitError(null);
                const previous = previousSignupStep(step);
                if (previous) onStep(previous);
              }}
            />
          </YStack>
        ) : null}
        <YStack flex={2}>
          <PrimaryButton
            testID="signup-next"
            label={nextLabel}
            loading={loading}
            disabled={creating && !policiesAccepted}
            onPress={() => {
              advance().catch(() => undefined);
            }}
          />
        </YStack>
      </XStack>
    </YStack>
  );
}
