import { useMemo } from 'react';
import { Grid, MenuItem, TextField } from '@mui/material';
import { buildProfileDemographicsLabels, toGenderValue, toPetOwnerValue } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';

interface Props {
  gender: string | null | undefined;
  isPetOwner: boolean | null | undefined;
}

const READ_ONLY_SLOT_PROPS = { input: { readOnly: true } } as const;

/**
 * Gender and Pet Owner as the member answered them on Edit profile (mWeb or
 * native), shown as the same dropdowns the member picks from. Read-only: they
 * are the member's own answers and UpdateUserInput carries neither. Options and
 * labels come from the same @duncit/utils builder both apps use, so the admin
 * reads exactly what the member picked; an unanswered field stays blank like
 * every other empty profile field here.
 */
export default function ProfileDemographicsReadout({ gender, isPetOwner }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = useMemo(() => buildProfileDemographicsLabels(t), [t]);

  return (
    <>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          select
          fullWidth
          label={labels.genderLabel}
          value={toGenderValue(gender)}
          slotProps={READ_ONLY_SLOT_PROPS}
          data-testid="admin-user-gender"
        >
          {labels.genderOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          select
          fullWidth
          label={labels.petOwnerLabel}
          value={toPetOwnerValue(isPetOwner)}
          slotProps={READ_ONLY_SLOT_PROPS}
          data-testid="admin-user-pet-owner"
        >
          {labels.petOwnerOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
    </>
  );
}
