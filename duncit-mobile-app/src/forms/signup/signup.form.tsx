import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Text, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { signupDefaults, signupSchema, type SignupFormValues } from './signup.types';

export interface SignupFormProps {
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (values: SignupFormValues) => void | Promise<void>;
}

/** Email signup form: Name, Birth Year, Email, Password, Confirm Password. */
export function SignupForm({ loading, errorMessage, onSubmit }: SignupFormProps) {
  const { control, handleSubmit } = useForm<SignupFormValues>({
    defaultValues: signupDefaults,
    resolver: zodResolver(signupSchema),
    mode: 'onBlur',
  });

  return (
    <YStack gap={16}>
      <FormTextField
        control={control}
        name="name"
        label="Name"
        placeholder="Riya Sharma"
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
      />
      <FormTextField
        control={control}
        name="birthYear"
        label="Birth Year"
        placeholder="1995"
        keyboardType="number-pad"
        maxLength={4}
      />
      <FormTextField
        control={control}
        name="email"
        label="Email"
        placeholder="riya@duncit.com"
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <FormTextField
        control={control}
        name="password"
        label="Password"
        placeholder="Create a password"
        secureTextEntry
        autoComplete="password-new"
        textContentType="newPassword"
      />
      <FormTextField
        control={control}
        name="confirmPassword"
        label="Confirm Password"
        placeholder="Re-enter password"
        secureTextEntry
        autoComplete="password-new"
        textContentType="newPassword"
      />

      {errorMessage ? (
        <Text fontSize={14} color="$danger" testID="signup-error">
          {errorMessage}
        </Text>
      ) : null}

      <PrimaryButton
        testID="signup-submit"
        label="Create account"
        loading={loading}
        onPress={handleSubmit(onSubmit)}
      />
    </YStack>
  );
}
