import { Controller, type Control } from 'react-hook-form';
import { Text, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { PolicyAcceptanceField } from '@/components/policy-acceptance';
import { useTranslation } from '@/hooks/useTranslation';
import type { SignupFormValues } from '../signup.types';

interface Props {
  control: Control<SignupFormValues>;
  /** False until the server has said what must be accepted. */
  policiesAccepted: boolean;
}

/**
 * Step three — the password, and the policies it is created under. Tamagui
 * twin of mWeb's <SecurityStep/>.
 *
 * The acceptance ticks live on this step because it is the one whose button
 * actually creates the account.
 */
export function SecurityStep({ control, policiesAccepted }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <YStack gap={16}>
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
      {policiesAccepted ? null : (
        <Text testID="signup-policies-hint" fontSize={12.5} color="$muted" textAlign="center">
          {t('policyAcceptance.mustAcceptHint')}
        </Text>
      )}
    </YStack>
  );
}
