import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, IconButton, InputAdornment, Stack } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PinOutlinedIcon from '@mui/icons-material/PinOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import RhfTextField from '../components/RhfTextField';
import {
  resetPasswordDefaults,
  resetPasswordSchema,
  type ResetPasswordValues,
} from './reset-password.types';

interface Props {
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (values: ResetPasswordValues) => Promise<void> | void;
}

const passwordInputProps = (visible: boolean, onToggle: () => void) => ({
  startAdornment: (
    <InputAdornment position="start">
      <LockOutlinedIcon fontSize="small" />
    </InputAdornment>
  ),
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

export default function ResetPasswordForm({ loading, errorMessage, onSubmit }: Readonly<Props>) {
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { control, handleSubmit } = useForm<ResetPasswordValues>({
    defaultValues: resetPasswordDefaults,
    resolver: zodResolver(resetPasswordSchema),
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
          name="otp"
          label="6-digit OTP"
          placeholder="123456"
          inputProps={{ inputMode: 'numeric', maxLength: 6 }}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PinOutlinedIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <RhfTextField
          control={control}
          name="new_password"
          type={showPwd ? 'text' : 'password'}
          label="New password"
          placeholder="Create a new password"
          autoComplete="new-password"
          size="small"
          InputProps={passwordInputProps(showPwd, () => setShowPwd((v) => !v))}
        />
        <RhfTextField
          control={control}
          name="confirm_password"
          type={showConfirmPwd ? 'text' : 'password'}
          label="Confirm new password"
          placeholder="Re-enter new password"
          autoComplete="new-password"
          size="small"
          InputProps={passwordInputProps(showConfirmPwd, () => setShowConfirmPwd((v) => !v))}
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          endIcon={<ArrowForwardIcon />}
          disabled={loading}
          sx={{ borderRadius: 2, py: 1.25, fontWeight: 700, textTransform: 'none' }}
        >
          {loading ? 'Resetting…' : 'Reset password'}
        </Button>
        {(submitError || errorMessage) && <Alert severity="error">{submitError || errorMessage}</Alert>}
      </Stack>
    </form>
  );
}

export type { ResetPasswordValues } from './reset-password.types';
