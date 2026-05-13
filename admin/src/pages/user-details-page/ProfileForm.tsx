import {
  Alert,
  Button,
  CardContent,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Form, Formik, type FormikErrors, type FormikTouched } from 'formik';
import PhoneExtensionField from '../../components/PhoneExtensionField';
import SaveIcon from '@mui/icons-material/Save';
import MediaPickerField from '../../components/MediaPickerField';
import type { EditForm } from './queries';
import { userProfileSchema } from './user-profile.form';

interface Props {
  form: EditForm;
  busy: boolean;
  opError: string | null;
  onSave: (values: EditForm) => void;
}

function showError(
  values: EditForm,
  errors: FormikErrors<EditForm>,
  touched: FormikTouched<EditForm>,
  submitCount: number,
  key: keyof EditForm
) {
  const value = values[key];
  return Boolean(errors[key] && (submitCount > 0 || touched[key] || String(value ?? '').length > 0));
}

export default function ProfileForm({ form, busy, opError, onSave }: Props) {
  return (
    <Formik<EditForm>
      initialValues={form}
      enableReinitialize
      validationSchema={userProfileSchema}
      validateOnBlur
      validateOnChange
      validateOnMount
      onSubmit={(values) => onSave(values)}
    >
      {({ values, errors, touched, submitCount, dirty, isValid, handleBlur, handleChange, setFieldValue }) => (
        <Form noValidate>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="subtitle1">Profile</Typography>
              <Button
                type="submit"
                variant="contained"
                size="small"
                startIcon={<SaveIcon />}
                disabled={busy || !dirty || !isValid}
              >
                {busy ? 'Saving…' : 'Save Changes'}
              </Button>
            </Stack>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField label="First name" name="first_name" value={values.first_name} onChange={handleChange} onBlur={handleBlur} error={showError(values, errors, touched, submitCount, 'first_name')} helperText={showError(values, errors, touched, submitCount, 'first_name') ? errors.first_name : ' '} fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Last name" name="last_name" value={values.last_name} onChange={handleChange} onBlur={handleBlur} error={showError(values, errors, touched, submitCount, 'last_name')} helperText={showError(values, errors, touched, submitCount, 'last_name') ? errors.last_name : ' '} fullWidth />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Email" name="email" type="email" value={values.email} onChange={handleChange} onBlur={handleBlur} error={showError(values, errors, touched, submitCount, 'email')} helperText={showError(values, errors, touched, submitCount, 'email') ? errors.email : ' '} fullWidth />
              </Grid>
              <Grid item xs={4} sm={3}>
                <PhoneExtensionField value={values.phone_extension} onChange={(value) => setFieldValue('phone_extension', value)} error={showError(values, errors, touched, submitCount, 'phone_extension')} helperText={showError(values, errors, touched, submitCount, 'phone_extension') ? errors.phone_extension : ' '} fullWidth />
              </Grid>
              <Grid item xs={8} sm={9}>
                <TextField label="Phone number" name="phone_number" value={values.phone_number} onChange={handleChange} onBlur={handleBlur} error={showError(values, errors, touched, submitCount, 'phone_number')} helperText={showError(values, errors, touched, submitCount, 'phone_number') ? errors.phone_number : ' '} fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="City" name="city" value={values.city} onChange={handleChange} onBlur={handleBlur} error={showError(values, errors, touched, submitCount, 'city')} helperText={showError(values, errors, touched, submitCount, 'city') ? errors.city : ' '} fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Zone" name="zone" value={values.zone} onChange={handleChange} onBlur={handleBlur} error={showError(values, errors, touched, submitCount, 'zone')} helperText={showError(values, errors, touched, submitCount, 'zone') ? errors.zone : ' '} fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Assigned city (admin scope)" name="assigned_city" value={values.assigned_city} onChange={handleChange} onBlur={handleBlur} error={showError(values, errors, touched, submitCount, 'assigned_city')} helperText={showError(values, errors, touched, submitCount, 'assigned_city') ? errors.assigned_city : ' '} fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Assigned zones (comma-separated)" name="assigned_zones" value={values.assigned_zones} onChange={handleChange} onBlur={handleBlur} error={showError(values, errors, touched, submitCount, 'assigned_zones')} helperText={showError(values, errors, touched, submitCount, 'assigned_zones') ? errors.assigned_zones : ' '} fullWidth />
              </Grid>
              <Grid item xs={12}>
                <MediaPickerField label="Profile photo URL" value={values.profile_photo} onChange={(url) => setFieldValue('profile_photo', url)} helperText={showError(values, errors, touched, submitCount, 'profile_photo') ? errors.profile_photo : ' '} folder="/users" showPreview={false} />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Bio" name="bio" value={values.bio} onChange={handleChange} onBlur={handleBlur} error={showError(values, errors, touched, submitCount, 'bio')} helperText={showError(values, errors, touched, submitCount, 'bio') ? errors.bio : ' '} fullWidth multiline minRows={3} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Status" name="status" select value={values.status} onChange={handleChange} onBlur={handleBlur} error={showError(values, errors, touched, submitCount, 'status')} helperText={showError(values, errors, touched, submitCount, 'status') ? errors.status : ' '} fullWidth>
                  <MenuItem value="ACTIVE">Active</MenuItem>
                  <MenuItem value="INACTIVE">Inactive</MenuItem>
                  <MenuItem value="SUSPENDED">Blocked</MenuItem>
                </TextField>
              </Grid>
              {opError && <Grid item xs={12}><Alert severity="error">{opError}</Alert></Grid>}
            </Grid>
          </CardContent>
        </Form>
      )}
    </Formik>
  );
}
