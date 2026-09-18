import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client/react';
import { Box, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { RhfTextField } from '@duncit/forms';
import { parseApiError } from '@duncit/utils';

import { UPDATE_PET_PROFILE, type PetProfile } from '../../../../graphql/account';
import { useStoreT } from '../../../../i18n';
import { makePetProfileSchema, type PetProfileValues } from './pet-profile.types';

const toValues = (pet: PetProfile | null | undefined): PetProfileValues => ({
  name: pet?.name ?? '',
  species: pet?.species ?? '',
  breed: pet?.breed ?? '',
  age: pet?.age ? String(pet.age) : '',
  bio: pet?.bio ?? '',
});

/** Name, species, breed, age and a line about the pet. */
export function PetProfileForm({ pet }: Readonly<{ pet: PetProfile | null | undefined }>) {
  const { t } = useStoreT();
  const schema = useMemo(() => makePetProfileSchema(t), [t]);
  const [update] = useMutation(UPDATE_PET_PROFILE, { refetchQueries: ['EcommStoreMe'] });
  const { control, handleSubmit, formState } = useForm<PetProfileValues>({ resolver: zodResolver(schema), values: toValues(pet) });
  const submit = handleSubmit(async (values) => {
    try {
      await update({
        variables: {
          input: {
            name: values.name,
            species: values.species,
            breed: values.breed,
            age: values.age ? Number.parseInt(values.age, 10) : null,
            bio: values.bio,
          },
        },
      });
      notifySuccess(t('ecommStore.pet.saved'));
    } catch (error) {
      notifyError(parseApiError(error, t('ecommStore.pet.saveFailed')));
    }
  });
  return (
    <Stack component="form" spacing={1.5} onSubmit={submit} noValidate>
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        <RhfTextField control={control} name="name" label={t('ecommStore.pet.name')} required />
        <RhfTextField control={control} name="species" label={t('ecommStore.pet.species')} hint={t('ecommStore.pet.speciesHint')} />
        <RhfTextField control={control} name="breed" label={t('ecommStore.pet.breed')} />
        <RhfTextField control={control} name="age" label={t('ecommStore.pet.age')} slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 2 } }} />
      </Box>
      <RhfTextField control={control} name="bio" label={t('ecommStore.pet.bio')} multiline minRows={3} />
      <DuncitButton type="submit" variant="contained" loading={formState.isSubmitting} sx={{ alignSelf: 'flex-start' }}>
        {t('ecommStore.pet.save')}
      </DuncitButton>
    </Stack>
  );
}
