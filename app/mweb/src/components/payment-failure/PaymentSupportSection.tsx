import { useState } from 'react';
import { Divider, Stack, Typography } from '@mui/material';
import SupportAgentIcon from '@mui/icons-material/SupportAgentOutlined';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';
import PaymentClaimDialog from './PaymentClaimDialog';

/**
 * "My payment was deducted but booking was not completed." Shown only where
 * the screen grants the claim capability (the pod checkout, with a Duncit
 * payment to file against). The claim dialog mounts per opening.
 */
export default function PaymentSupportSection({ paymentDocId }: Readonly<{ paymentDocId: string }>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <Stack spacing={1} data-testid="payment-support-section">
      <Divider />
      <Typography component="h3" variant="subtitle2" sx={{ fontWeight: 700 }}>
        {t('mweb.payment.supportHeading')}
      </Typography>
      <DuncitButton
        fullWidth
        variant="outlined"
        startIcon={<SupportAgentIcon />}
        onClick={() => setOpen(true)}
        data-testid="payment-deducted-open"
        sx={{ justifyContent: 'flex-start', textAlign: 'left' }}
      >
        {t('mweb.payment.deductedButton')}
      </DuncitButton>
      {open && <PaymentClaimDialog paymentDocId={paymentDocId} onClose={() => setOpen(false)} />}
    </Stack>
  );
}
