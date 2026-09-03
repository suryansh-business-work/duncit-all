import type { Control, FieldValues, Path } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';
import { buildSignupStepperLabels } from '@duncit/utils';

import { FormTextField } from '@/components/FormTextField';
import { CountryCodeField } from '@/forms/components/CountryCodeField';
import { FormCheckbox } from '@/forms/components/FormCheckbox';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Where the three boxes live in the form this row is bound to.
 *
 * Passed rather than assumed because two different forms render this row — the
 * email signup, whose values also carry a name, an email and a password, and
 * the Google door's number step, whose values are only these three.
 */
export interface WhatsappNumberNames<T extends FieldValues> {
  extension: Path<T>;
  number: Path<T>;
  sameAsMobile: Path<T>;
}

interface Props<T extends FieldValues> {
  control: Control<T>;
  names: WhatsappNumberNames<T>;
}

/**
 * The WhatsApp row: dial code, number, and whether it is the mobile number too.
 * Tamagui twin of mWeb's <WhatsappNumberFields/>.
 *
 * The tick box is the only thing that decides whether a phone number is written
 * to the profile at all. Unticked, the profile phone is left blank on purpose —
 * the person has said the two numbers differ, and filing the WhatsApp one as
 * their mobile would put a number they never gave us on their account.
 */
export function WhatsappNumberFields<T extends FieldValues>({
  control,
  names,
}: Readonly<Props<T>>) {
  const { t } = useTranslation();
  const labels = buildSignupStepperLabels(t);

  return (
    <YStack gap={12}>
      <XStack gap={12} alignItems="flex-start">
        <YStack width={120}>
          <CountryCodeField
            control={control}
            name={names.extension}
            label={t('mweb.common.code')}
            testID="signup-phone-code"
          />
        </YStack>
        <YStack flex={1}>
          <FormTextField
            control={control}
            name={names.number}
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
      <FormCheckbox
        control={control}
        name={names.sameAsMobile}
        label={labels.sameAsMobile}
        testID="signup-same-as-mobile"
      />
      <Text fontSize={12} color="$muted">
        {labels.sameAsMobileHint}
      </Text>
    </YStack>
  );
}
