import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Text, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { TextField } from '@/components/TextField';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';
import { makeTwoFactorSchema, twoFactorDefaults, type TwoFactorValues } from './two-factor.types';

interface Props {
  onSubmit: (values: TwoFactorValues) => Promise<void>;
  onBack: () => void;
  error?: string | null;
}

/** The authenticator code a 2FA account owes after its password. */
export function TwoFactorForm({ onSubmit, onBack, error }: Readonly<Props>) {
  const { t } = useTranslation();
  const resolver = useMemo(() => formResolver<TwoFactorValues>(makeTwoFactorSchema(t)), [t]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { control, handleSubmit, formState } = useForm<TwoFactorValues, any, TwoFactorValues>({
    defaultValues: twoFactorDefaults,
    resolver,
    mode: 'onTouched',
  });
  return (
    <YStack gap="$3">
      <Text color="$muted">{t('crmApp.twoFactor.hint')}</Text>
      <TextField
        control={control}
        name="code"
        label={t('crmApp.twoFactor.code')}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        testID="two-factor-code"
      />
      <DuncitButton
        label={t('crmApp.twoFactor.verify')}
        onPress={handleSubmit(onSubmit)}
        loading={formState.isSubmitting}
        fullWidth
        testID="two-factor-submit"
      />
      <DuncitButton
        label={t('crmApp.twoFactor.back')}
        onPress={onBack}
        variant="ghost"
        fullWidth
        testID="two-factor-back"
      />
      {error ? (
        <Text color="$danger" role="alert" testID="two-factor-error">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}
