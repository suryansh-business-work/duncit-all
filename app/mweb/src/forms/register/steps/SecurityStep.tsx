import { useState } from 'react';
import { Stack } from '@mui/material';
import { Controller, type Control } from 'react-hook-form';
import RhfTextField from '../../components/RhfTextField';
import { useTranslation } from '../../../i18n/useTranslation';
import { PolicyAcceptanceField } from '../../../components/policy-acceptance';
import { passwordInputProps } from '../fieldProps';
import type { RegisterFormValues } from '../register.types';
import type { SignupPolicy } from '../../../components/policy-acceptance';

interface Props {
  control: Control<RegisterFormValues>;
  policies: readonly SignupPolicy[];
  policiesLoading: boolean;
  policiesFailed: boolean;
}

/**
 * Step three — the password, and the policies it is created under.
 *
 * The acceptance ticks live on this step because it is the one whose button
 * actually creates the account: agreeing on a screen two steps before anything
 * exists is agreeing to something that has not happened yet.
 */
export default function SecurityStep({
  control,
  policies,
  policiesLoading,
  policiesFailed,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const showLabel = t('mweb.auth.showPassword');
  const hideLabel = t('mweb.auth.hidePassword');

  return (
    <Stack spacing={1.5}>
      <RhfTextField
        control={control}
        name="password"
        type={showPwd ? 'text' : 'password'}
        label={t('mweb.auth.passwordLabel')}
        required
        autoFocus
        hint={t('mweb.auth.passwordHint')}
        placeholder={t('mweb.signup.passwordPlaceholder')}
        autoComplete="new-password"
        size="small"
        slotProps={{
          inputLabel: { shrink: true },
          input: passwordInputProps(
            showPwd,
            () => setShowPwd((v) => !v),
            showPwd ? hideLabel : showLabel,
          ),
        }}
      />
      <RhfTextField
        control={control}
        name="confirmPassword"
        type={showConfirmPwd ? 'text' : 'password'}
        label={t('mweb.signup.confirmPasswordLabel')}
        required
        placeholder={t('mweb.signup.confirmPasswordPlaceholder')}
        autoComplete="new-password"
        size="small"
        slotProps={{
          inputLabel: { shrink: true },
          input: passwordInputProps(
            showConfirmPwd,
            () => setShowConfirmPwd((v) => !v),
            showConfirmPwd ? hideLabel : showLabel,
          ),
        }}
      />
      <Controller
        control={control}
        name="acceptedPolicyIds"
        render={({ field, fieldState }) => (
          <PolicyAcceptanceField
            accepted={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
            policies={policies}
            loading={policiesLoading}
            failed={policiesFailed}
          />
        )}
      />
    </Stack>
  );
}
