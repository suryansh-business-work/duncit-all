import { useNavigate } from 'react-router';
import { Stack, Typography } from '@mui/material';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded';
import { DuncitButton } from '@duncit/buttons';
import { orderDownloads, orderSupportDraft } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import type { OrderDetail } from './queries';
import { useOrderDownloads } from './useOrderDownloads';

/**
 * What the buyer can take away from an order: Duncit's invoice, the seller's
 * tax invoice once the shipment is booked, and a support ticket already filled
 * in with the order's references. Native twin: components/order-detail/OrderActionsCard.
 */
export default function OrderActionsCard({ order }: Readonly<{ order: OrderDetail }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const offered = orderDownloads(order);
  const downloads = useOrderDownloads(order);

  const getHelp = () => {
    const draft = orderSupportDraft(order, t);
    const params = new URLSearchParams({ category: draft.category, subject: draft.subject, message: draft.message });
    navigate(`/support/tickets?${params.toString()}`);
  };

  return (
    <Stack spacing={1.5} data-testid="order-actions">
      <Stack spacing={1}>
        <Typography variant="subtitle2" component="h2" sx={{ fontWeight: 700 }}>{t('mweb.orderDetail.documents')}</Typography>
        <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
          {offered.invoice && (
            <DuncitButton
              size="small"
              variant="outlined"
              startIcon={<DownloadRoundedIcon />}
              loading={downloads.invoiceBusy}
              onClick={downloads.downloadInvoice}
              data-testid="order-download-invoice"
            >
              {t('mweb.orderDetail.downloadInvoice')}
            </DuncitButton>
          )}
          {offered.sellerInvoice && (
            <DuncitButton
              size="small"
              variant="outlined"
              startIcon={<DownloadRoundedIcon />}
              loading={downloads.sellerInvoiceBusy}
              onClick={downloads.downloadSellerInvoice}
              data-testid="order-download-seller-invoice"
            >
              {t('mweb.orderDetail.downloadSellerInvoice')}
            </DuncitButton>
          )}
        </Stack>
        {order.fulfilment_method === 'SHIP' && !offered.sellerInvoice && !order.cancelled_at && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }} data-testid="order-seller-invoice-pending">
            {t('mweb.orderDetail.sellerInvoicePending')}
          </Typography>
        )}
      </Stack>
      <Stack spacing={1}>
        <Typography variant="subtitle2" component="h2" sx={{ fontWeight: 700 }}>{t('mweb.orderDetail.needHelp')}</Typography>
        <DuncitButton
          variant="contained"
          startIcon={<SupportAgentRoundedIcon />}
          onClick={getHelp}
          data-testid="order-get-help"
          sx={{ alignSelf: 'flex-start' }}
        >
          {t('mweb.orderDetail.getHelp')}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
