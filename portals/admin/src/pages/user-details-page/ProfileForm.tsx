import { useEffect } from 'react';
import { Alert, Button, CardContent, Grid, MenuItem, Stack, Typography } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import SaveIcon from '@mui/icons-material/Save';
import { RhfTextField } from '@duncit/forms';
import PhoneExtensionField from '../../components/PhoneExtensionField';
import MediaPickerField from '../../components/MediaPickerField';
import AddressFields from './AddressFields';
import type { EditForm } from './queries';
import { userProfileSchema } from './user-profile.form';
import { useTranslation } from '@duncit/shell';

interface Props {
  form: EditForm;
  busy: boolean;
  opError: string | null;
  onSave: (values: EditForm) => void;
}

export default function ProfileForm({ form, busy, opError, onSave }: Readonly<Props>) {
  const { t } = useTranslation();
  const { control, handleSubmit, reset, setValue, watch, formState } = useForm<EditForm>({
    defaultValues: form,
    resolver: zodResolver(userProfileSchema),
    mode: 'onChange',
  });

  useEffect(() => {
    reset(form);
  }, [form, reset]);

  const submit = handleSubmit((values) => onSave(values));
  const setField = (field: keyof EditForm, value: string) =>
    setValue(field, value, { shouldDirty: true, shouldValidate: true });
  const addressError = (key: keyof EditForm) => ({
    error: !!formState.errors[key],
    helperText: formState.errors[key]?.message ?? ' ',
  });

  return (
    <form noValidate onSubmit={submit}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="subtitle1">{t('admin.profile.tab')}</Typography>
          <Button
            type="submit"
            variant="contained"
            size="small"
            startIcon={<SaveIcon />}
            disabled={busy || !formState.isDirty || !formState.isValid}
          >
            {busy ? 'Saving…' : 'Save Changes'}
          </Button>
        </Stack>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <RhfTextField control={control} name="first_name" label={t('shell.profile.firstName')} required />
          </Grid>
          <Grid item xs={12} sm={6}>
            <RhfTextField control={control} name="last_name" label={t('shell.profile.lastName')} required />
          </Grid>
          <Grid item xs={12}>
            <RhfTextField control={control} name="email" type="email" label={t('shell.common.email')} />
          </Grid>
          <Grid item xs={4} sm={3}>
            <Controller
              control={control}
              name="phone_extension"
              render={({ field, fieldState }) => (
                <PhoneExtensionField
                  value={field.value}
                  onChange={(value) => field.onChange(value)}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message ?? ' '}
                  fullWidth
                />
              )}
            />
          </Grid>
          <Grid item xs={8} sm={9}>
            <RhfTextField control={control} name="phone_number" label={t('admin.users.phoneNumber')} required />
          </Grid>
          <AddressFields
            state={watch('state')}
            city={watch('city')}
            pincode={watch('pincode')}
            stateError={addressError('state')}
            cityError={addressError('city')}
            pincodeError={addressError('pincode')}
            setFieldValue={setField}
          />
          <Grid item xs={12} sm={6}>
            <RhfTextField control={control} name="zone" label={t('admin.profile.zone')} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <RhfTextField control={control} name="assigned_city" label={t('admin.profile.assignedCityField')} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <RhfTextField control={control} name="assigned_zones" label={t('admin.profile.assignedZonesField')} />
          </Grid>
          <Grid item xs={12}>
            <Controller
              control={control}
              name="profile_photo"
              render={({ field, fieldState }) => (
                <MediaPickerField
                  label={t('admin.profile.photoUrl')}
                  value={field.value}
                  onChange={(url) => field.onChange(url)}
                  helperText={fieldState.error?.message ?? ' '}
                  folder="/users"
                  showPreview={false}
                />
              )}
            />
          </Grid>
          <Grid item xs={12}>
            <RhfTextField control={control} name="bio" label={t('admin.profile.bio')} multiline minRows={3} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <RhfTextField control={control} name="status" label={t('shell.common.status')} select>
              <MenuItem value="ACTIVE">{t('admin.profile.active')}</MenuItem>
              <MenuItem value="INACTIVE">{t('admin.profile.inactive')}</MenuItem>
              <MenuItem value="SUSPENDED">{t('admin.profile.blocked')}</MenuItem>
            </RhfTextField>
          </Grid>
          {opError && (
            <Grid item xs={12}>
              <Alert severity="error">{opError}</Alert>
            </Grid>
          )}
        </Grid>
      </CardContent>
    </form>
  );
}
