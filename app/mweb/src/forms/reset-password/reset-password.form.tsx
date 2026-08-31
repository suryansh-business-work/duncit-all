import { useMemo, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, InputAdornment, Stack } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PinOutlinedIcon from '@mui/icons-material/PinOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import RhfTextField from '../components/RhfTextField';
import { useTranslation } from '../../i18n/useTranslation';
import {
  makeResetPasswordSchema,
  resetPasswordDefaults,
  type ResetPasswordValues,
} from './reset-password.types';

interface Props {
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (values: ResetPasswordValues) => Promise<void> | void;
}

const passwordInputProps = (visible: boolean, onToggle: () => void, toggleLabel: string) => ({
  startAdornment: (
    <InputAdornment position="start">
      <LockOutlinedIcon fontSize="small" />
    </InputAdornment>
  ),
  endAdornment: (
    <InputAdornment position="end">
      <DuncitIconButton size="small" onClick={onToggle} edge="end" aria-label={toggleLabel}>
        {visible ? (
          <VisibilityOffOutlinedIcon fontSize="small" />
        ) : (
          <VisibilityOutlinedIcon fontSize="small" />
        )}
      </DuncitIconButton>
    </InputAdornment>
  ),
});

export default function ResetPasswordForm({ loading, errorMessage, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const schema = useMemo(() => makeResetPasswordSchema(t), [t]);
  const { control, handleSubmit } = useForm<ResetPasswordValues, any, ResetPasswordValues>({
    defaultValues: resetPasswordDefaults,
    resolver: zodResolver(schema) as unknown as Resolver<ResetPasswordValues, any, ResetPasswordValues>,
    mode: 'onTouched',
  });
  const showLabel = t('mweb.auth.showPassword');
  const hideLabel = t('mweb.auth.hidePassword');

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await onSubmit(values);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : t('mweb.auth.somethingWentWrong'));
    }
  });

  return (
    <form noValidate onSubmit={submit}>
      <Stack spacing={1.5}>
        <RhfTextField
          control={control}
          name="otp"
          label={t('mweb.resetPassword.otpLabel')}
          required
          hint={t('mweb.resetPassword.otpHint')}
          placeholder={t('mweb.resetPassword.otpPlaceholder')}
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
          label={t('mweb.resetPassword.newPasswordLabel')}
          required
          hint={t('mweb.auth.passwordHint')}
          placeholder={t('mweb.resetPassword.newPasswordPlaceholder')}
          autoComplete="new-password"
          size="small"
          slotProps={{ input: passwordInputProps(
            showPwd,
            () => setShowPwd((v) => !v),
            showPwd ? hideLabel : showLabel,
          ) }}
        />
        <RhfTextField
          control={control}
          name="confirm_password"
          type={showConfirmPwd ? 'text' : 'password'}
          label={t('mweb.resetPassword.confirmPasswordLabel')}
          required
          placeholder={t('mweb.resetPassword.confirmPasswordPlaceholder')}
          autoComplete="new-password"
          size="small"
          slotProps={{ input: passwordInputProps(
            showConfirmPwd,
            () => setShowConfirmPwd((v) => !v),
            showConfirmPwd ? hideLabel : showLabel,
          ) }}
        />
        <DuncitButton
          type="submit"
          variant="contained"
          size="large"
          endIcon={<ArrowForwardIcon />}
          disabled={loading}
          sx={{ borderRadius: '16px', py: 1.25, fontWeight: 700, textTransform: 'none' }}
        >
          {loading ? t('mweb.resetPassword.submitting') : t('mweb.resetPassword.submit')}
        </DuncitButton>
        {(submitError || errorMessage) && <Alert severity="error">{submitError || errorMessage}</Alert>}
      </Stack>
    </form>
  );
}

export type { ResetPasswordValues } from './reset-password.types';
