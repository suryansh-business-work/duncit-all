import type { NestedCatalogue } from '../catalogue';

/**
 * Product-order fulfilment copy — a namespace of its own, not a surface's.
 *
 * The buyer reads these words in mWeb's Pod History and in the app; the seller
 * reads them in the Products portal while working the same order. They were in
 * three places before: `mweb.podHistory.status*` for the two apps, and a
 * `humaniseStatus` in the portal that turned `AWB_ASSIGNED` into "Awb Assigned"
 * and reached no translator at all.
 *
 * `mweb.podHistory.status*` keeps its entries until the new keys are seeded;
 * nothing reads them any more.
 */
export const FULFILMENT_BUNDLE: NestedCatalogue = {
  fulfilment: {
    methodShip: 'Ship to me',
    methodPickup: 'Pick up at venue',

    statusPending: 'Order placed',
    statusAwaitingShipment: 'Preparing shipment',
    statusAwbAssigned: 'Courier assigned',
    statusPickupScheduled: 'Pickup scheduled',
    statusShipped: 'Shipped',
    statusOutForDelivery: 'Out for delivery',
    statusDelivered: 'Delivered',
    statusReadyForPickup: 'Ready for pickup',
    statusPickedUp: 'Picked up',
    statusCancelled: 'Cancelled',
    statusReturnedToOrigin: 'Returned to origin',
    statusFailed: 'Fulfilment failed',

    noTrackingUpdates: 'No tracking updates yet.',
  },
};
