import { Alert, Stack, Typography } from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLongOutlined';
import { DuncitButton } from '@duncit/buttons';
import type { VenueFoodOrder } from '@duncit/utils';
import SectionHeader from '../../components/SectionHeader';
import { useTranslation } from '../../i18n/useTranslation';
import { SURFACE_SX } from '../../theme';
import { useFoodInvoice } from './useFoodInvoice';

interface Props {
  order: VenueFoodOrder;
  /** The order's access key — what proves it is this guest's. */
  orderKey: string | null;
}

/**
 * The invoice for a paid order: who issued it — the venue, with its GST number
 * when it has one — and the button that saves it as a PDF.
 */
export default function FoodOrderInvoiceCard({ order, orderKey }: Readonly<Props>) {
  const { t } = useTranslation();
  const invoice = useFoodInvoice(order, orderKey);

  return (
    <Stack spacing={1.5} sx={{ ...SURFACE_SX, p: 2 }} data-testid="food-order-invoice">
      <SectionHeader testId="food-order-invoice-header" title={t('mweb.venueFood.invoice.title')} />
      <Stack spacing={0.25}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('mweb.venueFood.invoice.hint', { vars: { venue: order.venue_name } })}
        </Typography>
        {order.venue_gstin && (
          <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-word' }} data-testid="food-order-invoice-gstin">
            {`${t('mweb.venueFood.order.gstin')}: ${order.venue_gstin}`}
          </Typography>
        )}
      </Stack>
      {invoice.failed && (
        <Alert severity="error" data-testid="food-order-invoice-error">
          {t('mweb.venueFood.invoice.failed')}
        </Alert>
      )}
      <DuncitButton
        variant="outlined"
        fullWidth
        startIcon={<ReceiptLongIcon />}
        loading={invoice.busy}
        disabled={invoice.busy}
        onClick={invoice.download}
        data-testid="food-order-invoice-download"
      >
        {t(invoice.busy ? 'mweb.venueFood.invoice.preparing' : 'mweb.venueFood.invoice.download')}
      </DuncitButton>
    </Stack>
  );
}
