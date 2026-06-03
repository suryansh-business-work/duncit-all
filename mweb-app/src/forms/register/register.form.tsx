import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, InputAdornment, Link, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { Link as RouterLink } from 'react-router-dom';
import RhfTextField from '../components/RhfTextField';
import DobYearField from './DobYearField';
import { registerDefaults, registerSchema, type RegisterFormValues } from './register.types';

interface Props {
  loading?: boolean;
  errorMessage?: string | null;
  initialValues?: RegisterFormValues;
  onSubmit: (values: RegisterFormValues) => Promise<void> | void;
}

const startIcon = (icon: React.ReactNode) => ({
  startAdornment: <InputAdornment position="start">{icon}</InputAdornment>,
});

export default function RegisterForm({ loading, errorMessage, initialValues, onSubmit }: Props) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { control, handleSubmit } = useForm<RegisterFormValues>({
    defaultValues: initialValues ?? registerDefaults,
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
  });

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await onSubmit(values);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Something went wrong');
    }
  });

  return (
    <form noValidate onSubmit={submit}>
      <Stack spacing={1.5}>
        <RhfTextField
          control={control}
          name="name"
          label="Name"
          placeholder="Riya Sharma"
          autoComplete="name"
          size="small"
          InputLabelProps={{ shrink: true }}
          InputProps={startIcon(<PersonOutlineIcon fontSize="small" />)}
        />
        <RhfTextField
          control={control}
          name="email"
          type="email"
          label="Email"
          placeholder="riya@gmail.com"
          autoComplete="email"
          size="small"
          InputLabelProps={{ shrink: true }}
          InputProps={startIcon(<EmailOutlinedIcon fontSize="small" />)}
        />
        <DobYearField control={control} />
        <RhfTextField
          control={control}
          name="password"
          type="password"
          label="Password"
          placeholder="Create password"
          autoComplete="new-password"
          size="small"
          InputLabelProps={{ shrink: true }}
          InputProps={startIcon(<LockOutlinedIcon fontSize="small" />)}
        />
        <RhfTextField
          control={control}
          name="confirmPassword"
          type="password"
          label="Confirm Password"
          placeholder="Re-enter password"
          autoComplete="new-password"
          size="small"
          InputLabelProps={{ shrink: true }}
          InputProps={startIcon(<LockOutlinedIcon fontSize="small" />)}
        />
      </Stack>
      <Stack spacing={2} sx={{ mt: 2 }}>
        <Button
          type="submit"
          variant="contained"
          disabled={loading}
          fullWidth
          endIcon={<ArrowForwardIcon />}
        >
          {loading ? 'Creating…' : 'Create account'}
        </Button>
        {(submitError || errorMessage) && <Alert severity="error">{submitError || errorMessage}</Alert>}
        <Typography variant="body2" color="text.secondary" textAlign="center">
          Already have an account?{' '}
          <Link component={RouterLink} to="/login" underline="hover">
            Sign in
          </Link>
        </Typography>
      </Stack>
    </form>
  );
}

export type { RegisterFormValues } from './register.types';
