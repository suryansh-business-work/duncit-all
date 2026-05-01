import { Formik, Form } from 'formik';
import { gql, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
  Grid,
} from '@mui/material';
import { registerSchema } from '../validators/auth';

const REGISTER = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      token
      user {
        user_id
        first_name
        last_name
        email
        roles
      }
    }
  }
`;

const initial = {
  first_name: '',
  last_name: '',
  email: '',
  phone_number: '',
  phone_extension: '+91',
  password: '',
  dob: '',
  city: '',
  zone: '',
};

export default function RegisterPage() {
  const [registerMutation, { loading, error }] = useMutation(REGISTER);
  const navigate = useNavigate();

  return (
    <Card elevation={2}>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Create Account
        </Typography>
        <Formik
          initialValues={initial}
          validationSchema={registerSchema}
          onSubmit={async (values) => {
            const res = await registerMutation({
              variables: {
                input: { ...values, dob: new Date(values.dob).toISOString() },
              },
            });
            const token = res.data?.register?.token;
            if (token) {
              localStorage.setItem('token', token);
              navigate('/');
            }
          }}
        >
          {({ values, errors, touched, handleChange, handleBlur }) => (
            <Form>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth name="first_name" label="First name"
                    value={values.first_name} onChange={handleChange} onBlur={handleBlur}
                    error={touched.first_name && !!errors.first_name}
                    helperText={touched.first_name && errors.first_name}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth name="last_name" label="Last name"
                    value={values.last_name} onChange={handleChange} onBlur={handleBlur}
                    error={touched.last_name && !!errors.last_name}
                    helperText={touched.last_name && errors.last_name}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth name="email" type="email" label="Email"
                    value={values.email} onChange={handleChange} onBlur={handleBlur}
                    error={touched.email && !!errors.email}
                    helperText={touched.email && errors.email}
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    fullWidth name="phone_extension" label="Code"
                    value={values.phone_extension} onChange={handleChange} onBlur={handleBlur}
                    error={touched.phone_extension && !!errors.phone_extension}
                    helperText={touched.phone_extension && errors.phone_extension}
                  />
                </Grid>
                <Grid item xs={8}>
                  <TextField
                    fullWidth name="phone_number" label="Phone"
                    value={values.phone_number} onChange={handleChange} onBlur={handleBlur}
                    error={touched.phone_number && !!errors.phone_number}
                    helperText={touched.phone_number && errors.phone_number}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth name="password" type="password" label="Password"
                    value={values.password} onChange={handleChange} onBlur={handleBlur}
                    error={touched.password && !!errors.password}
                    helperText={touched.password && errors.password}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth name="dob" type="date" label="Date of birth"
                    InputLabelProps={{ shrink: true }}
                    value={values.dob} onChange={handleChange} onBlur={handleBlur}
                    error={touched.dob && !!errors.dob}
                    helperText={touched.dob && (errors.dob as string)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth name="city" label="City (optional)"
                    value={values.city} onChange={handleChange} onBlur={handleBlur}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth name="zone" label="Zone (optional)"
                    value={values.zone} onChange={handleChange} onBlur={handleBlur}
                  />
                </Grid>
              </Grid>
              <Stack spacing={2} sx={{ mt: 3 }}>
                <Button type="submit" variant="contained" disabled={loading} fullWidth>
                  {loading ? 'Creating…' : 'Register'}
                </Button>
                {error && <Alert severity="error">{error.message}</Alert>}
              </Stack>
            </Form>
          )}
        </Formik>
      </CardContent>
    </Card>
  );
}
