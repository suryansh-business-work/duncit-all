import { Form, Formik, useFormikContext } from 'formik';
import {
  Alert,
  Autocomplete,
  Button,
  Grid,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { registerSchema } from '../validators/auth';
import FormField from './FormField';
import PhoneExtensionField from '../components/PhoneExtensionField';
import { COUNTRIES, type Country, findCountryByIso } from '../utils/countries';
import { CITY_NAMES, zonesForCity } from '../utils/locations';

export interface RegisterFormValues {
  first_name: string;
  last_name: string;
  email: string;
  phone_extension: string;
  phone_number: string;
  password: string;
  dob: string;
  country: string;
  city: string;
  zone: string;
}

const DEFAULTS: RegisterFormValues = {
  first_name: '',
  last_name: '',
  email: '',
  phone_extension: '+91',
  phone_number: '',
  password: '',
  dob: '',
  country: 'IN',
  city: '',
  zone: '',
};

interface Props {
  loading?: boolean;
  errorMessage?: string | null;
  initialValues?: RegisterFormValues;
  onSubmit: (values: RegisterFormValues) => Promise<void> | void;
}

function LocationFields() {
  const { values, setFieldValue, touched, errors } =
    useFormikContext<RegisterFormValues>();
  const country = findCountryByIso(values.country) ?? null;
  const zoneOptions = zonesForCity(values.city);
  return (
    <>
      <Grid item xs={12}>
        <Autocomplete<Country>
          value={country}
          onChange={(_e, c) => {
            setFieldValue('country', c?.iso ?? '');
            if (c) setFieldValue('phone_extension', c.dial);
          }}
          options={COUNTRIES}
          autoHighlight
          getOptionLabel={(c) => `${c.flag}  ${c.name}`}
          isOptionEqualToValue={(a, b) => a.iso === b.iso}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Country"
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          )}
        />
      </Grid>
      <Grid item xs={4}>
        <PhoneExtensionField
          value={values.phone_extension}
          onChange={(d) => setFieldValue('phone_extension', d)}
          error={Boolean(touched.phone_extension && errors.phone_extension)}
          helperText={touched.phone_extension ? errors.phone_extension : undefined}
        />
      </Grid>
      <Grid item xs={8}>
        <FormField
          name="phone_number"
          label="Phone"
          autoComplete="tel-national"
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
            <TextField
              {...params}
              label="City (optional)"
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          )}
        />
      </Grid>
      <Grid item xs={6}>
        <Autocomplete
          freeSolo
          options={zoneOptions}
          value={values.zone}
          onChange={(_e, v) => setFieldValue('zone', v ?? '')}
          onInputChange={(_e, v) => setFieldValue('zone', v)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Zone (optional)"
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          )}
        />
      </Grid>
    </>
  );
}

export default function RegisterForm({
  loading,
  errorMessage,
  initialValues,
  onSubmit,
}: Props) {
  return (
    <Formik
      initialValues={initialValues ?? DEFAULTS}
      validationSchema={registerSchema}
      validateOnChange
      validateOnBlur
      onSubmit={async (values, { setStatus }) => {
        setStatus(undefined);
        try {
          await onSubmit(values);
        } catch (e: any) {
          setStatus(e?.message ?? 'Something went wrong');
        }
      }}
    >
      {({ status }) => (
        <Form noValidate>
          <Grid container spacing={1.5}>
            <Grid item xs={6}>
              <FormField
                name="first_name"
                label="First name"
                autoComplete="given-name"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <FormField
                name="last_name"
                label="Last name"
                autoComplete="family-name"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormField
                name="email"
                type="email"
                label="Email"
                autoComplete="email"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <LocationFields />
            <Grid item xs={12}>
              <FormField
                name="password"
                type="password"
                label="Password"
                autoComplete="new-password"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormField
                name="dob"
                type="date"
                label="Date of birth"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Button type="submit" variant="contained" disabled={loading} fullWidth>
              {loading ? 'Creating…' : 'Register'}
            </Button>
            {(status || errorMessage) && (
              <Alert severity="error">{status || errorMessage}</Alert>
            )}
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Already have an account?{' '}
              <Link component={RouterLink} to="/login" underline="hover">
                Sign in
              </Link>
            </Typography>
          </Stack>
        </Form>
      )}
    </Formik>
  );
}
