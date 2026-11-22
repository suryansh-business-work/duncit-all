import { Stack } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import EditLocationAltIcon from '@mui/icons-material/EditLocationAlt';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { DuncitButton } from '@duncit/buttons';
import { useConfirm } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import type { GiftCardAdminOrder, GiftCardOrderFulfilmentStatus } from '../queries';

/** Where the courier may be booked from, or a half-done booking resumed. */
const BOOKABLE: readonly GiftCardOrderFulfilmentStatus[] = ['PRINTED', 'AWAITING_SHIPMENT', 'AWB_ASSIGNED'];

interface Props {
  order: GiftCardAdminOrder;
  busy: boolean;
  onMarkPrinted: () => void;
  onBook: () => void;
  onRefresh: () => void;
  onPrintLabel: () => void;
  onDownloadLabel: () => void;
  onEditAddress: () => void;
}

/**
 * The next step a printed order needs, and only that step: print, fix the
 * address, book the courier, then follow it. A digital order has none — its
 * cards were emailed by the payment.
 */
export default function OrderActions({ order, busy, ...on }: Readonly<Props>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  if (order.delivery_mode !== 'PHYSICAL' || order.payment_status !== 'PAID') return null;
  const booked = !!order.shipment;

  const book = async () => {
    const ok = await confirm({
      title: t('loyalty.giftOrders.bookConfirmTitle'),
      message: t('loyalty.giftOrders.bookConfirmBody', { vars: { order: order.order_no } }),
      confirmLabel: t('loyalty.giftOrders.bookCta'),
      cancelLabel: t('shell.common.cancel'),
    });
    if (ok) on.onBook();
  };

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ flexWrap: 'wrap' }}>
      {order.fulfilment_status === 'PROCESSING' && (
        <DuncitButton variant="contained" startIcon={<DoneAllIcon />} disabled={busy} onClick={on.onMarkPrinted} data-testid="gift-order-printed">
          {t('loyalty.giftOrders.markPrintedCta')}
        </DuncitButton>
      )}
      {!booked && (
        <DuncitButton variant="outlined" startIcon={<EditLocationAltIcon />} disabled={busy} onClick={on.onEditAddress} data-testid="gift-order-address">
          {t('loyalty.giftOrders.editAddressCta')}
        </DuncitButton>
      )}
      {BOOKABLE.includes(order.fulfilment_status) && (
        <DuncitButton variant="contained" startIcon={<LocalShippingIcon />} disabled={busy} onClick={book} data-testid="gift-order-book">
          {booked ? t('loyalty.giftOrders.resumeBookingCta') : t('loyalty.giftOrders.bookCta')}
        </DuncitButton>
      )}
      {booked && (
        <DuncitButton variant="outlined" startIcon={<RefreshIcon />} disabled={busy} onClick={on.onRefresh} data-testid="gift-order-refresh">
          {t('loyalty.giftOrders.refreshCta')}
        </DuncitButton>
      )}
      {order.label_available && (
        <>
          <DuncitButton variant="outlined" startIcon={<PrintIcon />} disabled={busy} onClick={on.onPrintLabel}>
            {t('loyalty.giftOrders.printLabelCta')}
          </DuncitButton>
          <DuncitButton variant="outlined" startIcon={<DownloadIcon />} disabled={busy} onClick={on.onDownloadLabel}>
            {t('loyalty.giftOrders.downloadLabelCta')}
          </DuncitButton>
        </>
      )}
    </Stack>
  );
}
