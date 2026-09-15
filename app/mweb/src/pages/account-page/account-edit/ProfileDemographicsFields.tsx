import { useMemo } from 'react';
import type { Control } from 'react-hook-form';
import { MenuItem, Stack } from '@mui/material';
import { buildProfileDemographicsLabels } from '@duncit/utils';
import RhfTextField from '../../../forms/components/RhfTextField';
import type { AccountEditValues } from './account-edit.types';
import { useTranslation } from '../../../i18n/useTranslation';

const SELECT_SLOT_PROPS = { inputLabel: { shrink: true }, select: { displayEmpty: true } } as const;

/**
 * Gender and Pet Owner single-selects on Edit profile. Options and copy come
 * from @duncit/utils so this and the native twin stay identical (rule 27).
 * Option ids match the native SelectSheet's: `<field>-option-<value>`.
 */
export default function ProfileDemographicsFields({
  control,
}: Readonly<{ control: Control<AccountEditValues> }>) {
  const { t } = useTranslation();
  const labels = useMemo(() => buildProfileDemographicsLabels(t), [t]);

  return (
    <Stack direction="row" spacing={1}>
      <RhfTextField
        control={control}
        name="gender"
        label={labels.genderLabel}
        select
        size="small"
        slotProps={SELECT_SLOT_PROPS}
      >
        <MenuItem value="" disabled>
          {labels.genderPlaceholder}
        </MenuItem>
        {labels.genderOptions.map((option) => (
          <MenuItem key={option.value} value={option.value} data-testid={`gender-option-${option.value}`}>
            {option.label}
          </MenuItem>
        ))}
      </RhfTextField>
      <RhfTextField
        control={control}
        name="pet_owner"
        label={labels.petOwnerLabel}
        select
        size="small"
        slotProps={SELECT_SLOT_PROPS}
      >
        <MenuItem value="" disabled>
          {labels.petOwnerPlaceholder}
        </MenuItem>
        {labels.petOwnerOptions.map((option) => (
          <MenuItem key={option.value} value={option.value} data-testid={`pet_owner-option-${option.value}`}>
            {option.label}
          </MenuItem>
        ))}
      </RhfTextField>
    </Stack>
  );
}
