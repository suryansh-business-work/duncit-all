import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, YStack, useTheme } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { DuncitButton } from '@/components/DuncitButton';
import { TextField } from '@/components/TextField';
import { RADII } from '@/constants/design';
import { useTranslation } from '@/hooks/useTranslation';
import { AuthAlert } from '@/screens/auth/AuthAlert';
import { formResolver } from '@/utils/form-resolver';
import {
  makeWaGatewaySchema,
  type WaGatewayFormProps,
  type WaGatewayValues,
} from './wa-gateway.types';

/** Step 1 of the WhatsApp Lead Generator: the gateway URL and API key, typed in (or the key generated). */
export function WaGatewayForm({
  initialBaseUrl,
  hasKey,
  submitting,
  generating,
  error,
  notice,
  onSubmit,
  onGenerate,
}: Readonly<WaGatewayFormProps>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const resolver = useMemo(
    () => formResolver<WaGatewayValues>(makeWaGatewaySchema(t, hasKey)),
    [t, hasKey],
  );
  const { control, handleSubmit, trigger, getValues } = useForm({
    defaultValues: { base_url: initialBaseUrl, api_key: '' },
    resolver,
    mode: 'onSubmit',
  });
  const busy = !!submitting || !!generating;

  // Generating needs only a valid URL, so it checks that one field rather than the whole form.
  const generate = () =>
    fireAndForget(
      trigger('base_url').then(async (valid) => {
        if (valid) await onGenerate(getValues('base_url').trim());
      }),
      logs.mobileApp,
      'crm-app/WaGatewayForm',
      'generate',
    );

  return (
    <YStack gap="$3">
      {error ? <AuthAlert message={error} testID="wa-gateway-error" /> : null}
      {!error && notice ? (
        <Text
          role="status"
          aria-live="polite"
          color="$success"
          backgroundColor="$successSoft"
          borderRadius={RADII.sm}
          padding="$3"
          fontWeight="600"
          testID="wa-gateway-notice"
        >
          {notice}
        </Text>
      ) : null}
      <TextField
        control={control}
        name="base_url"
        label={t('crm.tools.gatewayUrl')}
        hint={t('crm.tools.gatewayUrlHint')}
        testID="wa-gateway-url"
      />
      <TextField
        control={control}
        name="api_key"
        label={t('crm.tools.apiKey2')}
        placeholder={
          hasKey ? t('crm.tools.apiKeyKeepPlaceholder') : t('crm.tools.apiKeyPlaceholder')
        }
        secure
        testID="wa-gateway-key"
      />
      <DuncitButton
        label={t('crm.tools.generateApiKey')}
        onPress={generate}
        variant="outline"
        icon={<MaterialIcons name="vpn-key" size={18} color={theme.accentText?.val} />}
        loading={generating}
        disabled={busy}
        fullWidth
        testID="wa-gateway-generate"
      />
      <DuncitButton
        label={t('crm.tools.saveAndContinue')}
        onPress={handleSubmit(onSubmit)}
        loading={submitting}
        disabled={busy}
        fullWidth
        testID="wa-gateway-submit"
      />
    </YStack>
  );
}
