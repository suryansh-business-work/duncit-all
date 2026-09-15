import { useMemo } from 'react';
import { useController, type Control } from 'react-hook-form';
import { XStack } from 'tamagui';
import { buildProfileDemographicsLabels } from '@duncit/utils';

import { SelectSheet } from '../components/SelectSheet';
import type { AccountEditValues } from './account-edit.types';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Gender and Pet Owner single-selects on Edit profile. Options and copy come
 * from @duncit/utils so this and mWeb's ProfileDemographicsFields stay
 * identical (rule 27). Option ids: `<field>-option-<value>`.
 */
export function ProfileDemographicsFields({
  control,
}: Readonly<{ control: Control<AccountEditValues> }>) {
  const { t } = useTranslation();
  const labels = useMemo(() => buildProfileDemographicsLabels(t), [t]);
  const { field: gender } = useController({ control, name: 'gender' });
  const { field: petOwner } = useController({ control, name: 'pet_owner' });

  const genderText = labels.genderOptions.find((o) => o.value === gender.value)?.label;
  const petOwnerText = labels.petOwnerOptions.find((o) => o.value === petOwner.value)?.label;

  return (
    <XStack gap={12}>
      <SelectSheet
        testID="gender"
        label={labels.genderLabel}
        value={gender.value}
        display={genderText}
        placeholder={labels.genderPlaceholder}
        options={labels.genderOptions}
        onPick={gender.onChange}
      />
      <SelectSheet
        testID="pet_owner"
        label={labels.petOwnerLabel}
        value={petOwner.value}
        display={petOwnerText}
        placeholder={labels.petOwnerPlaceholder}
        options={labels.petOwnerOptions}
        onPick={petOwner.onChange}
      />
    </XStack>
  );
}
