import { Alert, Stack, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import type { BrandIntegrationStatus } from '../../queries';
import type { BrandStepProps } from './step-types';

interface Props extends BrandStepProps {
  /** The brand's Razorpay connection as the server last checked it (absent on a new brand). */
  razorpay?: BrandIntegrationStatus;
}

/** Step 4 — where product earnings are paid. Optional until the first payout. */
export default function PayoutStep({ control, locked, razorpay }: Readonly<Props>) {
  const { t } = useTranslation();
  const razorpayConnected = razorpay?.connected === true;
  return (
    <Stack spacing={2}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('partners.brandWizard.payout.intro')}
      </Typography>
      <RhfTextField
        control={control}
        name="account_holder_name"
        label={t('partners.common.accountHolderName')}
        disabled={locked}
        data-testid="brand-wizard-account-holder-name"
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <RhfTextField
          control={control}
          name="account_number"
          label={t('partners.common.accountNumber')}
          disabled={locked}
          hint={t('partners.brandWizard.payout.accountNumberHint')}
          slotProps={{ htmlInput: { inputMode: 'numeric' } }}
          data-testid="brand-wizard-account-number"
        />
        <RhfTextField
          control={control}
          name="ifsc_code"
          label={t('partners.common.ifscCode')}
          disabled={locked}
          hint={t('partners.brandWizard.payout.ifscHint')}
          slotProps={{ htmlInput: { style: { textTransform: 'uppercase' }, maxLength: 11 } }}
          data-testid="brand-wizard-ifsc"
        />
      </Stack>
      <RhfTextField
        control={control}
        name="upi_id"
        label={t('partners.common.upiId')}
        disabled={locked}
        hint={t('partners.brandWizard.payout.upiHint')}
        data-testid="brand-wizard-upi"
      />
      <Alert severity={razorpayConnected ? 'success' : 'info'} data-testid="brand-wizard-razorpay-confirmation">
        <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 800 }}>
          {t('partners.brandWizard.payout.razorpayTitle')}
        </Typography>
        {razorpayConnected
          ? t('partners.brandWizard.payout.razorpayConnected')
          : t('partners.brandWizard.payout.razorpayPending')}
      </Alert>
    </Stack>
  );
}
