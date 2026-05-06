import { useState } from 'react';
import { Formik, Form } from 'formik';
import * as yup from 'yup';
import { gql, useMutation } from '@apollo/client';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PetsIcon from '@mui/icons-material/Pets';
import EditIcon from '@mui/icons-material/Edit';

const UPDATE_PET = gql`
  mutation UpdateMyPetProfile($input: PetProfileInput!) {
    updateMyPetProfile(input: $input) {
      user_id
      pet_profile {
        name
        species
        breed
        age
        photo_url
        bio
      }
    }
  }
`;

const petSchema = yup.object({
  name: yup.string().max(60).optional(),
  species: yup.string().max(40).optional(),
  breed: yup.string().max(60).optional(),
  age: yup
    .number()
    .typeError('Age must be a number')
    .min(0, 'Age must be 0 or more')
    .max(100, 'Age looks too large')
    .optional(),
  photo_url: yup.string().url('Must be a valid URL').optional(),
  bio: yup.string().max(500, 'Bio must be 500 characters or fewer').optional(),
});

interface PetProfile {
  name?: string | null;
  species?: string | null;
  breed?: string | null;
  age?: number | null;
  photo_url?: string | null;
  bio?: string | null;
}

interface Props {
  pet?: PetProfile | null;
  onSaved?: () => void;
}

export default function PetProfileSection({ pet, onSaved }: Props) {
  const [editing, setEditing] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [updateMut, { loading, error }] = useMutation(UPDATE_PET);

  const initial = {
    name: pet?.name ?? '',
    species: pet?.species ?? '',
    breed: pet?.breed ?? '',
    age: pet?.age ?? '',
    photo_url: pet?.photo_url ?? '',
    bio: pet?.bio ?? '',
  };

  const hasPet = !!(pet && (pet.name || pet.species || pet.bio || pet.photo_url));

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
          <PetsIcon color="primary" />
          <Typography variant="h6" sx={{ flex: 1 }} fontWeight={700}>
            Pet Profile
          </Typography>
          {!editing && (
            <Button
              size="small"
              startIcon={<EditIcon />}
              onClick={() => {
                setSavedMsg(null);
                setEditing(true);
              }}
            >
              {hasPet ? 'Edit' : 'Add pet'}
            </Button>
          )}
        </Stack>

        {!editing ? (
          hasPet ? (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <Avatar
                src={pet?.photo_url || undefined}
                sx={{ width: 72, height: 72, bgcolor: 'primary.light' }}
              >
                <PetsIcon />
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  {pet?.name ?? 'Unnamed pet'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {[pet?.species, pet?.breed, pet?.age != null && `${pet?.age} yrs`]
                    .filter(Boolean)
                    .join(' · ')}
                </Typography>
                {pet?.bio && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {pet.bio}
                  </Typography>
                )}
              </Box>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Tell other members about your pet — they may join your pet-friendly pods.
            </Typography>
          )
        ) : (
          <Formik
            initialValues={initial}
            validationSchema={petSchema}
            onSubmit={async (values) => {
              setSavedMsg(null);
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
              setEditing(false);
              setSavedMsg('Pet profile saved');
              onSaved?.();
            }}
          >
            {({ values, errors, touched, handleChange, handleBlur }) => (
              <Form>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth name="photo_url" label="Pet photo URL"
                      placeholder="https://..."
                      value={values.photo_url} onChange={handleChange} onBlur={handleBlur}
                      error={touched.photo_url && !!errors.photo_url}
                      helperText={(touched.photo_url && errors.photo_url) || 'Optional — link to a square image works best.'}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth name="name" label="Pet name"
                      value={values.name} onChange={handleChange} onBlur={handleBlur}
                      error={touched.name && !!errors.name}
                      helperText={touched.name && errors.name}
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField
                      fullWidth name="species" label="Species"
                      placeholder="Dog, Cat, …"
                      value={values.species} onChange={handleChange} onBlur={handleBlur}
                      error={touched.species && !!errors.species}
                      helperText={touched.species && errors.species}
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField
                      fullWidth name="age" label="Age (yrs)" type="number"
                      value={values.age} onChange={handleChange} onBlur={handleBlur}
                      error={touched.age && !!errors.age}
                      helperText={touched.age && (errors.age as string)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth name="breed" label="Breed"
                      value={values.breed} onChange={handleChange} onBlur={handleBlur}
                      error={touched.breed && !!errors.breed}
                      helperText={touched.breed && errors.breed}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth name="bio" label="About your pet" multiline minRows={2}
                      value={values.bio} onChange={handleChange} onBlur={handleBlur}
                      error={touched.bio && !!errors.bio}
                      helperText={touched.bio && errors.bio}
                    />
                  </Grid>
                </Grid>
                {error && <Alert severity="error" sx={{ mt: 2 }}>{error.message}</Alert>}
                <Stack direction="row" spacing={1} sx={{ mt: 2 }} justifyContent="flex-end">
                  <Button onClick={() => setEditing(false)} disabled={loading}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="contained" disabled={loading}>
                    {loading ? 'Saving…' : 'Save'}
                  </Button>
                </Stack>
              </Form>
            )}
          </Formik>
        )}

        {savedMsg && !editing && (
          <Alert severity="success" sx={{ mt: 2 }} onClose={() => setSavedMsg(null)}>
            {savedMsg}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
