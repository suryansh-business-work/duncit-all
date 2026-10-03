import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, InputAdornment, Stack } from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '../../../../i18n/useTranslation';
import {
  currentPasswordDefaults,
  makeCurrentPasswordSchema,
  makeNewPasswordSchema,
  newPasswordDefaults,
  type CurrentPasswordValues,
  type NewPasswordValues,
  type PasswordStepProps,
} from './change-password.types';

/** The eye button that shows or hides one password box. */
function useReveal(testId: string) {
  const { t } = useTranslation();
  const [shown, setShown] = useState(false);
  const adornment = {
    endAdornment: (
      <InputAdornment position="end">
        <DuncitIconButton
          data-testid={testId}
          size="small"
          edge="end"
          onClick={() => setShown((v) => !v)}
          aria-label={shown ? t('shell.profile.security.hidePassword') : t('shell.profile.security.showPassword')}
        >
          {shown ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
        </DuncitIconButton>
      </InputAdornment>
    ),
  };
  return { type: shown ? 'text' : 'password', slotProps: { input: adornment } };
}

/** Runs a step, turning a thrown Error into the message under the form. */
function useStepSubmit<T>(onSubmit: (values: T) => Promise<void>) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const submit = async (values: T) => {
    setError(null);
    try {
      await onSubmit(values);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('shell.profile.genericError'));
    }
  };
  return { error, submit };
}

/** Step 1 — prove the current password; an OTP is emailed on success. */
export function CurrentPasswordForm({ loading, onSubmit }: Readonly<PasswordStepProps<CurrentPasswordValues>>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeCurrentPasswordSchema(t), [t]);
  const reveal = useReveal('current-password-toggle');
  const step = useStepSubmit(onSubmit);
  const { control, handleSubmit } = useForm<CurrentPasswordValues>({
    defaultValues: currentPasswordDefaults,
    resolver: zodResolver(schema),
    mode: 'onTouched',
  });

  return (
    <form noValidate onSubmit={handleSubmit(step.submit)}>
      <Stack spacing={1.5}>
        <RhfTextField
          control={control}
          name="current_password"
          label={t('shell.profile.security.currentPassword')}
          autoComplete="current-password"
          required
          size="small"
          {...reveal}
        />
        <DuncitButton type="submit" variant="contained" disabled={loading} data-testid="current-password-submit">
          {loading ? t('shell.profile.security.sendingCode') : t('shell.profile.security.sendCode')}
        </DuncitButton>
        {step.error && <Alert data-testid="current-password-error" severity="error">{step.error}</Alert>}
      </Stack>
    </form>
  );
}

/** Step 2 — the emailed code and the new password, typed twice. */
export function NewPasswordForm({ loading, onSubmit }: Readonly<PasswordStepProps<NewPasswordValues>>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeNewPasswordSchema(t), [t]);
  const revealNew = useReveal('new-password-toggle');
  const revealConfirm = useReveal('confirm-password-toggle');
  const step = useStepSubmit(onSubmit);
  const { control, handleSubmit } = useForm<NewPasswordValues>({
    defaultValues: newPasswordDefaults,
    resolver: zodResolver(schema),
    mode: 'onTouched',
  });

  return (
    <form noValidate onSubmit={handleSubmit(step.submit)}>
      <Stack spacing={1.5}>
        <RhfTextField
          control={control}
          name="otp"
          label={t('shell.profile.security.otp')}
          autoComplete="one-time-code"
          required
          size="small"
          slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 6 } }}
        />
        <RhfTextField
          control={control}
          name="new_password"
          label={t('shell.profile.security.newPassword')}
          hint={t('shell.profile.security.newPasswordHint')}
          autoComplete="new-password"
          required
          size="small"
          {...revealNew}
        />
        <RhfTextField
          control={control}
          name="confirm_password"
          label={t('shell.profile.security.confirmPassword')}
          autoComplete="new-password"
          required
          size="small"
          {...revealConfirm}
        />
        <DuncitButton type="submit" variant="contained" disabled={loading} data-testid="new-password-submit">
          {loading ? t('shell.common.saving') : t('shell.profile.security.updatePassword')}
        </DuncitButton>
        {step.error && <Alert data-testid="new-password-error" severity="error">{step.error}</Alert>}
      </Stack>
    </form>
  );
}
