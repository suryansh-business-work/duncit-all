import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { TextField } from '@/components/TextField';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';
import { loginDefaults, makeLoginSchema, type LoginFormValues } from './login.types';

interface Props {
  onSubmit: (values: LoginFormValues) => Promise<void>;
  /** The sign-in error to show under the button, already worded. */
  error?: string | null;
}

/** Email + password, the CRM portal's sign-in. */
export function LoginForm({ onSubmit, error }: Readonly<Props>) {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const resolver = useMemo(() => formResolver<LoginFormValues>(makeLoginSchema(t, 'EMAIL')), [t]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { control, handleSubmit, formState } = useForm<LoginFormValues, any, LoginFormValues>({
    defaultValues: loginDefaults,
    resolver,
    mode: 'onTouched',
  });

  return (
    <YStack gap="$3">
      <TextField control={control} name="email" label={t('crmApp.login.email')} keyboardType="email-address" autoComplete="email" testID="login-email" />
      <TextField control={control} name="password" label={t('crmApp.login.password')} secure={!showPassword} autoComplete="password" testID="login-password" />
      <XStack justifyContent="flex-end">
        <DuncitButton
          label={showPassword ? t('crmApp.login.hidePassword') : t('crmApp.login.showPassword')}
          onPress={() => setShowPassword((v) => !v)}
          variant="ghost"
          size="sm"
          testID="login-toggle-password"
        />
      </XStack>
      <DuncitButton
        label={t('crmApp.login.submit')}
        onPress={handleSubmit(onSubmit)}
        loading={formState.isSubmitting}
        fullWidth
        testID="login-submit"
      />
      {error ? (
        <Text color="$danger" role="alert" testID="login-error">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}
