import type { Control, UseFormSetValue } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import type { z } from 'zod';
import { Autocomplete, Grid, TextField } from '@mui/material';
import { PET_SPECIES_OPTIONS, breedsForSpecies } from '../../../../utils/petBreeds';
import type { PetFormValues, petSchema } from '../petQueries';
import { useTranslation } from '../../../../i18n/useTranslation';

type PetFormInput = z.input<typeof petSchema>;

const AGE_OPTIONS = Array.from({ length: 31 }, (_, i) => String(i));

interface PetAutocompleteFieldsProps {
  control: Control<PetFormInput, unknown, PetFormValues>;
  setValue: UseFormSetValue<PetFormInput>;
  species: PetFormInput['species'];
}

/** Species, age and breed — free-solo pickers; a new species clears the breed. */
export default function PetAutocompleteFields({ control, setValue, species }: Readonly<PetAutocompleteFieldsProps>) {
  const { t } = useTranslation();
  return (
    <>
    <Grid
      size={{
        xs: 6,
        sm: 3
      }}>
      <Controller
        control={control}
        name="species"
        render={({ field, fieldState }) => (
          <Autocomplete
            freeSolo
            options={PET_SPECIES_OPTIONS}
            value={field.value}
            onChange={(_e, v) => {
              field.onChange(v ?? '');
              setValue('breed', '');
            }}
            onInputChange={(_e, v) => field.onChange(v)}
            renderInput={(params) => (
              <TextField
                {...params}
                data-testid="pet-form-species"
                label={t('mweb.profile.species')}
                placeholder={t('mweb.profile.dogCat')}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
              />
            )}
          />
        )}
      />
    </Grid>
    <Grid
      size={{
        xs: 6,
        sm: 3
      }}>
      <Controller
        control={control}
        name="age"
        render={({ field, fieldState }) => (
          <Autocomplete
            freeSolo
            options={AGE_OPTIONS}
            value={field.value === '' ? '' : String(field.value)}
            onChange={(_e, v) => field.onChange(v ? Number(v) : '')}
            onInputChange={(_e, v) => field.onChange(v ? Number(v) : '')}
            renderInput={(params) => (
              <TextField
                {...params}
                data-testid="pet-form-age"
                label={t('mweb.profile.ageYrs')}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
              />
            )}
          />
        )}
      />
    </Grid>
    <Grid
      size={{
        xs: 12,
        sm: 6
      }}>
      <Controller
        control={control}
        name="breed"
        render={({ field, fieldState }) => (
          <Autocomplete
            freeSolo
            options={breedsForSpecies(species)}
            value={field.value}
            onChange={(_e, v) => field.onChange(v ?? '')}
            onInputChange={(_e, v) => field.onChange(v)}
            renderInput={(params) => (
              <TextField
                {...params}
                data-testid="pet-form-breed"
                label={t('mweb.profile.breedOrTypeYourOwn')}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
              />
            )}
          />
        )}
      />
    </Grid>
    </>
  );
}
