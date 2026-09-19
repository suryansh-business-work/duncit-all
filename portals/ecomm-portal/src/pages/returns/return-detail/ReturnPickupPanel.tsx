import { useMutation } from '@apollo/client/react';
import { Alert, Divider, Stack, Typography } from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import InventoryIcon from '@mui/icons-material/Inventory';
import { useDateFormat } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { EM_DASH } from '@duncit/table';
import { SectionCard } from '@duncit/ui';
import EventTimeline from '../../../components/EventTimeline';
import InfoRows from '../../../components/InfoRows';
import { runAction } from '../../../lib/actions';
import { BOOK_RETURN_PICKUP, RESTOCK_RETURN, type StoreReturn } from '../queries';

const BOOKABLE = new Set(['APPROVED', 'PICKUP_SCHEDULED']);
const RECEIVED = new Set(['RECEIVED', 'REFUNDED', 'CLOSED']);

/**
 * The courier leg of a return: booked when the return is approved, tracked
 * like any shipment, and marked received when it reaches the warehouse. Retry
 * a booking that failed; put the goods back on the shelf once they are in.
 */
export default function ReturnPickupPanel({ item }: Readonly<{ item: StoreReturn }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const [book, bookState] = useMutation(BOOK_RETURN_PICKUP);
  const [restock, restockState] = useMutation(RESTOCK_RETURN);
  const { pickup } = item;
  const busy = bookState.loading || restockState.loading;
  const canBook = BOOKABLE.has(item.status) && !pickup.awb;
  const canRestock = RECEIVED.has(item.status) && !item.restocked;
  const bookLabel = pickup.sr_order_id ? t('ecommPortal.shipping.retryBooking') : t('ecommPortal.returns.bookPickup');
  const events = [...pickup.events].reverse().map((event) => ({
    key: `${event.at}|${event.status}`,
    title: event.status,
    note: event.note,
    meta: [event.location, formatDateTime(event.at)].filter(Boolean).join(' · '),
  }));

  return (
    <SectionCard title={t('ecommPortal.returns.pickup')}>
      <Stack spacing={1.5}>
        {pickup.last_error ? <Alert severity="error">{pickup.last_error}</Alert> : null}
        <InfoRows
          lines={[
            { key: 'status', label: t('shell.common.status'), value: pickup.tracking_status || pickup.status || EM_DASH },
            { key: 'courier', label: t('ecommPortal.shipping.courier'), value: pickup.courier_name || EM_DASH },
            { key: 'awb', label: t('ecommPortal.orders.awb'), value: pickup.awb || EM_DASH },
          ]}
        />
        {events.length > 0 ? <EventTimeline events={events} ariaLabel={t('ecommPortal.returns.pickupHistory')} /> : null}
      </Stack>
      {canBook || canRestock ? <Divider sx={{ my: 2 }} /> : null}
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        {canBook ? (
          <DuncitButton
            size="small"
            variant="contained"
            startIcon={<LocalShippingIcon />}
            disabled={busy}
            onClick={() => runAction(() => book({ variables: { id: item.id } }), t('ecommPortal.returns.pickupBooked'))}
          >
            {bookLabel}
          </DuncitButton>
        ) : null}
        {canRestock ? (
          <DuncitButton
            size="small"
            variant="outlined"
            startIcon={<InventoryIcon />}
            disabled={busy}
            onClick={() => runAction(() => restock({ variables: { id: item.id } }), t('ecommPortal.returns.restocked'))}
          >
            {t('ecommPortal.returns.restock')}
          </DuncitButton>
        ) : null}
      </Stack>
      {item.status === 'REQUESTED' ? (
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
          {t('ecommPortal.returns.pickupAfterApproval')}
        </Typography>
      ) : null}
    </SectionCard>
  );
}
