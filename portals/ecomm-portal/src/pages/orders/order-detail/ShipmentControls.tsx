import { Alert, Stack } from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import SyncIcon from '@mui/icons-material/Sync';
import StraightenIcon from '@mui/icons-material/Straighten';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import { useDateFormat } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { StoreAdminOrder } from '../queries';
import OrderAddressForm from './order-address';
import OrderCourierForm from './order-courier';
import OrderNdrForm from './order-ndr';
import OrderParcelForm from './order-parcel';
import type { ShipmentActions } from './useShipmentActions';

export type ShipmentDialog = 'parcel' | 'courier' | 'address' | 'ndr' | null;

/** Where the shipment stands, worked out once so every piece reads the same answer. */
export function shipmentState(detail: StoreAdminOrder) {
  const { order, shipment } = detail;
  return {
    booked: Boolean(shipment.shiprocket_order_id),
    hasAwb: Boolean(order.shiprocket.awb),
    ndr: order.fulfilment_status === 'NDR' && shipment.alert === 'NDR',
    overridden: shipment.parcel.source === 'OVERRIDE',
  };
}

type State = ReturnType<typeof shipmentState>;

interface AlertsProps {
  detail: StoreAdminOrder;
  state: State;
  /** Opens the ship-to address dialog — the fix for an address the courier refuses. */
  onFixAddress: (() => void) | null;
}

/**
 * Every alert the server raised about this shipment, in words. The stored
 * error is what the LAST booking attempt said, dated — so a reason that has
 * since been fixed (a refused login, say) reads as history, not as now.
 */
export function ShipmentAlerts({ detail, state, onFixAddress }: Readonly<AlertsProps>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const { order, shipment } = detail;
  const addressAlert = !state.booked && shipment.address_problems.length > 0;
  const attemptedAt = order.shiprocket.last_synced_at;
  const lastError = attemptedAt
    ? t('ecommPortal.shipping.lastAttempt', { vars: { at: formatDateTime(attemptedAt), reason: order.last_error } })
    : order.last_error;
  const fixAddress = onFixAddress ? (
    <DuncitButton size="small" color="inherit" startIcon={<HomeWorkIcon />} onClick={onFixAddress}>
      {t('ecommPortal.shipping.editAddress')}
    </DuncitButton>
  ) : null;
  return (
    <>
      {order.last_error ? <Alert severity="error">{lastError}</Alert> : null}
      {shipment.alert === 'LOW_WALLET' ? <Alert severity="warning">{shipment.alert_message}</Alert> : null}
      {state.ndr ? <Alert severity="error">{t('ecommPortal.shipping.ndrAlert', { vars: { reason: shipment.alert_message } })}</Alert> : null}
      {addressAlert ? (
        <Alert severity="warning" action={fixAddress}>
          {t('ecommPortal.shipping.addressNeeds', { vars: { needs: shipment.address_problems.join(', ') } })}
        </Alert>
      ) : null}
    </>
  );
}

interface ButtonsProps {
  state: State;
  actions: ShipmentActions;
  onDialog: (dialog: ShipmentDialog) => void;
}

/** Before booking: fix the parcel or the address. */
function PreBookingButtons({ state, actions, onDialog }: Readonly<ButtonsProps>) {
  const { t } = useTranslation();
  return (
    <>
      <DuncitButton size="small" variant="outlined" startIcon={<StraightenIcon />} disabled={actions.busy} onClick={() => onDialog('parcel')}>
        {t('ecommPortal.shipping.editParcel')}
      </DuncitButton>
      <DuncitButton size="small" variant="outlined" startIcon={<HomeWorkIcon />} disabled={actions.busy} onClick={() => onDialog('address')}>
        {t('ecommPortal.shipping.editAddress')}
      </DuncitButton>
      {state.overridden ? (
        <DuncitButton size="small" disabled={actions.busy} onClick={() => actions.setParcel(null)}>
          {t('ecommPortal.shipping.useComputedParcel')}
        </DuncitButton>
      ) : null}
    </>
  );
}

/** The moves available now: book or retry, pick a courier, answer an NDR, pull tracking. */
export function ShipmentButtons({ state, actions, onDialog }: Readonly<ButtonsProps>) {
  const { t } = useTranslation();
  const bookLabel = state.booked ? t('ecommPortal.shipping.retryBooking') : t('ecommPortal.shipping.book');
  const courierPick = state.booked && !state.hasAwb;
  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
      {state.hasAwb ? null : (
        <DuncitButton size="small" variant="contained" startIcon={<LocalShippingIcon />} disabled={actions.busy} onClick={() => actions.book(null)}>
          {bookLabel}
        </DuncitButton>
      )}
      {courierPick ? (
        <DuncitButton size="small" variant="outlined" disabled={actions.busy} onClick={() => onDialog('courier')}>
          {t('ecommPortal.shipping.chooseCourier')}
        </DuncitButton>
      ) : null}
      {state.booked ? null : <PreBookingButtons state={state} actions={actions} onDialog={onDialog} />}
      {state.ndr ? (
        <DuncitButton size="small" variant="contained" color="error" startIcon={<ReportProblemIcon />} disabled={actions.busy} onClick={() => onDialog('ndr')}>
          {t('ecommPortal.shipping.answerNdr')}
        </DuncitButton>
      ) : null}
      {state.booked ? (
        <DuncitButton size="small" startIcon={<SyncIcon />} disabled={actions.busy} onClick={actions.refreshTracking}>
          {t('ecommPortal.orders.refreshTracking')}
        </DuncitButton>
      ) : null}
    </Stack>
  );
}

interface DialogsProps {
  detail: StoreAdminOrder;
  dialog: ShipmentDialog;
  actions: ShipmentActions;
  onClose: () => void;
}

/** The one dialog that is open, if any. */
export function ShipmentDialogs({ detail, dialog, actions, onClose }: Readonly<DialogsProps>) {
  const { order, shipment } = detail;
  switch (dialog) {
    case 'parcel':
      return <OrderParcelForm parcel={shipment.parcel} busy={actions.busy} onClose={onClose} onSubmit={actions.setParcel} />;
    case 'courier':
      return <OrderCourierForm orderId={order.id} busy={actions.busy} onClose={onClose} onSubmit={actions.book} />;
    case 'address':
      return (
        <OrderAddressForm address={order.shipping_address} problems={shipment.address_problems} busy={actions.busy} onClose={onClose} onSubmit={actions.updateAddress} />
      );
    case 'ndr':
      return <OrderNdrForm reason={shipment.alert_message} busy={actions.busy} onClose={onClose} onSubmit={actions.answerNdr} />;
    default:
      return null;
  }
}
