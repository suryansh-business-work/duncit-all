import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, YStack, useTheme } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { TextField } from '@/components/TextField';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';
import {
  makeOtpCodeSchema,
  makeOtpLoginSchema,
  otpLoginDefaults,
  type OtpLoginValues,
} from './otp-login.types';

interface Props {
  /** Ask the server to email a code; false when it could not (the screen shows why). */
  onRequestCode: (email: string) => Promise<boolean>;
  /** Trade the code for a session; the screen shows any refusal. */
  onSubmitCode: (email: string, code: string) => Promise<void>;
}

/**
 * The address, then the six digits. The wording after sending never confirms
 * that an account exists — the server answers the same for an unknown address,
 * so the screen must not say "sent" versus "no such user" (the portal's rule).
 */
export function OtpLoginForm({ onRequestCode, onSubmitCode }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const resolver = useMemo(() => formResolver<OtpLoginValues>(makeOtpLoginSchema(t)), [t]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { control, handleSubmit, setError, setValue } = useForm<
    OtpLoginValues,
    any,
    OtpLoginValues
  >({
    defaultValues: otpLoginDefaults,
    resolver,
    mode: 'onTouched',
  });

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    try {
      await work();
    } finally {
      setBusy(false);
    }
  };

  const send = handleSubmit(({ email }) =>
    run(async () => {
      if (await onRequestCode(email)) setSent(true);
    }),
  );

  const verify = handleSubmit(({ email, code }) => {
    const checked = makeOtpCodeSchema(t).safeParse(code);
    if (!checked.success) {
      setError('code', { message: checked.error.issues[0]?.message });
      return undefined;
    }
    return run(() => onSubmitCode(email, checked.data));
  });

  const mailIcon = <MaterialIcons name="mail-outline" size={18} color={theme.onPrimary?.val} />;

  return (
    <YStack gap="$3">
      {sent ? null : (
        <TextField
          control={control}
          name="email"
          label={t('shell.login.emailAddress')}
          variant="pill"
          icon="mail-outline"
          keyboardType="email-address"
          autoComplete="email"
          testID="otp-login-email"
        />
      )}
      {sent ? (
        <>
          <Text color="$muted" fontSize="$2" role="status" testID="otp-login-code-sent">
            {t('crmApp.otp.sent')}
          </Text>
          <TextField
            control={control}
            name="code"
            label={t('crmApp.otp.code')}
            variant="pill"
            icon="pin"
            keyboardType="number-pad"
            autoComplete="one-time-code"
            testID="field-otp"
          />
          <DuncitButton
            label={busy ? t('crmApp.otp.submitting') : t('crmApp.otp.submit')}
            onPress={verify}
            loading={busy}
            fullWidth
            testID="otp-verify-code"
          />
          <Text
            role="button"
            color="$muted"
            fontSize="$3"
            fontWeight="600"
            alignSelf="center"
            onPress={() => {
              setSent(false);
              setValue('code', '');
            }}
            testID="otp-different-address"
          >
            {t('shell.login.differentAddress')}
          </Text>
        </>
      ) : (
        <DuncitButton
          label={busy ? t('crmApp.otp.sending') : t('crmApp.otp.send')}
          onPress={send}
          loading={busy}
          icon={mailIcon}
          fullWidth
          testID="otp-send-code"
        />
      )}
    </YStack>
  );
}
