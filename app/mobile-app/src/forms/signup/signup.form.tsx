import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Text, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { PolicyAcceptanceField } from '@/components/policy-acceptance';
import { PrimaryButton } from '@/components/PrimaryButton';
import { DobDateField } from '@/forms/account-edit/DobDateField';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useSignupPolicies } from '@/hooks/usePolicies';
import { useTranslation } from '@/hooks/useTranslation';
import { allPoliciesAccepted } from '@/utils/policy-acceptance';
import { PhoneField } from './PhoneField';
import { makeSignupSchema, signupDefaults, type SignupFormValues } from './signup.types';

export interface SignupFormProps {
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (values: SignupFormValues) => void | Promise<void>;
}

/** Email signup form: Name, Date of Birth, Email, Phone, Password, Confirm. */
export function SignupForm({ loading, errorMessage, onSubmit }: Readonly<SignupFormProps>) {
  const { t } = useTranslation();
  const { minSignupAge } = useAppSettings();
  const { policies, loaded } = useSignupPolicies();
  const requiredPolicyIds = useMemo(() => policies.map((policy) => policy.id), [policies]);
  const { datePlaceholder } = useDateFormat();
  const schema = useMemo(
    () => makeSignupSchema(minSignupAge, t, requiredPolicyIds, datePlaceholder),
    [minSignupAge, t, requiredPolicyIds, datePlaceholder],
  );
  const { control, handleSubmit, watch } = useForm<SignupFormValues>({
    defaultValues: signupDefaults,
    resolver: zodResolver(schema),
    mode: 'onBlur',
  });

  // The gate stays shut until the server has said what must be accepted: an
  // empty list is vacuously accepted, which is only true once it has answered.
  const policiesAccepted = loaded && allPoliciesAccepted(policies, watch('acceptedPolicyIds'));

  return (
    <YStack gap={16}>
      <FormTextField
        control={control}
        name="name"
        label={t('mweb.signup.nameLabel')}
        placeholder={t('mweb.signup.namePlaceholder')}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        required
      />
      <DobDateField control={control} minAge={minSignupAge} />
      <FormTextField
        control={control}
        name="email"
        label={t('mweb.auth.emailLabel')}
        placeholder={t('mweb.signup.emailPlaceholder')}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        required
      />
      <PhoneField control={control} />
      <FormTextField
        control={control}
        name="password"
        label={t('mweb.auth.passwordLabel')}
        placeholder={t('mweb.signup.passwordPlaceholder')}
        secureTextEntry
        autoComplete="password-new"
        textContentType="newPassword"
        required
        hint={t('mweb.auth.passwordHint')}
      />
      <FormTextField
        control={control}
        name="confirmPassword"
        label={t('mweb.signup.confirmPasswordLabel')}
        placeholder={t('mweb.signup.confirmPasswordPlaceholder')}
        secureTextEntry
        autoComplete="password-new"
        textContentType="newPassword"
        required
      />

      <FormTextField
        control={control}
        name="referralCode"
        label={t('mweb.referral.codeOptional')}
        placeholder={t('mweb.referral.codePlaceholder')}
        hint={t('mweb.referral.codeHint')}
        autoCapitalize="characters"
      />

      <Controller
        control={control}
        name="acceptedPolicyIds"
        render={({ field, fieldState }) => (
          <PolicyAcceptanceField
            acceptedIds={field.value}
            onChange={field.onChange}
            errorMessage={fieldState.error?.message}
          />
        )}
      />

      {errorMessage ? (
        <Text fontSize={14} color="$danger" testID="signup-error">
          {errorMessage}
        </Text>
      ) : null}

      <PrimaryButton
        testID="signup-submit"
        label={t('mweb.signup.submit')}
        loading={loading}
        disabled={!policiesAccepted}
        onPress={handleSubmit(onSubmit)}
      />
      {policiesAccepted ? null : (
        <Text testID="signup-policies-hint" fontSize={12.5} color="$muted" textAlign="center">
          {t('policyAcceptance.mustAcceptHint')}
        </Text>
      )}
    </YStack>
  );
}
