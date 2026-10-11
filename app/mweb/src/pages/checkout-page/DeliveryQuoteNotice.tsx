import { Alert, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { DELIVERY_QUOTE_BLOCK_KEYS, type DeliveryQuoteStatus } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';

/** What the Pay button points at (`aria-describedby`) while this is on screen. */
export const DELIVERY_QUOTE_NOTICE_ID = 'checkout-delivery-notice';

/**
 * Why the Pay button is shut while the delivery charge is unknown: a pincode is
 * still needed, the charge is being calculated, or the quote failed — the last
 * with a way to ask again. Announced as it changes; renders nothing once the
 * charge is known. Native twin: components/checkout/DeliveryQuoteNotice.
 */
export default function DeliveryQuoteNotice({
  status,
  onRetry,
}: Readonly<{ status: DeliveryQuoteStatus; onRetry?: () => void }>) {
  const { t } = useTranslation();
  if (status === 'READY') return null;
  if (status === 'FAILED') {
    return (
      <Alert
        id={DELIVERY_QUOTE_NOTICE_ID}
        data-testid="checkout-delivery-failed"
        severity="error"
        action={
          onRetry && (
            <DuncitButton data-testid="checkout-delivery-retry" color="inherit" size="small" onClick={onRetry}>
              {t('mweb.checkout.deliveryRetry')}
            </DuncitButton>
          )
        }
      >
        {t(DELIVERY_QUOTE_BLOCK_KEYS.FAILED)}
      </Alert>
    );
  }
  return (
    <Typography
      id={DELIVERY_QUOTE_NOTICE_ID}
      data-testid="checkout-delivery-pending"
      role="status"
      variant="caption"
      sx={{ textAlign: 'center', color: 'text.secondary' }}
    >
      {t(DELIVERY_QUOTE_BLOCK_KEYS[status])}
    </Typography>
  );
}
