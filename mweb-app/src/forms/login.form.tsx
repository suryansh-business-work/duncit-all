import { useState } from 'react';
import { Form, Formik } from 'formik';
import {
  Alert,
  Button,
  IconButton,
  InputAdornment,
  Stack,
  keyframes,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { loginSchema } from '../validators/auth';
import FormField from './FormField';

const fadeUp = keyframes`
  0%   { opacity: 0; transform: translateY(18px); }
  100% { opacity: 1; transform: translateY(0); }
`;

export interface LoginFormValues {
  email: string;
  password: string;
}

interface Props {
  loading?: boolean;
  initialValues?: LoginFormValues;
  errorMessage?: string | null;
  onSubmit: (values: LoginFormValues) => Promise<void> | void;
  submitLabel?: string;
}

const DEFAULTS: LoginFormValues = { email: '', password: '' };

export default function LoginForm({
  loading,
  initialValues,
  errorMessage,
  onSubmit,
  submitLabel = 'Login',
}: Props) {
  const [showPwd, setShowPwd] = useState(false);
  return (
    <Formik
      initialValues={initialValues ?? DEFAULTS}
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
          <Stack
            spacing={1.5}
            sx={{
              '& > *': { animation: `${fadeUp} 0.5s ease-out both` },
              '& > *:nth-of-type(1)': { animationDelay: '0.05s' },
              '& > *:nth-of-type(2)': { animationDelay: '0.12s' },
              '& > *:nth-of-type(3)': { animationDelay: '0.18s' },
            }}
          >
            <FormField
              name="email"
              type="email"
              label="Email"
              placeholder="hello@duncit.com"
              autoComplete="email"
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlinedIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <FormField
              name="password"
              type={showPwd ? 'text' : 'password'}
              label="Password"
              placeholder="Enter password"
              autoComplete="current-password"
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setShowPwd((v) => !v)}
                      edge="end"
                      aria-label="toggle password"
                    >
                      {showPwd ? (
                        <VisibilityOffOutlinedIcon fontSize="small" />
                      ) : (
                        <VisibilityOutlinedIcon fontSize="small" />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              endIcon={<ArrowForwardIcon />}
              disabled={loading}
              sx={{
                borderRadius: 2,
                py: 1.25,
                fontWeight: 700,
                textTransform: 'none',
                boxShadow: '0 8px 20px rgba(255,77,79,0.3)',
                transition: 'transform 0.18s ease',
                '&:hover': { transform: 'translateY(-1px)' },
              }}
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
