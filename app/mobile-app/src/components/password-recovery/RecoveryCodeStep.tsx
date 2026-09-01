import { formResolver } from '../../utils/form-resolver';
import { useForm } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';
import type { PasswordRecoveryLabels } from '@duncit/utils';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { FormTextField } from '@/components/FormTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import {
  recoveryCodeSchema,
  type RecoveryCodeValues,
} from '@/forms/password-recovery/password-recovery.types';

interface Props {
  labels: PasswordRecoveryLabels;
  /** Where the code went, named back to the person who asked for it. */
  destination: string;
  expiresInMinutes: number;
  /** Echoed back only while no medium could really carry the code. */
  testCode: string | null;
  busy: boolean;
  resending: boolean;
  /** Seconds left on the cooldown; 0 when another code may be asked for. */
  resendIn: number;
  onVerify: (otp: string) => void;
  onResend: () => void;
}

/**
 * Step two: the code. Tamagui twin of mWeb's <RecoveryCodeStep/>.
 *
 * Its own step rather than a box beside the new password, so a wrong code is
 * reported before anybody has typed a password twice.
 */
export function RecoveryCodeStep({
  labels,
  destination,
  expiresInMinutes,
  testCode,
  busy,
  resending,
  resendIn,
  onVerify,
  onResend,
}: Readonly<Props>) {
  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useForm<RecoveryCodeValues, any, RecoveryCodeValues>({
    defaultValues: { otp: '' },
    resolver: formResolver<RecoveryCodeValues>(recoveryCodeSchema),
    mode: 'onChange',
  });

  const submit = handleSubmit((values) => onVerify(values.otp));
  // Computed once here rather than inside the JSX: a chain of conditions in a
  // prop is the nesting Sonar counts (S3358), and the answer is one string.
  const waiting = resendIn > 0;
  const idleResendLabel = waiting ? labels.resendIn(resendIn) : labels.resend;
  const resendLabel = resending ? labels.resending : idleResendLabel;

  return (
    <YStack gap={12}>
      <Text fontSize={13} color="$muted">
        {labels.codeSubtitle(destination)}
      </Text>
      {testCode ? (
        <Text fontSize={13} fontWeight="600" color="$color" testID="recovery-test-code">
          {labels.testCode(testCode)}
        </Text>
      ) : null}
      <FormTextField
        control={control}
        name="otp"
        label={labels.codeLabel}
        keyboardType="number-pad"
        digitsOnly
        maxLength={6}
        required
      />
      <Text fontSize={12} color="$muted">
        {labels.codeExpiry(expiresInMinutes)}
      </Text>
      <PrimaryButton
        testID="recovery-verify-code"
        label={busy ? labels.verifying : labels.verify}
        loading={busy}
        disabled={busy || !isValid}
        onPress={submit}
      />
      <XStack gap={4} justifyContent="center">
        <Text fontSize={14} color="$muted">
          {labels.didntGetIt}
        </Text>
        <Text
          testID="recovery-resend"
          pressStyle={PRESS_STYLE.inline}
          fontSize={14}
          fontWeight="600"
          color={waiting || resending ? '$muted' : '$primary'}
          onPress={waiting || resending ? undefined : onResend}
        >
          {resendLabel}
        </Text>
      </XStack>
    </YStack>
  );
}
