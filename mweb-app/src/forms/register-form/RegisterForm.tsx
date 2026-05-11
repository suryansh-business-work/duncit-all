import { Form, Formik } from 'formik';
import { Alert, Button, Grid, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { registerSchema } from '../../validators/auth';
import FormField from '../FormField';
import LocationFields from './LocationFields';
import DobYearField from './DobYearField';
import { DEFAULTS, type RegisterFormValues } from './types';

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
              <DobYearField />
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

export type { RegisterFormValues } from './types';
