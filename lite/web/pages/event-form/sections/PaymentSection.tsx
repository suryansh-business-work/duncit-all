import { useWatch, type Control } from 'react-hook-form';
import { Alert, Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { SectionCard } from '@duncit/ui';
import { useWebT } from '../../../../shared/i18n';
import type { EventFormValues } from '../event.types';

/** Where a paid ticket is paid: the host's UPI ID and the payee name guests will see. */
export function PaymentSection({ control }: Readonly<{ control: Control<EventFormValues> }>) {
  const { t } = useWebT();
  const tickets = useWatch({ control, name: 'tickets' });
  const paid = tickets.some((ticket) => Number.parseInt(ticket.price, 10) > 0);
  return (
    <SectionCard title={t('liteWeb.eventForm.payment')} subtitle={t('liteWeb.eventForm.paymentHint')}>
      <Stack spacing={2}>
        <Alert severity={paid ? 'warning' : 'info'} data-testid="payment-note">
          {paid ? t('liteWeb.eventForm.paymentRequired') : t('liteWeb.eventForm.paymentOptional')}
        </Alert>
        <RhfTextField control={control} name="upi_id" label={t('liteWeb.profile.upiId')} hint={t('liteWeb.profile.upiIdHint')} required={paid} slotProps={{ htmlInput: { maxLength: 256, 'data-testid': 'event-upi-id' } }} />
        <RhfTextField control={control} name="upi_name" label={t('liteWeb.profile.upiName')} hint={t('liteWeb.profile.upiNameHint')} slotProps={{ htmlInput: { maxLength: 80, 'data-testid': 'event-upi-name' } }} />
      </Stack>
    </SectionCard>
  );
}
