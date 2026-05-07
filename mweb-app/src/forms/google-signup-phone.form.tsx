import { Form, Formik } from 'formik';
import { Alert, Button, Grid, Stack, Typography } from '@mui/material';
import { googleSignupSchema } from '../validators/auth';
import FormField from './FormField';
import ResponsiveDialog from '../components/ResponsiveDialog';

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
            <Grid container spacing={1.5}>
              <Grid item xs={4}>
                <FormField
                  name="phone_extension"
                  label="Code"
                  hint="Country code, e.g. +91."
                />
              </Grid>
              <Grid item xs={8}>
                <FormField
                  name="phone_number"
                  label="Phone"
                  hint="6–15 digits, no spaces."
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
                <FormField name="city" label="City" hint="Optional." />
              </Grid>
              <Grid item xs={6}>
                <FormField name="zone" label="Zone" hint="Optional." />
              </Grid>
            </Grid>
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          </Form>
        </ResponsiveDialog>
      )}
    </Formik>
  );
}
