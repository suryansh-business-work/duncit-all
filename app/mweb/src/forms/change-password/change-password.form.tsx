import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, IconButton, InputAdornment, Stack } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PinOutlinedIcon from '@mui/icons-material/PinOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import RhfTextField from '../components/RhfTextField';
import {
  currentPasswordDefaults,
  currentPasswordSchema,
  newPasswordDefaults,
  newPasswordSchema,
  type CurrentPasswordValues,
  type NewPasswordValues,
} from './change-password.types';
import { useTranslation } from '../../i18n/useTranslation';

interface StepProps<T> {
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (values: T) => Promise<void> | void;
}

const passwordAdornments = (visible: boolean, onToggle: () => void) => ({
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

/** Step 1 — verify the current password to request an OTP. */
export function CurrentPasswordForm({
  loading,
  errorMessage,
  onSubmit,
}: Readonly<StepProps<CurrentPasswordValues>>) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { control, handleSubmit } = useForm<CurrentPasswordValues>({
    defaultValues: currentPasswordDefaults,
    resolver: zodResolver(currentPasswordSchema),
    mode: 'onTouched',
  });

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await onSubmit(values);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : t('mweb.common.somethingWentWrong'));
    }
  });

  return (
    <form noValidate onSubmit={submit}>
      <Stack spacing={1.5}>
        <RhfTextField
          control={control}
          name="current_password"
          type={show ? 'text' : 'password'}
          label={t('mweb.changePassword.currentPassword')}
          required
          placeholder={t('mweb.changePassword.enterYourCurrentPassword')}
          autoComplete="current-password"
          size="small"
          slotProps={{ input: passwordAdornments(show, () => setShow((v) => !v)) }}
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={loading}
          data-testid="change-password-request"
          sx={{ borderRadius: '16px', py: 1.1, fontWeight: 700, textTransform: 'none' }}
        >
          {loading ? 'Sending OTP…' : 'Send OTP'}
        </Button>
        {(submitError || errorMessage) && (
          <Alert severity="error">{submitError || errorMessage}</Alert>
        )}
      </Stack>
    </form>
  );
}

/** Step 2 — OTP + new password (confirmed) to commit the change. */
export function NewPasswordForm({
  loading,
  errorMessage,
  onSubmit,
}: Readonly<StepProps<NewPasswordValues>>) {
  const { t } = useTranslation();
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { control, handleSubmit } = useForm<NewPasswordValues>({
    defaultValues: newPasswordDefaults,
    resolver: zodResolver(newPasswordSchema),
    mode: 'onTouched',
  });

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await onSubmit(values);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : t('mweb.common.somethingWentWrong'));
    }
  });

  return (
    <form noValidate onSubmit={submit}>
      <Stack spacing={1.5}>
        <RhfTextField
          control={control}
          name="otp"
          label="6-digit OTP"
          required
          hint="6-digit code"
          placeholder="123456"
          slotProps={{ input: {
            startAdornment: (
              <InputAdornment position="start">
                <PinOutlinedIcon fontSize="small" />
              </InputAdornment>
            ),
          }, htmlInput: { inputMode: 'numeric', maxLength: 6 } }}
          size="small"
          
        />
        <RhfTextField
          control={control}
          name="new_password"
          type={showPwd ? 'text' : 'password'}
          label={t('mweb.changePassword.newPassword')}
          required
          hint="At least 8 characters"
          placeholder={t('mweb.changePassword.createANewPassword')}
          autoComplete="new-password"
          size="small"
          slotProps={{ input: passwordAdornments(showPwd, () => setShowPwd((v) => !v)) }}
        />
        <RhfTextField
          control={control}
          name="confirm_password"
          type={showConfirm ? 'text' : 'password'}
          label={t('mweb.changePassword.confirmNewPassword')}
          required
          placeholder={t('mweb.changePassword.reEnterNewPassword')}
          autoComplete="new-password"
          size="small"
          slotProps={{ input: passwordAdornments(showConfirm, () => setShowConfirm((v) => !v)) }}
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={loading}
          data-testid="change-password-submit"
          sx={{ borderRadius: '16px', py: 1.1, fontWeight: 700, textTransform: 'none' }}
        >
          {loading ? 'Updating…' : 'Update password'}
        </Button>
        {(submitError || errorMessage) && (
          <Alert severity="error">{submitError || errorMessage}</Alert>
        )}
      </Stack>
    </form>
  );
}
