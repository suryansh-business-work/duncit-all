import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Button, CardContent, Grid, Stack, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RhfTextField from '../../../forms/components/RhfTextField';
import MediaPickerField from '../../../components/MediaPickerField';
import PhoneExtensionField from '../../../components/PhoneExtensionField';
import { zodRules } from '../../../forms/validation/zodRules';
import type { AdminProfileFormProps, AdminProfileFormValues } from './admin-profile.types';

export const adminProfileSchema = z.object({
  first_name: zodRules.personName('First name'),
  last_name: zodRules.personName('Last name'),
  phone_extension: zodRules.phoneExtension('Phone code'),
  phone_number: zodRules.phoneNumber('Phone number'),
  country: zodRules.optionalText('Country', 80),
  city: zodRules.optionalText('City', 80),
  zone: zodRules.optionalText('Zone', 80),
  bio: zodRules.optionalText('Bio', 500),
  profile_photo: zodRules.optionalUrl('Profile photo'),
});

export function toAdminProfileInput(values: AdminProfileFormValues) {
  const cast = adminProfileSchema.parse(values);
  return {
    first_name: cast.first_name,
    last_name: cast.last_name,
    phone_extension: cast.phone_extension,
    phone_number: cast.phone_number,
    country: cast.country || undefined,
    city: cast.city || undefined,
    zone: cast.zone || undefined,
    bio: cast.bio || undefined,
    profile_photo: cast.profile_photo || undefined,
  };
}

export default function AdminProfileForm({ initialValues, busy, errorMessage, onSubmit }: Readonly<AdminProfileFormProps>) {
  const { control, handleSubmit, reset, formState } = useForm<AdminProfileFormValues>({
    defaultValues: initialValues,
    resolver: zodResolver(adminProfileSchema),
    mode: 'onChange',
  });

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  const submit = handleSubmit((values) => onSubmit(values));
  const disabled = busy || !formState.isDirty || !formState.isValid;

  return (
    <form noValidate onSubmit={submit}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={700}>Profile Details</Typography>
          <Button type="submit" variant="contained" size="small" startIcon={<SaveIcon />} disabled={disabled}>
            {busy ? 'Saving...' : 'Save Changes'}
          </Button>
        </Stack>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <RhfTextField control={control} name="first_name" label="First name" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <RhfTextField control={control} name="last_name" label="Last name" />
          </Grid>
          <Grid item xs={4} sm={3}>
            <Controller
              control={control}
              name="phone_extension"
              render={({ field, fieldState }) => (
                <PhoneExtensionField
                  value={field.value}
                  onChange={field.onChange}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message ?? ' '}
                  fullWidth
                />
              )}
            />
          </Grid>
          <Grid item xs={8} sm={9}>
            <RhfTextField control={control} name="phone_number" label="Phone number" />
          </Grid>
          <Grid item xs={12} sm={4}>
            <RhfTextField control={control} name="country" label="Country" />
          </Grid>
          <Grid item xs={12} sm={4}>
            <RhfTextField control={control} name="city" label="City" />
          </Grid>
          <Grid item xs={12} sm={4}>
            <RhfTextField control={control} name="zone" label="Zone" />
          </Grid>
          <Grid item xs={12}>
            <Controller
              control={control}
              name="profile_photo"
              render={({ field, fieldState }) => (
                <MediaPickerField
                  label="Profile photo"
                  value={field.value}
                  onChange={field.onChange}
                  helperText={fieldState.error?.message ?? ' '}
                  folder="/admin-profiles"
                />
              )}
            />
          </Grid>
          <Grid item xs={12}>
            <RhfTextField control={control} name="bio" label="Bio" multiline minRows={3} />
          </Grid>
          {errorMessage && <Grid item xs={12}><Alert severity="error">{errorMessage}</Alert></Grid>}
        </Grid>
      </CardContent>
    </form>
  );
}
