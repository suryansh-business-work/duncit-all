import { useState } from 'react';
import { Divider, Stack } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { SectionCard } from '@duncit/ui';
import type { StoreAdminOrder } from '../queries';
import ShipmentDocuments from './ShipmentDocuments';
import ShipmentFacts from './ShipmentFacts';
import { ShipmentAlerts, ShipmentButtons, ShipmentDialogs, shipmentState, type ShipmentDialog } from './ShipmentControls';
import { useShipmentActions } from './useShipmentActions';

/**
 * The shipment desk for one order: book it (the recommended courier, or one
 * picked here), fix the parcel or the ship-to address before booking, print
 * its documents, pull tracking and answer a failed delivery. Every alert the
 * server raised — a refused booking, a low wallet, an NDR — is said here with
 * the button that resolves it.
 */
export default function OrderShipmentCard({ detail }: Readonly<{ detail: StoreAdminOrder }>) {
  const { t } = useTranslation();
  const [dialog, setDialog] = useState<ShipmentDialog>(null);
  const actions = useShipmentActions(detail.order.id);
  const state = shipmentState(detail);
  const { order } = detail;
  const workable = !order.cancelled_at && order.fulfilment_status !== 'DELIVERED';
  return (
    <SectionCard title={t('ecommPortal.orders.shipment')}>
      <Stack spacing={1.5}>
        <ShipmentAlerts detail={detail} state={state} />
        <ShipmentFacts detail={detail} />
      </Stack>
      {workable ? (
        <>
          <Divider sx={{ my: 2 }} />
          <ShipmentButtons state={state} actions={actions} onDialog={setDialog} />
        </>
      ) : null}
      {state.booked ? <ShipmentDocuments hasAwb={state.hasAwb} busy={actions.busy} onDocument={actions.document} /> : null}
      <ShipmentDialogs detail={detail} dialog={dialog} actions={actions} onClose={() => setDialog(null)} />
    </SectionCard>
  );
}
