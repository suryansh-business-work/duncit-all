import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { DuncitButton } from '@/components/DuncitButton';
import { FormLayout } from '@/components/mobile/FormLayout';
import { TextField } from '@/components/TextField';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';
import { makeTwilioConfigSchema, type TwilioConfigValues } from './twilio-config.types';

interface Props {
  initial: TwilioConfigValues;
  /** A token is stored, so a blank field keeps it. */
  tokenSaved: boolean;
  onSave: (values: TwilioConfigValues) => Promise<void>;
  /** Tests the saved entry against Twilio; offered once there is one. */
  onTest?: () => Promise<void>;
  testing?: boolean;
  /** What the last save or test said. */
  result?: { message: string; ok: boolean } | null;
}

/** The call line's Twilio account, auth token and numbers, saved from the app. */
export function TwilioConfigForm({
  initial,
  tokenSaved,
  onSave,
  onTest,
  testing = false,
  result,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const resolver = useMemo(
    () => formResolver<TwilioConfigValues>(makeTwilioConfigSchema(t, tokenSaved)),
    [t, tokenSaved],
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { control, handleSubmit, formState } = useForm<TwilioConfigValues, any, TwilioConfigValues>(
    {
      defaultValues: initial,
      resolver,
      mode: 'onTouched',
    },
  );
  const footer = (
    <XStack flex={1} gap="$2">
      {onTest ? (
        <YStack flex={1}>
          <DuncitButton
            label={t('crmApp.twilio.test')}
            onPress={() =>
              fireAndForget(onTest(), logs.mobileApp, 'crm-app/TwilioConfigForm', 'test')
            }
            loading={testing}
            variant="outline"
            fullWidth
            testID="twilio-test"
          />
        </YStack>
      ) : null}
      <YStack flex={1}>
        <DuncitButton
          label={t('crmApp.twilio.save')}
          onPress={handleSubmit(onSave)}
          loading={formState.isSubmitting}
          fullWidth
          testID="twilio-save"
        />
      </YStack>
    </XStack>
  );
  return (
    <FormLayout footer={footer}>
      <TextField
        control={control}
        name="account_sid"
        label={t('crm.call.fieldAccountSid')}
        hint={t('crmApp.twilio.accountSidHint')}
        autoComplete="off"
        testID="twilio-account-sid"
      />
      <TextField
        control={control}
        name="auth_token"
        label={t('crm.call.fieldAuthToken')}
        hint={tokenSaved ? t('crmApp.twilio.tokenSaved') : undefined}
        secure
        autoComplete="off"
        testID="twilio-auth-token"
      />
      <TextField
        control={control}
        name="phone_number"
        label={t('crm.call.fieldPhoneNumber')}
        hint={t('crmApp.twilio.phoneHint')}
        keyboardType="phone-pad"
        testID="twilio-phone-number"
      />
      <TextField
        control={control}
        name="agent_phone_number"
        label={t('crmApp.twilio.agentNumber')}
        hint={t('crmApp.twilio.agentHint')}
        keyboardType="phone-pad"
        testID="twilio-agent-number"
      />
      {result ? (
        <Text
          color={result.ok ? '$success' : '$danger'}
          role={result.ok ? undefined : 'alert'}
          aria-live="polite"
          testID="twilio-result"
        >
          {result.message}
        </Text>
      ) : null}
    </FormLayout>
  );
}
