import { YStack } from 'tamagui';
import type { Control } from 'react-hook-form';

import { FormTextField } from '@/components/FormTextField';
import { useTranslation } from '@/hooks/useTranslation';
import { PhoneField } from '../PhoneField';
import type { SignupFormValues } from '../signup.types';

interface Props {
  control: Control<SignupFormValues>;
}

/**
 * Step two — how we reach you: the WhatsApp number, then the email. Tamagui
 * twin of mWeb's <ContactStep/>.
 *
 * The number leads because it is the one the last step sends a code to.
 */
export function ContactStep({ control }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <YStack gap={16}>
      <PhoneField control={control} />
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
    </YStack>
  );
}
