import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Text, YStack } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { DuncitButton } from '@/components/DuncitButton';
import { TextField } from '@/components/TextField';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';
import { envAccessDefaults, makeEnvAccessSchema, type EnvAccessValues } from './env-access.types';

interface Props {
  /** Where the code went (masked), once one was sent. */
  sentTo: string;
  /** A code was sent in this visit, so the code field shows. */
  codeSent: boolean;
  onSendCode: () => Promise<void>;
  onSubmit: (values: EnvAccessValues) => Promise<void>;
  error?: string | null;
}

/**
 * Unlocking the protected settings for this session: email the code to the
 * root admin, then type it — the Tech portal's access gate, step for step.
 */
export function EnvAccessForm({ sentTo, codeSent, onSendCode, onSubmit, error }: Readonly<Props>) {
  const { t } = useTranslation();
  const resolver = useMemo(() => formResolver<EnvAccessValues>(makeEnvAccessSchema(t)), [t]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { control, handleSubmit, formState } = useForm<EnvAccessValues, any, EnvAccessValues>({
    defaultValues: envAccessDefaults,
    resolver,
    mode: 'onTouched',
  });
  return (
    <YStack gap="$3">
      <Text color="$muted">{t('crmApp.twilio.unlockBody', { vars: { sentTo } })}</Text>
      {codeSent ? (
        <>
          <Text testID="env-access-sent">{t('crmApp.twilio.codeSent', { vars: { sentTo } })}</Text>
          <TextField
            control={control}
            name="code"
            label={t('crmApp.twilio.code')}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            testID="env-access-code"
          />
          <DuncitButton
            label={t('crmApp.twilio.unlock')}
            onPress={handleSubmit(onSubmit)}
            loading={formState.isSubmitting}
            fullWidth
            testID="env-access-unlock"
          />
        </>
      ) : null}
      <DuncitButton
        label={codeSent ? t('crmApp.twilio.resendCode') : t('crmApp.twilio.sendCode')}
        onPress={() =>
          fireAndForget(onSendCode(), logs.mobileApp, 'crm-app/EnvAccessForm', 'sendCode')
        }
        variant={codeSent ? 'ghost' : 'solid'}
        fullWidth
        testID="env-access-send"
      />
      {error ? (
        <Text color="$danger" role="alert" testID="env-access-error">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}
