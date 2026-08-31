import { useMemo, useState } from 'react';
import { Controller, useForm , type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, InputAdornment, Link, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CardGiftcardOutlinedIcon from '@mui/icons-material/CardGiftcardOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { Link as RouterLink } from 'react-router-dom';
import RhfTextField from '../components/RhfTextField';
import DobYearField from './DobYearField';
import PhoneField from './PhoneField';
import { makeRegisterSchema, registerDefaults, type RegisterFormValues } from './register.types';
import { useTranslation } from '../../i18n/useTranslation';
import { useMinSignupAge } from '../../utils/dateFormat';
import {
  PolicyAcceptanceField,
  useSignupPolicies,
} from '../../components/policy-acceptance';

interface Props {
  loading?: boolean;
  errorMessage?: string | null;
  initialValues?: RegisterFormValues;
  onSubmit: (values: RegisterFormValues) => Promise<void> | void;
}

const startIcon = (icon: React.ReactNode) => ({
  startAdornment: <InputAdornment position="start">{icon}</InputAdornment>,
});

const passwordInputProps = (visible: boolean, onToggle: () => void, toggleLabel: string) => ({
  ...startIcon(<LockOutlinedIcon fontSize="small" />),
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

export default function RegisterForm({ loading, errorMessage, initialValues, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const minAge = useMinSignupAge();
  const { policies, loading: policiesLoading, failed: policiesFailed } = useSignupPolicies();
  const requiredPolicyIds = useMemo(() => policies.map((policy) => policy.id), [policies]);
  const schema = useMemo(
    () => makeRegisterSchema(minAge, t, requiredPolicyIds),
    [minAge, t, requiredPolicyIds],
  );
  const { control, handleSubmit } = useForm<RegisterFormValues, any, RegisterFormValues>({
    defaultValues: initialValues ?? registerDefaults,
    resolver: zodResolver(schema) as unknown as Resolver<RegisterFormValues, any, RegisterFormValues>,
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
          name="name"
          label={t('mweb.signup.nameLabel')}
          required
          placeholder={t('mweb.signup.namePlaceholder')}
          autoComplete="name"
          size="small"
          slotProps={{ inputLabel: { shrink: true }, input: startIcon(<PersonOutlineIcon fontSize="small" />) }}
        />
        <RhfTextField
          control={control}
          name="email"
          type="email"
          label={t('mweb.auth.emailLabel')}
          required
          placeholder={t('mweb.signup.emailPlaceholder')}
          autoComplete="email"
          size="small"
          slotProps={{ inputLabel: { shrink: true }, input: startIcon(<EmailOutlinedIcon fontSize="small" />) }}
        />
        <PhoneField control={control} />
        <DobYearField control={control} minAge={minAge} />
        <RhfTextField
          control={control}
          name="password"
          type={showPwd ? 'text' : 'password'}
          label={t('mweb.auth.passwordLabel')}
          required
          hint={t('mweb.auth.passwordHint')}
          placeholder={t('mweb.signup.passwordPlaceholder')}
          autoComplete="new-password"
          size="small"
          slotProps={{ inputLabel: { shrink: true }, input: passwordInputProps(
            showPwd,
            () => setShowPwd((v) => !v),
            showPwd ? hideLabel : showLabel,
          ) }}
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
          slotProps={{ inputLabel: { shrink: true }, input: passwordInputProps(
            showConfirmPwd,
            () => setShowConfirmPwd((v) => !v),
            showConfirmPwd ? hideLabel : showLabel,
          ) }}
        />
        <RhfTextField
          control={control}
          name="referralCode"
          label={t('mweb.referral.codeOptional')}
          hint={t('mweb.referral.codeHint')}
          placeholder={t('mweb.referral.codePlaceholder')}
          size="small"
          slotProps={{ inputLabel: { shrink: true }, input: startIcon(<CardGiftcardOutlinedIcon fontSize="small" />), htmlInput: { style: { textTransform: 'uppercase' } } }}
          
          
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
      <Stack spacing={2} sx={{ mt: 2 }}>
        <DuncitButton
          type="submit"
          variant="contained"
          disabled={loading}
          fullWidth
          endIcon={<ArrowForwardIcon />}
        >
          {loading ? t('mweb.signup.submitting') : t('mweb.signup.submit')}
        </DuncitButton>
        {(submitError || errorMessage) && <Alert severity="error">{submitError || errorMessage}</Alert>}
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            textAlign: "center"
          }}>
          {t('mweb.signup.haveAccount')}{' '}
          <Link component={RouterLink} to="/login" underline="hover">
            {t('mweb.signup.logIn')}
          </Link>
        </Typography>
      </Stack>
    </form>
  );
}

export type { RegisterFormValues } from './register.types';
