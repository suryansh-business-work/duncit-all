import type { Control } from 'react-hook-form';
import { XStack, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { CountryCodeField } from '@/forms/components/CountryCodeField';
import { useTranslation } from '@/hooks/useTranslation';
import type { SignupFormValues } from './signup.types';

interface Props {
  control: Control<SignupFormValues>;
}

/**
 * Signup's phone row: the dial code leads, the number follows.
 *
 * Shaped exactly like the profile editor's contact row so the two places a
 * number is typed in the app look the same. Its mWeb twin is
 * app/mweb/src/forms/register/PhoneField.tsx — same rules, separate views.
 */
export function PhoneField({ control }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <XStack gap={12} alignItems="flex-start">
      <YStack width={120}>
        <CountryCodeField
          control={control}
          name="phoneExtension"
          label={t('mweb.common.code')}
          testID="signup-phone-code"
        />
      </YStack>
      <YStack flex={1}>
        <FormTextField
          control={control}
          name="phoneNumber"
          label={t('mweb.signup.whatsappLabel')}
          placeholder={t('mweb.signup.phonePlaceholder')}
          hint={t('mweb.signup.whatsappHint')}
          keyboardType="phone-pad"
          digitsOnly
          autoComplete="tel"
          textContentType="telephoneNumber"
          maxLength={15}
          required
        />
      </YStack>
    </XStack>
  );
}
