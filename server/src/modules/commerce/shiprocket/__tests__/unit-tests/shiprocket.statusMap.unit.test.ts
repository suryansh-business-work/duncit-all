import { mapShiprocketStatus } from '../../shiprocket.statusMap';

/**
 * ShipRocket has dozens of granular states and adds more without telling us, so
 * this map is deliberately lenient. What it must never do is lose an order: an
 * unknown label has to land somewhere sane rather than throw or read as blank.
 */
describe('mapShiprocketStatus', () => {
  it('parks an empty or missing status at AWAITING_SHIPMENT', () => {
    expect(mapShiprocketStatus('')).toBe('AWAITING_SHIPMENT');
    expect(mapShiprocketStatus('   ')).toBe('AWAITING_SHIPMENT');
    expect(mapShiprocketStatus(null)).toBe('AWAITING_SHIPMENT');
    expect(mapShiprocketStatus(undefined)).toBe('AWAITING_SHIPMENT');
  });

  it.each([
    ['RTO INITIATED', 'RTO'],
    ['RTO DELIVERED', 'RTO'],
    // Any other RTO_* variant ShipRocket invents is still a return.
    ['RTO_NDR', 'RTO'],
    ['CANCELED', 'CANCELLED'],
    ['CANCELLED', 'CANCELLED'],
    ['CANCELLATION REQUESTED', 'CANCELLED'],
    ['DELIVERED', 'DELIVERED'],
    ['OUT FOR DELIVERY', 'OUT_FOR_DELIVERY'],
    ['PICKUP SCHEDULED', 'PICKUP_SCHEDULED'],
    ['MANIFEST GENERATED', 'PICKUP_SCHEDULED'],
    ['AWB ASSIGNED', 'PICKUP_SCHEDULED'],
  ])('maps the exact label %s to %s', (raw, expected) => {
    expect(mapShiprocketStatus(raw)).toBe(expected);
  });

  it('is case- and whitespace-insensitive', () => {
    expect(mapShiprocketStatus('  delivered  ')).toBe('DELIVERED');
  });

  it.each([
    ['Shipment is out for delivery today', 'OUT_FOR_DELIVERY'],
    ['Successfully delivered to consignee', 'DELIVERED'],
    ['IN TRANSIT', 'SHIPPED'],
    ['Shipped from origin hub', 'SHIPPED'],
    ['Dispatched to destination', 'SHIPPED'],
    ['Pickup exception raised', 'PICKUP_SCHEDULED'],
    ['Manifest closed', 'PICKUP_SCHEDULED'],
    ['AWB reassigned', 'PICKUP_SCHEDULED'],
  ])('recognises %s from its wording alone', (raw, expected) => {
    expect(mapShiprocketStatus(raw)).toBe(expected);
  });

  // The last resort: a label we have never seen still leaves the order visibly
  // on its way rather than dropping it out of the timeline.
  it('falls back to SHIPPED for a label it does not recognise', () => {
    expect(mapShiprocketStatus('SOMETHING BRAND NEW')).toBe('SHIPPED');
  });
});
