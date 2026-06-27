import { useState } from 'react';
import { z } from 'zod';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, IconButton, InputAdornment, Stack } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import FormField from '../FormField';
import { validationRules } from '../validation/rules';
import { loginInitialValues, type LoginFormValues } from './login.types';

export const loginSchema = z.object({
  email: validationRules.email('Email'),
  password: validationRules.password('Password'),
});

interface Props {
  loading?: boolean;
  initialValues?: LoginFormValues;
  errorMessage?: string | null;
  onSubmit: (values: LoginFormValues) => Promise<void> | void;
  submitLabel?: string;
}

export default function LoginForm({ loading, initialValues, errorMessage, onSubmit, submitLabel = 'Sign in' }: Readonly<Props>) {
  const [showPwd, setShowPwd] = useState(false);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const methods = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
    defaultValues: initialValues ?? loginInitialValues,
  });

  const handle = methods.handleSubmit(async (values) => {
    setStatus(undefined);
    try {
      await onSubmit(values);
    } catch (e: any) {
      setStatus(e?.message ?? 'Something went wrong');
    }
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={handle} noValidate>
        <Stack spacing={1.5}>
          <FormField
            name="email"
            type="email"
            label="Email"
            placeholder="you@duncit.com"
            autoComplete="email"
            hint="Use your Duncit account email."
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
            hint="At least 8 characters."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlinedIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" edge="end" aria-label="toggle password visibility" onClick={() => setShowPwd((v) => !v)}>
                    {showPwd ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button type="submit" variant="contained" size="large" endIcon={<ArrowForwardIcon />} disabled={loading}>
            {loading ? 'Signing in…' : submitLabel}
          </Button>
          {(status || errorMessage) && <Alert severity="error">{status || errorMessage}</Alert>}
        </Stack>
      </form>
    </FormProvider>
  );
}
