import { useMemo, useState } from 'react';
import { useForm, type Control, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, InputAdornment, Stack } from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { DuncitTabs } from '@duncit/tabs';
import { LOGIN_CHANNELS, type LoginChannel } from '@duncit/forms/schemas';
import CountryCodeField from '../components/CountryCodeField';
import RhfTextField from '../components/RhfTextField';
import { CHANNEL_TABS_SX } from '../../components/password-recovery/channelTabs';
import { useTranslation } from '../../i18n/useTranslation';
import {
  loginDefaults,
  makeLoginSchema,
  type LoginFormValues,
  type LoginSubmitValues,
} from './login.types';

interface Props {
  loading?: boolean;
  initialValues?: LoginFormValues;
  errorMessage?: string | null;
  onSubmit: (values: LoginSubmitValues) => Promise<void> | void;
  submitLabel?: string;
}

const numericInput = { inputMode: 'numeric' as const, maxLength: 15 };

/**
 * The destination boxes for the chosen channel.
 *
 * Module scope, not nested (S6478), and the parent remounts it per channel so
 * the two channels never share a resolver — the same reason the recovery step
 * keys its form.
 */
function LoginIdentityFields({
  channel,
  control,
}: Readonly<{ channel: LoginChannel; control: Control<LoginFormValues> }>) {
  const { t } = useTranslation();

  if (channel === 'PHONE') {
    return (
      <Stack direction="row" spacing={1}>
        <CountryCodeField control={control} name="phoneExtension" label={t('mweb.common.code')} />
        <RhfTextField
          control={control}
          name="phoneNumber"
          label={t('mweb.passwordRecovery.phoneField')}
          required
          placeholder={t('mweb.passwordRecovery.phonePlaceholder')}
          autoComplete="tel-national"
          size="small"
          slotProps={{ inputLabel: { shrink: true }, htmlInput: numericInput }}
        />
      </Stack>
    );
  }

  return (
    <RhfTextField
      control={control}
      name="email"
      type="email"
      label={t('mweb.auth.emailLabel')}
      required
      placeholder={t('mweb.auth.emailPlaceholder')}
      autoComplete="email"
      size="small"
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <EmailOutlinedIcon fontSize="small" />
            </InputAdornment>
          ),
        },
      }}
    />
  );
}

/** One channel's form. Remounted by the parent when the channel changes. */
function LoginFields({
  channel,
  loading,
  initialValues,
  errorMessage,
  onSubmit,
  submitLabel,
}: Readonly<Props & { channel: LoginChannel }>) {
  const { t } = useTranslation();
  const [showPwd, setShowPwd] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const schema = useMemo(() => makeLoginSchema(t, channel), [t, channel]);
  const { control, handleSubmit } = useForm<LoginFormValues, any, LoginFormValues>({
    defaultValues: initialValues ?? loginDefaults,
    resolver: zodResolver(schema) as unknown as Resolver<LoginFormValues, any, LoginFormValues>,
    mode: 'onTouched',
  });

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await onSubmit({ ...values, channel });
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : t('mweb.auth.somethingWentWrong'));
    }
  });

  return (
    <form noValidate onSubmit={submit}>
      <Stack spacing={2}>
        <LoginIdentityFields channel={channel} control={control} />
        <RhfTextField
          control={control}
          name="password"
          type={showPwd ? 'text' : 'password'}
          label={t('mweb.auth.passwordLabel')}
          required
          hint={t('mweb.auth.passwordHint')}
          placeholder={t('mweb.login.passwordPlaceholder')}
          autoComplete="current-password"
          size="small"
          slotProps={{ input: {
            startAdornment: (
              <InputAdornment position="start">
                <LockOutlinedIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <DuncitIconButton
                  size="small"
                  onClick={() => setShowPwd((v) => !v)}
                  edge="end"
                  aria-label={showPwd ? t('mweb.auth.hidePassword') : t('mweb.auth.showPassword')}
                >
                  {showPwd ? (
                    <VisibilityOffOutlinedIcon fontSize="small" />
                  ) : (
                    <VisibilityOutlinedIcon fontSize="small" />
                  )}
                </DuncitIconButton>
              </InputAdornment>
            ),
          } }}
        />
        {(submitError || errorMessage) && <Alert severity="error">{submitError || errorMessage}</Alert>}
        <DuncitButton type="submit" variant="contained" size="large" fullWidth disabled={loading}>
          {loading ? t('mweb.login.submitting') : (submitLabel ?? t('mweb.login.submit'))}
        </DuncitButton>
      </Stack>
    </form>
  );
}

/**
 * Continue with password, on either of the two things an account is identified
 * by. The channel lives here rather than in the form values: the two channels
 * validate different boxes, and a resolver swapped underneath a live form
 * leaves the previous channel's errors on fields nobody can see any more — so
 * the form is REMOUNTED per channel, exactly as the recovery step is.
 */
export default function LoginForm(props: Readonly<Props>) {
  const { t } = useTranslation();
  const [channel, setChannel] = useState<LoginChannel>('EMAIL');

  return (
    <Stack spacing={2}>
      <DuncitTabs
        items={LOGIN_CHANNELS.map((value) => ({
          value,
          label:
            value === 'EMAIL'
              ? t('mweb.passwordRecovery.emailName')
              : t('mweb.passwordRecovery.phoneName'),
        }))}
        value={channel}
        onChange={(next) => setChannel(next as LoginChannel)}
        variant="fullWidth"
        sx={CHANNEL_TABS_SX}
      />
      <LoginFields key={channel} channel={channel} {...props} />
    </Stack>
  );
}

export type { LoginFormValues, LoginSubmitValues } from './login.types';
