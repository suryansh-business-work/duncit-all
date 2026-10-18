import type { Control } from 'react-hook-form';
import { Text, YStack } from 'tamagui';
import type { GigJobFormValues } from '@duncit/utils';

import { FormTextField } from '@/components/FormTextField';
import { useTranslation } from '@/hooks/useTranslation';
import { ContactSharingNotice } from '../GigNote';

/** The contact an interested freelancer receives — prefilled from the account. mWeb twin: GigContactFields. */
export function GigContactFields({ control }: Readonly<{ control: Control<GigJobFormValues> }>) {
  const { t } = useTranslation();
  return (
    <YStack gap={12}>
      <Text fontSize={15} fontWeight="700" color="$color" role="heading">
        {t('gigJobs.form.contactSection')}
      </Text>
      <FormTextField
        control={control}
        name="contact_name"
        label={t('gigJobs.form.contactName')}
        autoComplete="name"
        required
      />
      <FormTextField
        control={control}
        name="contact_phone"
        label={t('gigJobs.form.contactPhone')}
        keyboardType="phone-pad"
        autoComplete="tel"
        required
      />
      <FormTextField
        control={control}
        name="contact_email"
        label={t('gigJobs.form.contactEmail')}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <ContactSharingNotice />
    </YStack>
  );
}
