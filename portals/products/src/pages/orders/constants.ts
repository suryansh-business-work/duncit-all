import {
  ALL_FULFILMENT_STATUSES,
  FULFILMENT_TONE,
  statusLabel,
  TONE_CHIP_COLOR,
  type FulfilmentStatus,
  type FulfilmentTranslate,
} from '@duncit/utils';

/**
 * The seller console's view of an order's status.
 *
 * The vocabulary and both forward flows now come from @duncit/utils, shared with
 * mWeb and the native app — the buyer sees the same order and used to be told a
 * different story: their SHIP ladder started at "Preparing shipment" (so a
 * just-placed order looked worked) and their PICKUP ladder had no
 * "Pickup scheduled" rung at all (so an order this console had scheduled read
 * back as "Order placed").
 */
export type { FulfilmentMethod, FulfilmentStatus } from '@duncit/utils';
export { PICKUP_FLOW, SHIP_FLOW } from '@duncit/utils';

export const ALL_STATUSES: readonly FulfilmentStatus[] = ALL_FULFILMENT_STATUSES;

/** Status → MUI chip colour, via the shared tone so no surface picks its own. */
export const STATUS_COLOR: Record<FulfilmentStatus, 'default' | 'info' | 'success' | 'warning' | 'error'> =
  Object.fromEntries(
    ALL_FULFILMENT_STATUSES.map((status) => [status, TONE_CHIP_COLOR[FULFILMENT_TONE[status]]]),
  ) as Record<FulfilmentStatus, 'default' | 'info' | 'success' | 'warning' | 'error'>;

/**
 * The words for a status.
 *
 * This replaced a `humaniseStatus` that title-cased the raw code — it rendered
 * "Awb Assigned" and "Rto", and reached no translator at all (rule 38).
 */
export const humaniseStatus = (status: string, t: FulfilmentTranslate): string =>
  statusLabel(status, t);
