import { useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Text, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useTranslation } from '@/hooks/useTranslation';
import { loginDefaults, makeLoginSchema, type LoginFormValues } from './login.types';

export interface LoginFormProps {
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (values: LoginFormValues) => void | Promise<void>;
}

/** Email + password login — same fields as the mWeb login. */
export function LoginForm({ loading, errorMessage, onSubmit }: Readonly<LoginFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeLoginSchema(t), [t]);
  const { control, handleSubmit } = useForm<LoginFormValues, any, LoginFormValues>({
    defaultValues: loginDefaults,
    resolver: zodResolver(schema) as unknown as Resolver<LoginFormValues, any, LoginFormValues>,
    mode: 'onBlur',
  });

  return (
    <YStack gap={16}>
      <FormTextField
        control={control}
        name="email"
        label={t('mweb.auth.emailLabel')}
        placeholder={t('mweb.auth.emailPlaceholder')}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        required
      />
      <FormTextField
        control={control}
        name="password"
        label={t('mweb.auth.passwordLabel')}
        placeholder={t('mweb.login.passwordPlaceholder')}
        secureTextEntry
        autoComplete="password"
        textContentType="password"
        required
        hint={t('mweb.auth.passwordHint')}
      />

      {errorMessage ? (
        <Text fontSize={14} color="$danger" testID="login-error">
          {errorMessage}
        </Text>
      ) : null}

      <PrimaryButton
        testID="login-submit"
        label={t('mweb.login.submit')}
        loading={loading}
        onPress={handleSubmit(onSubmit)}
      />
    </YStack>
  );
}
