import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '../../i18n/useTranslation';
import {
  makeTwoFactorCodeSchema,
  twoFactorCodeDefaults,
  type TwoFactorCodeFormProps,
  type TwoFactorCodeValues,
} from './two-factor-code.types';

/** The one code box every authenticator-app step asks through. */
export function TwoFactorCodeForm({
  allowRecovery,
  loading,
  submitLabel,
  testId,
  onSubmit,
}: Readonly<TwoFactorCodeFormProps>) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const schema = useMemo(() => makeTwoFactorCodeSchema(t, { allowRecovery }), [t, allowRecovery]);
  const { control, handleSubmit } = useForm<TwoFactorCodeValues>({
    defaultValues: twoFactorCodeDefaults,
    resolver: zodResolver(schema),
    mode: 'onTouched',
  });

  const submit = async ({ code }: TwoFactorCodeValues) => {
    setError(null);
    try {
      await onSubmit(code);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('shell.profile.genericError'));
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit(submit)}>
      <Stack spacing={1.5}>
        <RhfTextField
          control={control}
          name="code"
          label={allowRecovery ? t('shell.twoFactor.codeOrRecoveryLabel') : t('shell.twoFactor.codeLabel')}
          hint={allowRecovery ? t('shell.twoFactor.codeOrRecoveryHint') : t('shell.twoFactor.codeHint')}
          autoComplete="one-time-code"
          required
          size="small"
          data-testid={`${testId}-code`}
          // A recovery code has letters, so the numeric keypad is for the app code alone.
          slotProps={{ htmlInput: allowRecovery ? { maxLength: 20 } : { inputMode: 'numeric', maxLength: 6 } }}
        />
        <DuncitButton type="submit" variant="contained" disabled={loading} data-testid={`${testId}-submit`}>
          {loading ? t('shell.twoFactor.checking') : submitLabel}
        </DuncitButton>
        {error && (
          <Alert data-testid={`${testId}-error`} severity="error" role="alert">
            {error}
          </Alert>
        )}
      </Stack>
    </form>
  );
}
