import * as yup from 'yup';
import { Form, Formik, type FormikErrors, type FormikTouched } from 'formik';
import { Alert, Button, CardContent, Grid, Stack, TextField, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import MediaPickerField from '../../../components/MediaPickerField';
import PhoneExtensionField from '../../../components/PhoneExtensionField';
import { validationRules } from '../../../forms/validation/rules';
import type { AdminProfileFormProps, AdminProfileFormValues } from './admin-profile.types';

export const adminProfileSchema: yup.ObjectSchema<AdminProfileFormValues> = yup.object({
  first_name: validationRules.personName('First name'),
  last_name: validationRules.personName('Last name'),
  phone_extension: validationRules.phoneExtension('Phone code'),
  phone_number: validationRules.phoneNumber('Phone number'),
  country: validationRules.optionalText('Country', 80),
  city: validationRules.optionalText('City', 80),
  zone: validationRules.optionalText('Zone', 80),
  bio: validationRules.optionalText('Bio', 500),
  profile_photo: validationRules.optionalUrl('Profile photo'),
});

function showError(
  values: AdminProfileFormValues,
  errors: FormikErrors<AdminProfileFormValues>,
  touched: FormikTouched<AdminProfileFormValues>,
  submitCount: number,
  key: keyof AdminProfileFormValues
) {
  const value = values[key];
  return Boolean(errors[key] && (submitCount > 0 || touched[key] || String(value ?? '').length > 0));
}

export function toAdminProfileInput(values: AdminProfileFormValues) {
  const cast = adminProfileSchema.cast(values, { stripUnknown: true });
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
  return (
    <Formik<AdminProfileFormValues>
      initialValues={initialValues}
      enableReinitialize
      validationSchema={adminProfileSchema}
      validateOnBlur
      validateOnChange
      onSubmit={(values) => onSubmit(values)}
    >
      {({ values, errors, touched, submitCount, dirty, isValid, handleBlur, handleChange, setFieldValue }) => {
        const error = (key: keyof AdminProfileFormValues) => showError(values, errors, touched, submitCount, key);
        const helper = (key: keyof AdminProfileFormValues) => (error(key) ? errors[key] : ' ');
        return (
          <Form noValidate>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={700}>Profile Details</Typography>
                <Button type="submit" variant="contained" size="small" startIcon={<SaveIcon />} disabled={busy || !dirty || !isValid}>
                  {busy ? 'Saving...' : 'Save Changes'}
                </Button>
              </Stack>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField label="First name" name="first_name" value={values.first_name} onChange={handleChange} onBlur={handleBlur} error={error('first_name')} helperText={helper('first_name')} fullWidth />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Last name" name="last_name" value={values.last_name} onChange={handleChange} onBlur={handleBlur} error={error('last_name')} helperText={helper('last_name')} fullWidth />
                </Grid>
                <Grid item xs={4} sm={3}>
                  <PhoneExtensionField value={values.phone_extension} onChange={(value) => setFieldValue('phone_extension', value)} error={error('phone_extension')} helperText={helper('phone_extension')} fullWidth />
                </Grid>
                <Grid item xs={8} sm={9}>
                  <TextField label="Phone number" name="phone_number" value={values.phone_number} onChange={handleChange} onBlur={handleBlur} error={error('phone_number')} helperText={helper('phone_number')} fullWidth />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField label="Country" name="country" value={values.country} onChange={handleChange} onBlur={handleBlur} error={error('country')} helperText={helper('country')} fullWidth />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField label="City" name="city" value={values.city} onChange={handleChange} onBlur={handleBlur} error={error('city')} helperText={helper('city')} fullWidth />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField label="Zone" name="zone" value={values.zone} onChange={handleChange} onBlur={handleBlur} error={error('zone')} helperText={helper('zone')} fullWidth />
                </Grid>
                <Grid item xs={12}>
                  <MediaPickerField label="Profile photo" value={values.profile_photo} onChange={(url) => setFieldValue('profile_photo', url)} helperText={helper('profile_photo')} folder="/admin-profiles" />
                </Grid>
                <Grid item xs={12}>
                  <TextField label="Bio" name="bio" value={values.bio} onChange={handleChange} onBlur={handleBlur} error={error('bio')} helperText={helper('bio')} fullWidth multiline minRows={3} />
                </Grid>
                {errorMessage && <Grid item xs={12}><Alert severity="error">{errorMessage}</Alert></Grid>}
              </Grid>
            </CardContent>
          </Form>
        );
      }}
    </Formik>
  );
}