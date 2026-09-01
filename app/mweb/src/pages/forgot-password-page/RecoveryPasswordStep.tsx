import { useMemo, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { InputAdornment, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import type { PasswordRecoveryLabels } from '@duncit/utils';
import RhfTextField from '../../forms/components/RhfTextField';
import { useTranslation } from '../../i18n/useTranslation';
import { makeRecoveryPasswordSchema, type RecoveryPasswordValues } from '../../components/password-recovery/recovery.types';

interface Props {
  labels: PasswordRecoveryLabels;
  busy: boolean;
  onSave: (newPassword: string) => void;
}

const defaults: RecoveryPasswordValues = { new_password: '', confirm_password: '' };

/** Step three: the new password, typed twice. */
export default function RecoveryPasswordStep({ labels, busy, onSave }: Readonly<Props>) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const schema = useMemo(() => makeRecoveryPasswordSchema(t), [t]);
  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useForm<RecoveryPasswordValues, any, RecoveryPasswordValues>({
    defaultValues: defaults,
    resolver: zodResolver(schema) as unknown as Resolver<
      RecoveryPasswordValues,
      any,
      RecoveryPasswordValues
    >,
    mode: 'onChange',
  });

  const submit = handleSubmit((values) => onSave(values.new_password));

  // One toggle for both boxes: they are being compared, and a person who can
  // read one and not the other cannot check that they match.
  const visibilityToggle = (
    <InputAdornment position="end">
      <DuncitIconButton
        size="small"
        edge="end"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? t('mweb.auth.hidePassword') : t('mweb.auth.showPassword')}
      >
        {show ? (
          <VisibilityOffOutlinedIcon fontSize="small" />
        ) : (
          <VisibilityOutlinedIcon fontSize="small" />
        )}
      </DuncitIconButton>
    </InputAdornment>
  );

  const lockAdornment = (
    <InputAdornment position="start">
      <LockOutlinedIcon fontSize="small" />
    </InputAdornment>
  );

  return (
    <form noValidate onSubmit={submit}>
      <Stack spacing={1.5}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {labels.passwordSubtitle}
        </Typography>
        <RhfTextField
          control={control}
          name="new_password"
          type={show ? 'text' : 'password'}
          label={t('mweb.resetPassword.newPasswordLabel')}
          required
          autoFocus
          hint={t('mweb.auth.passwordHint')}
          placeholder={t('mweb.resetPassword.newPasswordPlaceholder')}
          autoComplete="new-password"
          size="small"
          slotProps={{
            inputLabel: { shrink: true },
            input: { startAdornment: lockAdornment, endAdornment: visibilityToggle },
          }}
        />
        <RhfTextField
          control={control}
          name="confirm_password"
          type={show ? 'text' : 'password'}
          label={t('mweb.resetPassword.confirmPasswordLabel')}
          required
          placeholder={t('mweb.resetPassword.confirmPasswordPlaceholder')}
          autoComplete="new-password"
          size="small"
          slotProps={{
            inputLabel: { shrink: true },
            input: { startAdornment: lockAdornment },
          }}
        />
        <DuncitButton
          type="submit"
          variant="contained"
          size="large"
          endIcon={<ArrowForwardIcon />}
          disabled={busy || !isValid}
          sx={{ borderRadius: '16px', py: 1.25, fontWeight: 700, textTransform: 'none' }}
        >
          {busy ? labels.saving : labels.savePassword}
        </DuncitButton>
      </Stack>
    </form>
  );
}
