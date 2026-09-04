import { useEffect, useRef, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Text, XStack, YStack } from 'tamagui';
import { buildSignupStepperLabels } from '@duncit/utils';
import { makeContactOtpSchema, type ContactOtpValues } from '@duncit/forms/schemas';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { FormTextField } from '@/components/FormTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useTranslation } from '@/hooks/useTranslation';
import { requestSignupWhatsAppOtp, verifySignupWhatsAppOtp } from '@/services/auth.service';
import { toErrorMessage } from '@/utils/errors';

interface Props {
  /** The dial code and number the step before this one settled. */
  extension: string;
  number: string;
  /** The address the same signup is about to use, checked alongside the number. */
  email?: string;
  /** True while the proof is being spent on the account. */
  creating: boolean;
  /** The proof of the number, on its way to the door that creates the account. */
  onVerified: (whatsappToken: string) => void;
}

/**
 * Step four — the WhatsApp code, and the end of signup. Tamagui twin of mWeb's
 * <VerifyWhatsappStep/>.
 *
 * Both mutations here are PUBLIC, because there is no account yet: this step is
 * what decides whether there will be one. Proving the code returns a one-shot
 * token, and the flow spends it on `register` (or `signupWithGoogle`) straight
 * away. There is deliberately no way past this screen — leaving it leaves
 * nothing behind, which is the point.
 */
export function VerifyWhatsappStep({
  extension,
  number,
  email,
  creating,
  onVerified,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = buildSignupStepperLabels(t);
  const [error, setError] = useState<string | null>(null);
  const [testCode, setTestCode] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [proving, setProving] = useState(false);
  /** The first send is automatic; this stops a re-render sending twice. */
  const asked = useRef(false);

  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useForm<ContactOtpValues, any, ContactOtpValues>({
    defaultValues: { otp: '' },
    resolver: zodResolver(makeContactOtpSchema(t)) as unknown as Resolver<
      ContactOtpValues,
      any,
      ContactOtpValues
    >,
    mode: 'onChange',
  });

  const send = async () => {
    setError(null);
    setSending(true);
    try {
      const { testCode: code } = await requestSignupWhatsAppOtp(extension, number, email);
      setTestCode(code);
    } catch (e) {
      setError(toErrorMessage(e, t('mweb.auth.somethingWentWrong')));
    } finally {
      setSending(false);
    }
  };

  /* The code goes out as the step opens: the person typed the number two steps
     ago, so making them press "Send" first is a tap that asks nothing. */
  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    send().catch(() => undefined);
    // Once per mount — `send` closes over the number, which cannot change
    // while this step is showing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = handleSubmit(async (values) => {
    setError(null);
    setProving(true);
    try {
      const proof = await verifySignupWhatsAppOtp(extension, number, values.otp);
      onVerified(proof);
    } catch (e) {
      setError(toErrorMessage(e, t('mweb.auth.somethingWentWrong')));
    } finally {
      setProving(false);
    }
  });

  const busy = proving || creating;
  // Decided above the JSX (S3358): proving the code and spending it are two
  // waits in a row, and they say different things.
  let buttonLabel = labels.verify;
  if (proving) buttonLabel = labels.verifying;
  else if (creating) buttonLabel = labels.creating;

  return (
    <YStack gap={16}>
      <Text fontSize={13} color="$muted">
        {labels.codeSentTo(`${extension} ${number}`.trim())}
      </Text>
      {testCode ? (
        <Text fontSize={13} fontWeight="600" color="$color" testID="signup-test-code">
          {labels.testCode(testCode)}
        </Text>
      ) : null}
      <FormTextField
        control={control}
        name="otp"
        label={t('mweb.resetPassword.otpLabel')}
        placeholder={t('mweb.resetPassword.otpPlaceholder')}
        keyboardType="number-pad"
        digitsOnly
        maxLength={6}
        required
      />
      {error ? (
        <Text fontSize={14} color="$danger" testID="signup-verify-error">
          {error}
        </Text>
      ) : null}
      <PrimaryButton
        testID="signup-verify"
        label={buttonLabel}
        loading={busy}
        disabled={busy || !isValid}
        onPress={() => {
          submit().catch(() => undefined);
        }}
      />
      <XStack justifyContent="center" gap={4}>
        <Text fontSize={14} color="$muted">
          {labels.didntGetIt}
        </Text>
        <Text
          testID="signup-resend"
          pressStyle={PRESS_STYLE.inline}
          fontSize={14}
          fontWeight="600"
          color={sending ? '$muted' : '$primary'}
          onPress={
            sending
              ? undefined
              : () => {
                  send().catch(() => undefined);
                }
          }
        >
          {sending ? labels.sending : labels.resend}
        </Text>
      </XStack>
    </YStack>
  );
}
