import { Formik, Form } from 'formik';
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
import { PetProfile, UPDATE_PET, petSchema } from './petQueries';

interface PetFormProps {
  pet?: PetProfile | null;
  onCancel: () => void;
  onSaved: () => void;
}

export default function PetForm({ pet, onCancel, onSaved }: PetFormProps) {
  const [updateMut, { loading, error }] = useMutation(UPDATE_PET);

  const initial = {
    name: pet?.name ?? '',
    species: pet?.species ?? '',
    breed: pet?.breed ?? '',
    age: pet?.age ?? '',
    photo_url: pet?.photo_url ?? '',
    bio: pet?.bio ?? '',
  };

  return (
    <Formik
      initialValues={initial}
      validationSchema={petSchema}
      onSubmit={async (values) => {
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
      }}
    >
      {({ values, errors, touched, handleChange, handleBlur, setFieldValue }) => (
        <Form>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <PetPhotoField
                value={values.photo_url}
                touched={touched.photo_url}
                error={errors.photo_url as string | undefined}
                onChange={(url) => setFieldValue('photo_url', url)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="name"
                label="Pet name"
                value={values.name}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.name && !!errors.name}
                helperText={touched.name && errors.name}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <Autocomplete
                freeSolo
                options={PET_SPECIES_OPTIONS}
                value={values.species}
                onChange={(_e, v) => {
                  setFieldValue('species', v ?? '');
                  setFieldValue('breed', '');
                }}
                onInputChange={(_e, v) => setFieldValue('species', v)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    name="species"
                    label="Species"
                    placeholder="Dog, Cat, …"
                    error={touched.species && !!errors.species}
                    helperText={touched.species && errors.species}
                  />
                )}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <Autocomplete
                freeSolo
                options={Array.from({ length: 31 }, (_, i) => String(i))}
                value={values.age != null ? String(values.age) : ''}
                onChange={(_e, v) => setFieldValue('age', v ? Number(v) : '')}
                onInputChange={(_e, v) => setFieldValue('age', v ? Number(v) : '')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    name="age"
                    label="Age (yrs)"
                    error={touched.age && !!errors.age}
                    helperText={touched.age && (errors.age as string)}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                freeSolo
                options={breedsForSpecies(values.species)}
                value={values.breed}
                onChange={(_e, v) => setFieldValue('breed', v ?? '')}
                onInputChange={(_e, v) => setFieldValue('breed', v)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    name="breed"
                    label="Breed (or type your own)"
                    error={touched.breed && !!errors.breed}
                    helperText={touched.breed && errors.breed}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="bio"
                label="About your pet"
                multiline
                minRows={2}
                value={values.bio}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.bio && !!errors.bio}
                helperText={touched.bio && errors.bio}
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
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? 'Saving…' : 'Save'}
            </Button>
          </Stack>
        </Form>
      )}
    </Formik>
  );
}
