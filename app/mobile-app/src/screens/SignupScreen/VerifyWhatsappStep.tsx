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
import { requestWhatsAppOtp, skipWhatsAppOtp, verifyWhatsAppOtp } from '@/services/auth.service';
import { toErrorMessage } from '@/utils/errors';

interface Props {
  /** The dial code and number step two collected. */
  extension: string;
  number: string;
  /** Where a verified — or skipped — number leads. */
  onDone: () => void;
}

/**
 * Step four — the WhatsApp code. Tamagui twin of mWeb's <VerifyWhatsappStep/>.
 *
 * It can only run here, after `register`: all three mutations authenticate the
 * caller, so the account has to exist before a code can be asked for. The token
 * is already stored by the time this mounts, which is what makes them
 * authorised without the person having "logged in" yet.
 *
 * Skipping is allowed and leaves the account exactly as it is — the number is
 * simply unverified.
 */
export function VerifyWhatsappStep({ extension, number, onDone }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = buildSignupStepperLabels(t);
  const [error, setError] = useState<string | null>(null);
  const [testCode, setTestCode] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
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
      const { testCode: code } = await requestWhatsAppOtp(extension, number);
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
    setVerifying(true);
    try {
      await verifyWhatsAppOtp(extension, number, values.otp);
      onDone();
    } catch (e) {
      setError(toErrorMessage(e, t('mweb.auth.somethingWentWrong')));
    } finally {
      setVerifying(false);
    }
  });

  const skip = async () => {
    // A failure here changes nothing about the account, so the person is let
    // through either way rather than trapped on a step they chose to leave.
    await skipWhatsAppOtp().catch(() => undefined);
    onDone();
  };

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
        label={verifying ? labels.verifying : labels.verify}
        loading={verifying}
        disabled={verifying || !isValid}
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
      <Text
        testID="signup-skip-whatsapp"
        pressStyle={PRESS_STYLE.inline}
        fontSize={14}
        color="$muted"
        textAlign="center"
        onPress={() => {
          skip().catch(() => undefined);
        }}
      >
        {labels.skipForNow}
      </Text>
    </YStack>
  );
}
