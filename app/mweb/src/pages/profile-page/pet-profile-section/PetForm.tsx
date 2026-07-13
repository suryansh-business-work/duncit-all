import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client';
import {
  Alert,
  Autocomplete,
  Button,
  Grid,
  Stack,
  TextField,
} from '@mui/material';
import { PET_SPECIES_OPTIONS, breedsForSpecies } from '../../../utils/petBreeds';
import PetPhotoField from './PetPhotoField';
import { PetFormValues, PetProfile, UPDATE_PET, petSchema } from './petQueries';

interface PetFormProps {
  pet?: PetProfile | null;
  onCancel: () => void;
  onSaved: () => void;
}

const AGE_OPTIONS = Array.from({ length: 31 }, (_, i) => String(i));

export default function PetForm({ pet, onCancel, onSaved }: Readonly<PetFormProps>) {
  const [updateMut, { loading, error }] = useMutation(UPDATE_PET);

  const { control, handleSubmit, watch, setValue, formState } = useForm<PetFormValues>({
    resolver: zodResolver(petSchema),
    defaultValues: {
      name: pet?.name ?? '',
      species: pet?.species ?? '',
      breed: pet?.breed ?? '',
      age: pet?.age ?? '',
      photo_url: pet?.photo_url ?? '',
      bio: pet?.bio ?? '',
    },
  });

  const species = watch('species');

  const submit = handleSubmit(async (values) => {
    await updateMut({
      variables: {
        input: {
          name: values.name || null,
          species: values.species || null,
          breed: values.breed || null,
          age: values.age === '' ? null : Number(values.age),
          photo_url: values.photo_url || null,
          bio: values.bio || null,
        },
      },
    });
    onSaved();
  });

  return (
    <form onSubmit={submit}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Controller
            control={control}
            name="photo_url"
            render={({ field, fieldState }) => (
              <PetPhotoField
                value={field.value}
                touched={fieldState.isTouched}
                error={fieldState.error?.message}
                onChange={field.onChange}
              />
            )}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Controller
            control={control}
            name="name"
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                fullWidth
                label="Pet name"
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
              />
            )}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
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
                    label="Species"
                    placeholder="Dog, Cat, …"
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            )}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
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
                    label="Age (yrs)"
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            )}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
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
                    label="Breed (or type your own)"
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            )}
          />
        </Grid>
        <Grid item xs={12}>
          <Controller
            control={control}
            name="bio"
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                fullWidth
                label="About your pet"
                multiline
                minRows={2}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
              />
            )}
          />
        </Grid>
      </Grid>
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error.message}
        </Alert>
      )}
      <Stack direction="row" spacing={1} sx={{ mt: 2 }} justifyContent="flex-end">
        <Button onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={loading || formState.isSubmitting}>
          {loading ? 'Saving…' : 'Save'}
        </Button>
      </Stack>
    </form>
  );
}
