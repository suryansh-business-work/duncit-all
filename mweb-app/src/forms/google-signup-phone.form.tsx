import { Form, Formik, useFormikContext } from 'formik';
import {
  Alert,
  Autocomplete,
  Button,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { googleSignupSchema } from '../validators/auth';
import FormField from './FormField';
import ResponsiveDialog from '../components/ResponsiveDialog';
import PhoneExtensionField from '../components/PhoneExtensionField';
import { CITY_NAMES, zonesForCity } from '../utils/locations';

export interface GoogleSignupPhoneValues {
  phone_extension: string;
  phone_number: string;
  dob: string;
  city: string;
  zone: string;
}

const DEFAULTS: GoogleSignupPhoneValues = {
  phone_extension: '+91',
  phone_number: '',
  dob: '',
  city: '',
  zone: '',
};

interface Props {
  open: boolean;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: GoogleSignupPhoneValues) => Promise<void>;
}

function PhoneAndLocation() {
  const { values, setFieldValue, touched, errors } =
    useFormikContext<GoogleSignupPhoneValues>();
  return (
    <>
      <Grid item xs={4}>
        <PhoneExtensionField
          value={values.phone_extension}
          onChange={(d) => setFieldValue('phone_extension', d)}
          error={Boolean(touched.phone_extension && errors.phone_extension)}
          helperText={touched.phone_extension ? errors.phone_extension : undefined}
        />
      </Grid>
      <Grid item xs={8}>
        <FormField name="phone_number" label="Phone" />
      </Grid>
      <Grid item xs={12}>
        <FormField
          name="dob"
          type="date"
          label="Date of birth"
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
      <Grid item xs={6}>
        <Autocomplete
          freeSolo
          options={CITY_NAMES}
          value={values.city}
          onChange={(_e, v) => {
            setFieldValue('city', v ?? '');
            setFieldValue('zone', '');
          }}
          onInputChange={(_e, v) => setFieldValue('city', v)}
          renderInput={(params) => (
            <TextField {...params} label="City" size="small" />
          )}
        />
      </Grid>
      <Grid item xs={6}>
        <Autocomplete
          freeSolo
          options={zonesForCity(values.city)}
          value={values.zone}
          onChange={(_e, v) => setFieldValue('zone', v ?? '')}
          onInputChange={(_e, v) => setFieldValue('zone', v)}
          renderInput={(params) => (
            <TextField {...params} label="Zone" size="small" />
          )}
        />
      </Grid>
    </>
  );
}

export default function GoogleSignupPhoneForm({
  open,
  loading,
  error,
  onClose,
  onSubmit,
}: Props) {
  return (
    <Formik
      initialValues={DEFAULTS}
      validationSchema={googleSignupSchema}
      validateOnChange
      validateOnBlur
      onSubmit={async (values) => {
        await onSubmit(values);
      }}
    >
      {({ submitForm }) => (
        <ResponsiveDialog
          open={open}
          onClose={loading ? () => {} : onClose}
          title="Complete Google signup"
          actions={
            <>
              <Button onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                onClick={submitForm}
                variant="contained"
                disabled={loading}
              >
                {loading ? 'Creating…' : 'Create account'}
              </Button>
            </>
          }
        >
          <Form noValidate>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Add your phone number before your account is created.
            </Typography>
            <Stack spacing={0}>
              <Grid container spacing={1.5}>
                <PhoneAndLocation />
              </Grid>
            </Stack>
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Form>
        </ResponsiveDialog>
      )}
    </Formik>
  );
}
