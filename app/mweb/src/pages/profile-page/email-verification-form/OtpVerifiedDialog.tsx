import { Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import ResponsiveDialog from '../../../components/ResponsiveDialog';
import PaymentLottie from '../../../components/PaymentLottie';
import { useTranslation } from '../../../i18n/useTranslation';

interface Props {
  open: boolean;
  email?: string | null;
  onClose: () => void;
}

/**
 * Confirms a profile email OTP was accepted — the animated tick draws itself,
 * then the copy names the address that is now verified. The native twin is
 * `components/account/OtpVerifiedDialog`.
 */
export default function OtpVerifiedDialog({ open, email, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const body = email
    ? t('mweb.profile.otpVerifiedBody', { vars: { email } })
    : t('mweb.profile.otpVerifiedBodyNoEmail');

  return (
    <ResponsiveDialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      testId="otp-verified-dialog"
      actions={
        <DuncitButton data-testid="otp-verified-dialog-done" variant="contained" fullWidth onClick={onClose}>
          {t('mweb.common.done')}
        </DuncitButton>
      }
    >
      <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center', py: 1 }} role="status">
        <PaymentLottie variant="success" size={96} label={t('mweb.profile.otpVerifiedAnimation')} />
        <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
          {t('mweb.profile.otpVerifiedTitle')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {body}
        </Typography>
      </Stack>
    </ResponsiveDialog>
  );
}
