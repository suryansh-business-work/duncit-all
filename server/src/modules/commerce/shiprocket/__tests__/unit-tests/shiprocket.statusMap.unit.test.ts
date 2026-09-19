import { FULFILMENT_STATUSES, type FulfilmentStatus } from '@modules/commerce/productOrder/productOrder.model';
import { isFinalStatus, mapShiprocketStatus, nextStatus } from '../../shiprocket.statusMap';

/**
 * ShipRocket has dozens of granular labels and adds new ones without notice.
 * The map must place the ones we track and say nothing (null) about the rest —
 * a guess would move an order somewhere it isn't. `nextStatus` then decides
 * whether a mapped label may move the order at all.
 */
describe('mapShiprocketStatus', () => {
  it.each([[''], ['   '], [null], [undefined]])('answers null for an empty label (%p)', (raw) => {
    expect(mapShiprocketStatus(raw)).toBeNull();
  });

  it.each<[string, FulfilmentStatus]>([
    ['RTO DELIVERED', 'RTO_DELIVERED'],
    ['RTO_DELIVERED', 'RTO_DELIVERED'],
    ['RTO INITIATED', 'RTO'],
    // "IN TRANSIT" inside an RTO label is still the parcel coming back.
    ['RTO IN TRANSIT', 'RTO'],
    ['RTO OFD', 'RTO'],
    ['Return to Origin', 'RTO'],
    ['UNDELIVERED', 'NDR'],
    ['NDR', 'NDR'],
    ['DELIVERY FAILED', 'NDR'],
    ['DELIVERY ATTEMPTED', 'NDR'],
    ['LOST', 'LOST'],
    ['UNTRACEABLE', 'LOST'],
    ['DESTROYED', 'LOST'],
    ['DISPOSED OFF', 'LOST'],
    ['CANCELED', 'CANCELLED'],
    ['CANCELLED', 'CANCELLED'],
    ['CANCELLED BEFORE PICKUP', 'CANCELLED'],
    ['OUT FOR DELIVERY', 'OUT_FOR_DELIVERY'],
    ['DELIVERED', 'DELIVERED'],
    ['PICKED UP', 'SHIPPED'],
    ['IN TRANSIT', 'SHIPPED'],
    ['SHIPPED', 'SHIPPED'],
    ['REACHED AT DESTINATION HUB', 'SHIPPED'],
    ['IN FLIGHT', 'SHIPPED'],
    ['MISROUTED', 'SHIPPED'],
    ['SHIPMENT DELAYED', 'SHIPPED'],
    ['PICKUP SCHEDULED', 'PICKUP_SCHEDULED'],
    ['PICKUP RESCHEDULED', 'PICKUP_SCHEDULED'],
    ['OUT FOR PICKUP', 'PICKUP_SCHEDULED'],
    ['PICKUP EXCEPTION', 'PICKUP_SCHEDULED'],
    ['MANIFEST GENERATED', 'PICKUP_SCHEDULED'],
    ['AWB ASSIGNED', 'AWB_ASSIGNED'],
  ])('maps %s to %s', (raw, expected) => {
    expect(mapShiprocketStatus(raw)).toBe(expected);
  });

  it('ignores case, surrounding space and underscores', () => {
    expect(mapShiprocketStatus('  delivered  ')).toBe('DELIVERED');
    expect(mapShiprocketStatus('out_for_delivery')).toBe('OUT_FOR_DELIVERY');
  });

  // "UNDELIVERED" contains "DELIVERED": the specific rule has to win.
  it('never reads a failed delivery as a delivery', () => {
    expect(mapShiprocketStatus('Undelivered - consignee unavailable')).toBe('NDR');
  });

  it.each([['NEW'], ['SOMETHING BRAND NEW'], ['CANCELLATION REQUESTED']])(
    'answers null for a label it does not track (%s)',
    (raw) => {
      expect(mapShiprocketStatus(raw)).toBeNull();
    }
  );
});

describe('nextStatus', () => {
  it('stays put when tracking reports nothing, or the same status', () => {
    expect(nextStatus('SHIPPED', null)).toBeNull();
    expect(nextStatus('SHIPPED', 'SHIPPED')).toBeNull();
  });

  it.each<[FulfilmentStatus, FulfilmentStatus]>([
    ['AWAITING_SHIPMENT', 'AWB_ASSIGNED'],
    ['AWB_ASSIGNED', 'PICKUP_SCHEDULED'],
    ['PICKUP_SCHEDULED', 'SHIPPED'],
    ['SHIPPED', 'OUT_FOR_DELIVERY'],
    ['OUT_FOR_DELIVERY', 'DELIVERED'],
    ['FAILED', 'SHIPPED'],
    ['SHIPPED', 'RTO'],
    ['NDR', 'RTO'],
    ['RTO', 'RTO_DELIVERED'],
    ['NDR', 'RTO_DELIVERED'],
    ['SHIPPED', 'LOST'],
    ['PICKUP_SCHEDULED', 'CANCELLED'],
  ])('moves %s forward to %s', (current, incoming) => {
    expect(nextStatus(current, incoming)).toBe(incoming);
  });

  // A late "IN TRANSIT" webhook must not pull a parcel back.
  it.each<[FulfilmentStatus, FulfilmentStatus]>([
    ['SHIPPED', 'PICKUP_SCHEDULED'],
    ['OUT_FOR_DELIVERY', 'AWB_ASSIGNED'],
    ['RTO', 'SHIPPED'],
    ['RTO', 'NDR'],
    ['RTO', 'OUT_FOR_DELIVERY'],
  ])('never moves %s back to %s', (current, incoming) => {
    expect(nextStatus(current, incoming)).toBeNull();
  });

  // The in-flight states share a rank: out for delivery, fail, go out again.
  it('lets a parcel go between out-for-delivery and a failed delivery both ways', () => {
    expect(nextStatus('OUT_FOR_DELIVERY', 'NDR')).toBe('NDR');
    expect(nextStatus('NDR', 'OUT_FOR_DELIVERY')).toBe('OUT_FOR_DELIVERY');
    expect(nextStatus('NDR', 'SHIPPED')).toBe('SHIPPED');
  });

  it.each<[FulfilmentStatus, FulfilmentStatus]>([
    ['DELIVERED', 'RTO'],
    ['DELIVERED', 'NDR'],
    ['RTO_DELIVERED', 'DELIVERED'],
    ['LOST', 'DELIVERED'],
    ['CANCELLED', 'SHIPPED'],
    ['PICKED_UP', 'DELIVERED'],
  ])('freezes the terminal status %s (ignores %s)', (current, incoming) => {
    expect(nextStatus(current, incoming)).toBeNull();
  });
});

describe('isFinalStatus', () => {
  it('is true exactly for the states nothing moves on from', () => {
    const finals = new Set(FULFILMENT_STATUSES.filter(isFinalStatus));
    expect(finals).toEqual(new Set(['CANCELLED', 'DELIVERED', 'LOST', 'PICKED_UP', 'RTO_DELIVERED']));
  });
});
