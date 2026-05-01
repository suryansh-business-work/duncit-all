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
} from '@mui/material';
import { loginSchema } from '../validators/auth';

const LOGIN = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      user {
        user_id
        first_name
        email
        roles
      }
    }
  }
`;

export default function LoginPage() {
  const [loginMutation, { loading, error }] = useMutation(LOGIN);
  const navigate = useNavigate();

  return (
    <Card elevation={2}>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Login
        </Typography>
        <Formik
          initialValues={{ email: '', password: '' }}
          validationSchema={loginSchema}
          onSubmit={async (values) => {
            const res = await loginMutation({ variables: { input: values } });
            const token = res.data?.login?.token;
            if (token) {
              localStorage.setItem('token', token);
              navigate('/');
            }
          }}
        >
          {({ values, errors, touched, handleChange, handleBlur }) => (
            <Form>
              <Stack spacing={2}>
                <TextField
                  fullWidth name="email" type="email" label="Email"
                  value={values.email} onChange={handleChange} onBlur={handleBlur}
                  error={touched.email && !!errors.email}
                  helperText={touched.email && errors.email}
                />
                <TextField
                  fullWidth name="password" type="password" label="Password"
                  value={values.password} onChange={handleChange} onBlur={handleBlur}
                  error={touched.password && !!errors.password}
                  helperText={touched.password && errors.password}
                />
                <Button type="submit" variant="contained" disabled={loading}>
                  {loading ? 'Signing in…' : 'Login'}
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
