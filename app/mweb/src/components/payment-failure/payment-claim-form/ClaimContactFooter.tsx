import { Box, Stack, Typography } from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import type { ReactNode } from 'react';
import { useTranslation } from '../../../i18n/useTranslation';
import type { PaymentClaimContact } from './payment-claim.types';

function ContactRow({ icon, label, value, testId }: Readonly<{ icon: ReactNode; label: string; value: string; testId: string }>) {
  const { t } = useTranslation();
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }} data-testid={testId}>
      <Box aria-hidden sx={{ display: 'flex', color: 'text.secondary' }}>{icon}</Box>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>{label}</Typography>
      <Typography variant="body2" noWrap sx={{ fontWeight: 600, color: value ? 'text.primary' : 'text.disabled', minWidth: 0 }}>
        {value || t('mweb.payment.claim.missingContact')}
      </Typography>
    </Stack>
  );
}

/** Where support will reach the buyer: the account's registered phone and email. */
export default function ClaimContactFooter({ contact }: Readonly<{ contact: PaymentClaimContact }>) {
  const { t } = useTranslation();
  return (
    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }} data-testid="payment-claim-contact">
      <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary' }}>
        {t('mweb.payment.claim.contactNotice')}
      </Typography>
      <Stack spacing={0.75}>
        <ContactRow
          icon={<PhoneOutlinedIcon fontSize="small" />}
          label={t('mweb.payment.claim.phoneLabel')}
          value={contact.phone}
          testId="payment-claim-phone"
        />
        <ContactRow
          icon={<EmailOutlinedIcon fontSize="small" />}
          label={t('mweb.payment.claim.emailLabel')}
          value={contact.email}
          testId="payment-claim-email"
        />
      </Stack>
    </Box>
  );
}
