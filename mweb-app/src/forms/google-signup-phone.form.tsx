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
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { subYears } from 'date-fns';
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

function DobYearField() {
  const { values, setFieldValue, touched, errors, setFieldTouched } =
    useFormikContext<GoogleSignupPhoneValues>();
  const value = values.dob ? new Date(values.dob) : null;
  const minDate = subYears(new Date(), 100);
  const maxDate = subYears(new Date(), 13);
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <DatePicker
        label="Birth year"
        views={['year']}
        openTo="year"
        value={value}
        minDate={minDate}
        maxDate={maxDate}
        onChange={(d) => {
          setFieldTouched('dob', true, false);
          if (!d || Number.isNaN((d as Date).getTime())) {
            setFieldValue('dob', '');
          } else {
            const y = (d as Date).getFullYear();
            setFieldValue('dob', `${y}-01-01`);
          }
        }}
        slotProps={{
          textField: {
            size: 'small',
            fullWidth: true,
            InputLabelProps: { shrink: true },
            error: Boolean(touched.dob && errors.dob),
            helperText: (touched.dob && errors.dob) || ' ',
          },
        }}
      />
    </LocalizationProvider>
  );
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
        <DobYearField />
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
