import type { Control } from 'react-hook-form';
import { InputAdornment, Stack } from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import type { LoginChannel } from '@duncit/forms/schemas';
import CountryCodeField from '../components/CountryCodeField';
import RhfTextField from '../components/RhfTextField';
import { useTranslation } from '../../i18n/useTranslation';
import type { LoginFormValues } from './login.types';

const numericInput = { inputMode: 'numeric' as const, maxLength: 15 };

/**
 * The destination boxes for the chosen channel.
 *
 * Module scope, not nested (S6478), and the parent remounts it per channel so
 * the two channels never share a resolver — the same reason the recovery step
 * keys its form.
 */
export default function LoginIdentityFields({
  channel,
  control,
}: Readonly<{ channel: LoginChannel; control: Control<LoginFormValues> }>) {
  const { t } = useTranslation();

  if (channel === 'PHONE') {
    return (
      <Stack direction="row" spacing={1}>
        <CountryCodeField
          control={control}
          name="phoneExtension"
          label={t('mweb.common.code')}
          testId="login-code"
        />
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
