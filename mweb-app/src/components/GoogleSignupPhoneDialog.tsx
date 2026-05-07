import { Form, Formik } from 'formik';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  TextField,
  Typography,
} from '@mui/material';
import { googleSignupSchema } from '../validators/auth';

const initial = {
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
  onSubmit: (values: typeof initial) => Promise<void>;
}

export default function GoogleSignupPhoneDialog({ open, loading, error, onClose, onSubmit }: Props) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <Formik initialValues={initial} validationSchema={googleSignupSchema} onSubmit={onSubmit}>
        {({ values, errors, touched, handleChange, handleBlur }) => (
          <Form noValidate>
            <DialogTitle>Complete Google signup</DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Add your phone number before your account is created.
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <TextField
                    fullWidth
                    name="phone_extension"
                    label="Code"
                    value={values.phone_extension}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.phone_extension && !!errors.phone_extension}
                    helperText={touched.phone_extension && errors.phone_extension}
                  />
                </Grid>
                <Grid item xs={8}>
                  <TextField
                    fullWidth
                    name="phone_number"
                    label="Phone"
                    value={values.phone_number}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.phone_number && !!errors.phone_number}
                    helperText={touched.phone_number && errors.phone_number}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="date"
                    name="dob"
                    label="Date of birth"
                    InputLabelProps={{ shrink: true }}
                    value={values.dob}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.dob && !!errors.dob}
                    helperText={touched.dob && (errors.dob as string)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth name="city" label="City" value={values.city} onChange={handleChange} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth name="zone" label="Zone" value={values.zone} onChange={handleChange} />
                </Grid>
              </Grid>
              {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            </DialogContent>
            <DialogActions>
              <Button onClick={onClose} disabled={loading}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={loading}>{loading ? 'Creating...' : 'Create account'}</Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
}
