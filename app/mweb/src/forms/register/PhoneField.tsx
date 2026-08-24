import { Stack } from '@mui/material';
import type { Control } from 'react-hook-form';
import CountryCodeField from '../components/CountryCodeField';
import RhfTextField from '../components/RhfTextField';
import { useTranslation } from '../../i18n/useTranslation';
import type { RegisterFormValues } from './register.types';

interface Props {
  control: Control<RegisterFormValues>;
}

/**
 * Signup's phone row: the dial code leads, the number follows.
 *
 * Split out of register.form.tsx to keep that file inside the 200-line ceiling,
 * and shaped exactly like the profile editor's contact row so the two places a
 * number is typed on mWeb look the same. Its native twin is
 * app/mobile-app/src/forms/signup/PhoneField.tsx.
 */
export default function PhoneField({ control }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack direction="row" spacing={1} alignItems="flex-start">
      <CountryCodeField
        control={control}
        name="phoneExtension"
        label={t('mweb.common.code')}
      />
      <RhfTextField
        control={control}
        name="phoneNumber"
        label={t('mweb.common.phoneNumber')}
        required
        hint={t('mweb.signup.phoneHint')}
        placeholder={t('mweb.signup.phonePlaceholder')}
        autoComplete="tel-national"
        size="small"
        InputLabelProps={{ shrink: true }}
        digitsOnly
        inputProps={{ inputMode: 'numeric', maxLength: 15 }}
      />
    </Stack>
  );
}
