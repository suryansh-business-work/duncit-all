import { useMemo } from 'react';
import { Grid, TextField } from '@mui/material';
import { buildProfileDemographicsLabels, toGenderValue, toPetOwnerValue } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';

interface Props {
  gender: string | null | undefined;
  isPetOwner: boolean | null | undefined;
}

const READ_ONLY_SLOT_PROPS = { input: { readOnly: true } } as const;

/**
 * Gender and Pet Owner as the member answered them on Edit profile (mWeb or
 * native). Read-only: they are the member's own answers and UpdateUserInput
 * carries neither. Labels come from the same @duncit/utils builder both apps
 * use, so the admin reads exactly the words the member picked; an unanswered
 * field stays blank like every other empty profile field here.
 */
export default function ProfileDemographicsReadout({ gender, isPetOwner }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = useMemo(() => buildProfileDemographicsLabels(t), [t]);
  const genderValue = toGenderValue(gender);
  const petOwnerValue = toPetOwnerValue(isPetOwner);
  const genderText = labels.genderOptions.find((option) => option.value === genderValue)?.label ?? '';
  const petOwnerText = labels.petOwnerOptions.find((option) => option.value === petOwnerValue)?.label ?? '';

  return (
    <>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          fullWidth
          label={labels.genderLabel}
          value={genderText}
          slotProps={READ_ONLY_SLOT_PROPS}
          data-testid="admin-user-gender"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          fullWidth
          label={labels.petOwnerLabel}
          value={petOwnerText}
          slotProps={READ_ONLY_SLOT_PROPS}
          data-testid="admin-user-pet-owner"
        />
      </Grid>
    </>
  );
}
