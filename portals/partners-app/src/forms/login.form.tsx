import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { zodRules } from './validation/rules';
import RhfTextField from './components/RhfTextField';

const fadeUp = keyframes`
  0%   { opacity: 0; transform: translateY(18px); }
  100% { opacity: 1; transform: translateY(0); }
`;

export const loginFormSchema = z.object({
  email: zodRules.email('Email'),
  password: z.string().min(8, 'Min 8 characters'),
});

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
}: Readonly<Props>) {
  const [showPwd, setShowPwd] = useState(false);
  const { control, handleSubmit, setError, formState } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: initialValues ?? DEFAULTS,
    mode: 'onBlur',
  });
  const rootError = formState.errors.root?.message;

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong';
      setError('root', { message });
    }
  });

  return (
    <Stack
      component="form"
      noValidate
      onSubmit={submit}
      spacing={1.5}
      sx={{
        '& > *': { animation: `${fadeUp} 0.5s ease-out both` },
        '& > *:nth-of-type(1)': { animationDelay: '0.05s' },
        '& > *:nth-of-type(2)': { animationDelay: '0.12s' },
        '& > *:nth-of-type(3)': { animationDelay: '0.18s' },
      }}
    >
      <RhfTextField
        control={control}
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
      <RhfTextField
        control={control}
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
      {(rootError ?? errorMessage) && (
        <Alert severity="error">{rootError ?? errorMessage}</Alert>
      )}
    </Stack>
  );
}
