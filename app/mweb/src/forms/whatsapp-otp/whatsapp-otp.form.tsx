import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Stack } from '@mui/material';
import RhfTextField from '../components/RhfTextField';
import {
  whatsAppOtpRequestDefaults,
  whatsAppOtpRequestSchema,
  whatsAppOtpVerifyDefaults,
  whatsAppOtpVerifySchema,
  type WhatsAppOtpRequestValues,
  type WhatsAppOtpVerifyValues,
} from './whatsapp-otp.types';
import { useTranslation } from '../../i18n/useTranslation';

interface RequestProps {
  loading: boolean;
  onSubmit: (values: WhatsAppOtpRequestValues) => Promise<void> | void;
  onSkip: () => void;
}

export function WhatsAppRequestForm({ loading, onSubmit, onSkip }: Readonly<RequestProps>) {
  const { t } = useTranslation();
  const { control, handleSubmit } = useForm<WhatsAppOtpRequestValues>({
    defaultValues: whatsAppOtpRequestDefaults,
    resolver: zodResolver(whatsAppOtpRequestSchema),
    mode: 'onTouched',
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Stack direction="row" spacing={1.5}>
        <RhfTextField
          control={control}
          name="phone_extension"
          label={t('mweb.common.code')}
          size="small"
          fullWidth={false}
          sx={{ width: 100 }}
        />
        <RhfTextField
          control={control}
          name="phone_number"
          label={t('mweb.common.whatsappNumber')}
          required
          hint="6–15 digits"
          size="small"
        />
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <Button type="submit" variant="contained" fullWidth disabled={loading}>
          Send OTP
        </Button>
        <Button onClick={onSkip} variant="text">
          Skip
        </Button>
      </Stack>
    </form>
  );
}

interface VerifyProps {
  loading: boolean;
  onSubmit: (values: WhatsAppOtpVerifyValues) => Promise<void> | void;
  onChangeNumber: () => void;
  onSkip: () => void;
}

export function WhatsAppVerifyForm({
  loading,
  onSubmit,
  onChangeNumber,
  onSkip,
}: Readonly<VerifyProps>) {
  const { t } = useTranslation();
  const { control, handleSubmit } = useForm<WhatsAppOtpVerifyValues>({
    defaultValues: whatsAppOtpVerifyDefaults,
    resolver: zodResolver(whatsAppOtpVerifySchema),
    mode: 'onTouched',
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <RhfTextField
        control={control}
        name="otp"
        label={t('mweb.common.enterOtp')}
        required
        hint="4–8 digit code"
        size="small"
        inputProps={{ inputMode: 'numeric', maxLength: 8 }}
      />
      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <Button type="submit" variant="contained" fullWidth disabled={loading}>
          Verify & continue
        </Button>
        <Button onClick={onChangeNumber} variant="text">
          Change number
        </Button>
      </Stack>
      <Button onClick={onSkip} fullWidth sx={{ mt: 1 }}>
        Skip for now
      </Button>
    </form>
  );
}
