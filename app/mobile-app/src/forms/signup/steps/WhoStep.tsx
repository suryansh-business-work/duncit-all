import { YStack } from 'tamagui';
import type { Control } from 'react-hook-form';

import { FormTextField } from '@/components/FormTextField';
import { useTranslation } from '@/hooks/useTranslation';
import { DobYearField } from '../DobYearField';
import type { SignupFormValues } from '../signup.types';

interface Props {
  control: Control<SignupFormValues>;
  minAge: number;
}

/**
 * Step one — who you are: name, birth year, and a friend's code. Tamagui twin
 * of mWeb's <WhoStep/>.
 *
 * The referral code sits here rather than at the end because this is the step
 * a shared link lands on with the code already filled in.
 */
export function WhoStep({ control, minAge }: Readonly<Props>) {
  const { t } = useTranslation();
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
      <DobYearField control={control} minAge={minAge} />
      <FormTextField
        control={control}
        name="referralCode"
        label={t('mweb.signup.referralLabel')}
        placeholder={t('mweb.referral.codePlaceholder')}
        hint={t('mweb.signup.referralHint')}
        autoCapitalize="characters"
      />
    </YStack>
  );
}
