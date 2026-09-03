import { YStack } from 'tamagui';
import type { Control } from 'react-hook-form';

import { FormTextField } from '@/components/FormTextField';
import { useTranslation } from '@/hooks/useTranslation';
import { WhatsappNumberFields } from '../WhatsappNumberFields';
import type { SignupFormValues } from '../signup.types';

interface Props {
  control: Control<SignupFormValues>;
}

/**
 * Step two — how we reach you: the WhatsApp number, then the email. Tamagui
 * twin of mWeb's <ContactStep/>.
 *
 * The number leads because it is the one the last step sends a code to, and it
 * carries the tick box that decides whether it is filed as the mobile number
 * too — one number is what most people have, and asking for a second box
 * nobody would fill in is worse than asking the question.
 */
export function ContactStep({ control }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <YStack gap={16}>
      <WhatsappNumberFields
        control={control}
        names={{
          extension: 'phoneExtension',
          number: 'phoneNumber',
          sameAsMobile: 'whatsappIsMobile',
        }}
      />
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
