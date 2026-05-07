import { Form, Formik } from 'formik';
import { Alert, Button, Grid, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { registerSchema } from '../validators/auth';
import FormField from './FormField';

export interface RegisterFormValues {
  first_name: string;
  last_name: string;
  email: string;
  phone_extension: string;
  phone_number: string;
  password: string;
  dob: string;
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
  city: '',
  zone: '',
};

interface Props {
  loading?: boolean;
  errorMessage?: string | null;
  initialValues?: RegisterFormValues;
  onSubmit: (values: RegisterFormValues) => Promise<void> | void;
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
                hint="As you'd like it shown to other members."
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <FormField
                name="last_name"
                label="Last name"
                autoComplete="family-name"
                hint="Visible only to you on receipts."
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormField
                name="email"
                type="email"
                label="Email"
                autoComplete="email"
                hint="Used for sign in and pod confirmations."
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={4}>
              <FormField
                name="phone_extension"
                label="Code"
                hint="Country code (e.g. +91)."
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={8}>
              <FormField
                name="phone_number"
                label="Phone"
                autoComplete="tel-national"
                hint="6–15 digits, no spaces."
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormField
                name="password"
                type="password"
                label="Password"
                autoComplete="new-password"
                hint="Minimum 8 characters; mix letters and numbers."
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormField
                name="dob"
                type="date"
                label="Date of birth"
                hint="You must be 18 or older to join."
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <FormField
                name="city"
                label="City (optional)"
                hint="Helps us match local pods."
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <FormField
                name="zone"
                label="Zone (optional)"
                hint="Neighbourhood or area."
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
