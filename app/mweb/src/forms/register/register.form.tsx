import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, IconButton, InputAdornment, Link, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { Link as RouterLink } from 'react-router-dom';
import RhfTextField from '../components/RhfTextField';
import DobYearField from './DobYearField';
import { makeRegisterSchema, registerDefaults, type RegisterFormValues } from './register.types';
import { useSignupBirthYearBounds } from '../../utils/dateFormat';

interface Props {
  loading?: boolean;
  errorMessage?: string | null;
  initialValues?: RegisterFormValues;
  onSubmit: (values: RegisterFormValues) => Promise<void> | void;
}

const startIcon = (icon: React.ReactNode) => ({
  startAdornment: <InputAdornment position="start">{icon}</InputAdornment>,
});

const passwordInputProps = (visible: boolean, onToggle: () => void) => ({
  ...startIcon(<LockOutlinedIcon fontSize="small" />),
  endAdornment: (
    <InputAdornment position="end">
      <IconButton
        size="small"
        onClick={onToggle}
        edge="end"
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? (
          <VisibilityOffOutlinedIcon fontSize="small" />
        ) : (
          <VisibilityOutlinedIcon fontSize="small" />
        )}
      </IconButton>
    </InputAdornment>
  ),
});

export default function RegisterForm({ loading, errorMessage, initialValues, onSubmit }: Readonly<Props>) {
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { minBirthYear, maxBirthYear } = useSignupBirthYearBounds();
  const schema = useMemo(
    () => makeRegisterSchema(minBirthYear, maxBirthYear),
    [minBirthYear, maxBirthYear],
  );
  const { control, handleSubmit } = useForm<RegisterFormValues>({
    defaultValues: initialValues ?? registerDefaults,
    resolver: zodResolver(schema),
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
          required
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
          required
          placeholder="riya@gmail.com"
          autoComplete="email"
          size="small"
          InputLabelProps={{ shrink: true }}
          InputProps={startIcon(<EmailOutlinedIcon fontSize="small" />)}
        />
        <DobYearField control={control} minYear={minBirthYear} maxYear={maxBirthYear} />
        <RhfTextField
          control={control}
          name="password"
          type={showPwd ? 'text' : 'password'}
          label="Password"
          required
          hint="At least 8 characters"
          placeholder="Create password"
          autoComplete="new-password"
          size="small"
          InputLabelProps={{ shrink: true }}
          InputProps={passwordInputProps(showPwd, () => setShowPwd((v) => !v))}
        />
        <RhfTextField
          control={control}
          name="confirmPassword"
          type={showConfirmPwd ? 'text' : 'password'}
          label="Confirm Password"
          required
          placeholder="Re-enter password"
          autoComplete="new-password"
          size="small"
          InputLabelProps={{ shrink: true }}
          InputProps={passwordInputProps(showConfirmPwd, () => setShowConfirmPwd((v) => !v))}
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
