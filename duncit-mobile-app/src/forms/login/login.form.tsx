import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Text, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { loginDefaults, loginSchema, type LoginFormValues } from './login.types';

export interface LoginFormProps {
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (values: LoginFormValues) => void | Promise<void>;
}

/** Email + password login — same fields as the mWeb login. */
export function LoginForm({ loading, errorMessage, onSubmit }: LoginFormProps) {
  const { control, handleSubmit } = useForm<LoginFormValues>({
    defaultValues: loginDefaults,
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  });

  return (
    <YStack gap={16}>
      <FormTextField
        control={control}
        name="email"
        label="Email"
        placeholder="hello@duncit.com"
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <FormTextField
        control={control}
        name="password"
        label="Password"
        placeholder="Enter password"
        secureTextEntry
        autoComplete="password"
        textContentType="password"
      />

      {errorMessage ? (
        <Text fontSize={14} color="$danger" testID="login-error">
          {errorMessage}
        </Text>
      ) : null}

      <PrimaryButton
        testID="login-submit"
        label="Login"
        loading={loading}
        onPress={handleSubmit(onSubmit)}
      />
    </YStack>
  );
}
