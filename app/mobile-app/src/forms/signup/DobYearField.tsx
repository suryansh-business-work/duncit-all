import { Controller, type Control } from 'react-hook-form';
import { Text, YStack } from 'tamagui';
import { latestEligibleBirthYear } from '@duncit/datetime';

import { SelectSheet } from '@/forms/components/SelectSheet';
import { useTranslation } from '@/hooks/useTranslation';
import type { SignupFormValues } from './signup.types';

interface Props {
  control: Control<SignupFormValues>;
  /** Admin-configured minimum joining age (Admin > Settings). */
  minAge: number;
}

/** Oldest year offered — a floor for the list, not a rule. */
const OLDEST_YEARS = 120;

/**
 * The birth-YEAR picker. Tamagui twin of mWeb's <DobYearField/>.
 *
 * A searchable list rather than a calendar, because signup asks for a year and
 * the sheet already filters as you type — which is what makes 120 options
 * usable on a phone. The list cannot reach an ineligible year, so the age rule
 * is a second line of defence rather than the first thing a new member is told
 * off by; the schema still re-checks it, which catches a value that never came
 * from here.
 */
export function DobYearField({ control, minAge }: Readonly<Props>) {
  const { t } = useTranslation();
  const newest = latestEligibleBirthYear(minAge);
  // Newest first: a new member is far likelier to be 20 than 90.
  const options = Array.from({ length: OLDEST_YEARS }, (_, i) => {
    const year = String(newest - i);
    return { label: year, value: year };
  });

  return (
    <Controller
      control={control}
      name="dobYear"
      render={({ field, fieldState }) => (
        <YStack gap={4}>
          <SelectSheet
            testID="signup-dob-year"
            label={t('mweb.signup.dobYearLabel')}
            placeholder={t('mweb.signup.dobYearLabel')}
            options={options}
            value={field.value}
            onPick={field.onChange}
            error={fieldState.error?.message}
          />
          {fieldState.error ? null : (
            <Text fontSize={12} color="$muted">
              {t('mweb.signup.dobYearHint', { vars: { years: minAge } })}
            </Text>
          )}
        </YStack>
      )}
    />
  );
}
