import { Stack } from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import type { Control } from 'react-hook-form';
import RhfTextField from '../../components/RhfTextField';
import { useTranslation } from '../../../i18n/useTranslation';
import PhoneField from '../PhoneField';
import { startIcon } from '../fieldProps';
import type { RegisterFormValues } from '../register.types';

interface Props {
  control: Control<RegisterFormValues>;
}

/**
 * Step two — how we reach you: the WhatsApp number, then the email.
 *
 * The number leads because it is the one the last step sends a code to, so the
 * person reads what it is for before they type it.
 */
export default function ContactStep({ control }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Stack spacing={1.5}>
      <PhoneField control={control} />
      <RhfTextField
        control={control}
        name="email"
        type="email"
        label={t('mweb.auth.emailLabel')}
        required
        placeholder={t('mweb.signup.emailPlaceholder')}
        autoComplete="email"
        size="small"
        slotProps={{
          inputLabel: { shrink: true },
          input: startIcon(<EmailOutlinedIcon fontSize="small" />),
        }}
      />
    </Stack>
  );
}
