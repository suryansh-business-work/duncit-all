import { Box, Divider, Stack, Typography } from '@mui/material';
import AppleIcon from '@mui/icons-material/Apple';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import GoogleIcon from '@mui/icons-material/Google';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { DuncitButton } from '@duncit/buttons';
import { SURFACE_SX } from '../../theme';
import { useTranslation } from '../../i18n/useTranslation';
import { useDateFormat } from '../../utils/dateFormat';
import { formatMoney } from './checkoutMath';

/** One label · value line of the receipt card. */
export function SuccessRow({ label, value, bold, mono, testId }: Readonly<{ label: string; value: string; bold?: boolean; mono?: boolean; testId?: string }>) {
  return (
    <Stack data-testid={testId} direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
      <Typography variant="body2" sx={{ color: bold ? 'text.primary' : 'text.secondary', fontWeight: bold ? 700 : 500 }}>
        {label}
      </Typography>
      <Typography
        variant={bold ? 'subtitle1' : 'body2'}
        sx={[{ fontWeight: bold ? 700 : 600, textAlign: 'right', overflowWrap: 'anywhere' }, mono ? { fontFamily: 'monospace' } : false]}
      >
        {value}
      </Typography>
    </Stack>
  );
}

/** The payment fields the receipt prints. */
interface ReceiptPayment {
  total: number;
  currency_symbol: string;
  payment_id: string;
  invoice_no?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
  /** Frozen on the payment at checkout; absent or 0 when no tier applied. */
  ticket_discount_amount?: number | null;
}

/** The receipt card: what was paid, when, the ids — and the multi-ticket
 * discount the booking got, when it got one. */
export function SuccessReceiptCard({ payment }: Readonly<{ payment: ReceiptPayment }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const paidAt = payment.paid_at ?? payment.created_at;
  const ticketDiscount = Number(payment.ticket_discount_amount) || 0;
  return (
    <Box sx={{ ...SURFACE_SX, p: 2, textAlign: 'left' }}>
      <Stack spacing={1} divider={<Divider flexItem />}>
        <SuccessRow label={t('mweb.checkout.amountPaid')} value={formatMoney(payment.currency_symbol, payment.total)} bold />
        {ticketDiscount > 0 && (
          <SuccessRow
            testId="checkout-success-ticket-discount"
            label={t('mweb.checkout.ticketDiscountSaved')}
            value={`− ${formatMoney(payment.currency_symbol, ticketDiscount)}`}
          />
        )}
        {paidAt && <SuccessRow label={t('mweb.checkout.paidOn')} value={formatDateTime(paidAt)} />}
        <SuccessRow label={t('mweb.checkout.paymentId')} value={payment.payment_id} mono />
        {payment.invoice_no && <SuccessRow label={t('mweb.checkout.invoiceLabel')} value={payment.invoice_no} mono />}
      </Stack>
    </Box>
  );
}

interface PodProps {
  title: string;
  when: string;
  /** Venue charges payable at the door, already formatted — empty when none. */
  venueNote: string | null;
  onAppleWallet: () => void;
  onGoogleCalendar: () => void;
}

/** The booked pod on the confirmation: what and when, the calendar shortcuts,
 * and the venue charges still to be paid at the door. */
export function SuccessPodCard({ title, when, venueNote, onAppleWallet, onGoogleCalendar }: Readonly<PodProps>) {
  const { t } = useTranslation();
  return (
    <Box data-testid="confirmation-pod" sx={{ ...SURFACE_SX, p: 2, textAlign: 'left' }}>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              flexShrink: 0,
              borderRadius: '50%',
              bgcolor: 'action.hover',
              color: 'secondary.main',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <EventAvailableIcon fontSize="small" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap sx={{ fontWeight: 600 }}>{title}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{when}</Typography>
          </Box>
        </Stack>
        <Divider />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <DuncitButton data-testid="success-pod-apple-wallet" fullWidth variant="outlined" startIcon={<AppleIcon />} onClick={onAppleWallet}>
            {t('mweb.checkout.appleWallet')}
          </DuncitButton>
          <DuncitButton data-testid="success-pod-google-wallet" fullWidth variant="outlined" startIcon={<GoogleIcon />} onClick={onGoogleCalendar}>
            {t('mweb.checkout.googleWallet')}
          </DuncitButton>
        </Stack>
        {venueNote && (
          <Stack data-testid="success-venue-note" direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <StorefrontIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {venueNote}
            </Typography>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
