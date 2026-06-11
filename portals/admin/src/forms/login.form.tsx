import { Form, Formik } from 'formik';
import { Alert, Button, Stack } from '@mui/material';
import { loginSchema } from '../validators/auth';
import FormField from './FormField';

export interface LoginFormValues {
  email: string;
  password: string;
}

const DEFAULTS: LoginFormValues = { email: '', password: '' };

interface Props {
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (values: LoginFormValues) => Promise<void> | void;
  submitLabel?: string;
}

export default function LoginForm({
  loading,
  errorMessage,
  onSubmit,
  submitLabel = 'Sign in',
}: Readonly<Props>) {
  return (
    <Formik
      initialValues={DEFAULTS}
      validationSchema={loginSchema}
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
          <Stack spacing={1.5}>
            <FormField
              name="email"
              type="email"
              label="Email"
              autoComplete="email"
              hint="Use your administrator email."
            />
            <FormField
              name="password"
              type="password"
              label="Password"
              autoComplete="current-password"
              hint="Minimum 8 characters."
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
            >
              {loading ? 'Signing in…' : submitLabel}
            </Button>
            {(status || errorMessage) && (
              <Alert severity="error">{status || errorMessage}</Alert>
            )}
          </Stack>
        </Form>
      )}
    </Formik>
  );
}
