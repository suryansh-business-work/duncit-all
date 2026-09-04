jest.mock('../../shiprocket.gateway', () => ({
  isShiprocketConfigured: jest.fn(),
  getServiceability: jest.fn(),
  createOrderAdhoc: jest.fn(),
  assignAwb: jest.fn(),
  trackByShipment: jest.fn(),
}));

import { Types } from 'mongoose';
import { shiprocketService } from '../../shiprocket.service';
import {
  isShiprocketConfigured,
  createOrderAdhoc,
  assignAwb,
  trackByShipment,
} from '../../shiprocket.gateway';
import { ProductOrderModel } from '@modules/commerce/productOrder/productOrder.model';
import { EnvEntryModel } from '@modules/platform/envEntry/envEntry.model';

/**
 * The shipment WRITE path — the half of shiprocketService that spends money.
 * Every call here books a courier and none of it can be undone, so the guards
 * deciding whether to call at all are tested as carefully as the payload sent.
 * The read/quote half lives in shiprocket.service.int.test.ts.
 */
const mockConfigured = isShiprocketConfigured as jest.Mock;
const mockAdhoc = createOrderAdhoc as jest.Mock;
const mockAwb = assignAwb as jest.Mock;
const mockTrack = trackByShipment as jest.Mock;

let seq = 0;
const seedOrder = (over: Record<string, unknown> = {}) =>
  ProductOrderModel.create({
    order_no: `DUN-ORD-SHIP-${++seq}`,
    buyer_id: new Types.ObjectId(),
    payment_id: new Types.ObjectId(),
    items_total: 400,
    total: 400,
    fulfilment_method: 'SHIP',
    line_items: [
      { product_id: new Types.ObjectId(), name: 'Tee', qty: 2, unit_cost: 200, gross: 400, weight_kg: 0.4 },
    ],
    ...over,
  });

/** The payload handed to ShipRocket on the most recent ad-hoc order call. */
const sentPayload = () => mockAdhoc.mock.calls.at(-1)?.[0] as Record<string, any>;

const okAdhoc = (over: Record<string, unknown> = {}) => ({
  order_id: 'SR-1',
  shipment_id: 'SH-1',
  status: 'NEW',
  ...over,
});

describe('shiprocketService.createShipment', () => {
  beforeEach(() => {
    mockConfigured.mockResolvedValue(true);
    mockAdhoc.mockResolvedValue(okAdhoc());
    mockAwb.mockResolvedValue({
      awb: 'AWB-1',
      courier_name: 'Delhivery',
      courier_company_id: '7',
      label_url: 'https://labels.example/1.pdf',
    });
  });

  it('ignores a PICKUP order — nothing ships, so nothing is ordered', async () => {
    const order = await seedOrder({ fulfilment_method: 'PICKUP' });
    const result = await shiprocketService.createShipment(order);
    expect(mockAdhoc).not.toHaveBeenCalled();
    expect(result.fulfilment_status).toBe('PENDING');
  });

  // A second ad-hoc order ships a second parcel and pays a second courier
  // charge, with no undo — a retry has to stop at the guard, not at the API.
  it('never re-orders a shipment that already has a ShipRocket order id', async () => {
    const order = await seedOrder({ shiprocket: { order_id: 'SR-EXISTING' } });
    await shiprocketService.createShipment(order);
    expect(mockAdhoc).not.toHaveBeenCalled();
  });

  it('does nothing while ShipRocket is unconfigured', async () => {
    mockConfigured.mockResolvedValue(false);
    const result = await shiprocketService.createShipment(await seedOrder());
    expect(mockAdhoc).not.toHaveBeenCalled();
    expect(result.fulfilment_status).toBe('PENDING');
  });

  it('orders the parcel, assigns an AWB and records the courier', async () => {
    const result = await shiprocketService.createShipment(
      await seedOrder({ pickup_location_id: 'North Hub' }),
    );
    expect(mockAwb).toHaveBeenCalledWith('SH-1');
    expect(result.fulfilment_status).toBe('AWB_ASSIGNED');
    expect(result.shiprocket).toMatchObject({
      order_id: 'SR-1',
      shipment_id: 'SH-1',
      awb: 'AWB-1',
      courier_name: 'Delhivery',
      courier_company_id: '7',
      label_url: 'https://labels.example/1.pdf',
    });
    expect(result.shiprocket.last_synced_at).toBeInstanceOf(Date);
    expect(result.last_error).toBe('');
    expect(result.tracking_events.at(-1)).toMatchObject({
      status: 'AWB_ASSIGNED',
      note: 'ShipRocket shipment created',
    });
  });

  it('stays AWAITING_SHIPMENT when ShipRocket returns no shipment to assign', async () => {
    mockAdhoc.mockResolvedValue(okAdhoc({ order_id: 'SR-2', shipment_id: '' }));
    const result = await shiprocketService.createShipment(await seedOrder());
    expect(mockAwb).not.toHaveBeenCalled();
    expect(result.fulfilment_status).toBe('AWAITING_SHIPMENT');
  });

  it('stays AWAITING_SHIPMENT when the AWB call comes back without a waybill', async () => {
    mockAwb.mockResolvedValue({ awb: '', courier_name: '', courier_company_id: '', label_url: '' });
    const result = await shiprocketService.createShipment(await seedOrder());
    expect(result.fulfilment_status).toBe('AWAITING_SHIPMENT');
    expect(result.shiprocket.awb).toBe('');
  });

  // A fulfilment hiccup must never fail a checkout that is already paid for.
  it('records FAILED and the reason instead of throwing', async () => {
    mockAdhoc.mockRejectedValue(new Error('SR 500'));
    const result = await shiprocketService.createShipment(await seedOrder());
    expect(result.fulfilment_status).toBe('FAILED');
    expect(result.last_error).toBe('SR 500');
  });

  // Losing the database on the way to writing FAILED still must not throw:
  // the payment is already taken and the caller has nothing to undo.
  it('swallows a save that fails while recording the failure', async () => {
    mockAdhoc.mockRejectedValue(new Error('SR 500'));
    const order = await seedOrder();
    jest.spyOn(order, 'save').mockRejectedValue(new Error('mongo down'));
    const result = await shiprocketService.createShipment(order);
    expect(result.fulfilment_status).toBe('FAILED');
  });
});

describe('shiprocketService pickup origin', () => {
  beforeEach(() => {
    mockConfigured.mockResolvedValue(true);
    mockAdhoc.mockResolvedValue(okAdhoc({ order_id: 'SR-P', shipment_id: '' }));
  });

  afterEach(async () => {
    await EnvEntryModel.deleteMany({});
  });

  it("ships from the order's own warehouse nickname when it has one", async () => {
    await shiprocketService.createShipment(await seedOrder({ pickup_location_id: 'South Hub' }));
    expect(sentPayload()).toMatchObject({ pickup_location: 'South Hub' });
  });

  it('falls back to the default pickup location configured in the Tech portal', async () => {
    await EnvEntryModel.create({
      name: 'ShipRocket',
      category: 'SHIPROCKET',
      is_active: true,
      is_default: true,
      config: { pickup_location: 'Central Hub' },
    });
    await shiprocketService.createShipment(await seedOrder());
    expect(sentPayload()).toMatchObject({ pickup_location: 'Central Hub' });
  });

  it('falls back to Primary when neither the order nor the config names one', async () => {
    await shiprocketService.createShipment(await seedOrder());
    expect(sentPayload()).toMatchObject({ pickup_location: 'Primary' });
  });
});

describe('shiprocketService ad-hoc order payload', () => {
  beforeEach(() => {
    mockConfigured.mockResolvedValue(true);
    mockAdhoc.mockResolvedValue(okAdhoc({ order_id: 'SR-B', shipment_id: '' }));
  });

  it('splits the shipping name, keeps its address and sends a 10-digit phone', async () => {
    const order = await seedOrder({
      shipping_address: {
        name: 'Asha Rani Devi',
        phone: '+91 98765-43210',
        email: 'asha@example.com',
        line1: '12 MG Rd',
        line2: 'Flat 3',
        city: 'Pune',
        state: 'MH',
        pincode: '411001',
      },
    });
    await shiprocketService.createShipment(order);
    expect(sentPayload()).toMatchObject({
      order_id: order.order_no,
      billing_customer_name: 'Asha',
      billing_last_name: 'Rani Devi',
      billing_address: '12 MG Rd',
      billing_address_2: 'Flat 3',
      billing_city: 'Pune',
      billing_state: 'MH',
      billing_pincode: '411001',
      billing_country: 'India',
      billing_email: 'asha@example.com',
      billing_phone: '9876543210',
      shipping_is_billing: true,
      payment_method: 'Prepaid',
      sub_total: 400,
    });
  });

  // ShipRocket rejects a blank surname, so a one-word name still needs one.
  it('gives a single-word name a placeholder surname', async () => {
    await shiprocketService.createShipment(await seedOrder({ shipping_address: { name: 'Asha' } }));
    expect(sentPayload()).toMatchObject({ billing_customer_name: 'Asha', billing_last_name: '.' });
  });

  it("falls back to the buyer's own name, email and phone with no shipping address", async () => {
    await shiprocketService.createShipment(
      await seedOrder({
        buyer_name: 'Ravi Kumar',
        buyer_email: 'ravi@example.com',
        buyer_phone: '09812345678',
      }),
    );
    expect(sentPayload()).toMatchObject({
      billing_customer_name: 'Ravi',
      billing_last_name: 'Kumar',
      billing_email: 'ravi@example.com',
      billing_phone: '9812345678',
      billing_address: '',
      billing_address_2: '',
      billing_city: '',
      billing_pincode: '',
      billing_state: '',
    });
  });

  it('calls a nameless, phoneless order Customer and sends no phone', async () => {
    await shiprocketService.createShipment(await seedOrder({ buyer_name: '', buyer_phone: null }));
    expect(sentPayload()).toMatchObject({ billing_customer_name: 'Customer', billing_phone: '' });
  });

  it('sums the parcel weight over quantities and floors the box at its minimum', async () => {
    await shiprocketService.createShipment(await seedOrder());
    // 2 x 0.4 kg, and no line carries dimensions -> the 10/10/5 cm floor.
    expect(sentPayload()).toMatchObject({ weight: 0.8, length: 10, breadth: 10, height: 5 });
  });

  it('takes the largest dimension across the lines and floors a weightless order', async () => {
    await shiprocketService.createShipment(
      await seedOrder({
        line_items: [
          {
            product_id: new Types.ObjectId(),
            name: 'Box',
            sku: 'BX-1',
            qty: 1,
            unit_cost: 10,
            gross: 10,
            length_cm: 40,
            breadth_cm: 6,
            height_cm: 30,
          },
          {
            product_id: new Types.ObjectId(),
            name: 'Pin',
            qty: 1,
            unit_cost: 5,
            gross: 5,
            length_cm: 2,
            breadth_cm: 22,
            height_cm: 1,
          },
        ],
      }),
    );
    expect(sentPayload()).toMatchObject({ length: 40, breadth: 22, height: 30, weight: 0.1 });
    // ShipRocket requires a SKU per line, so a line without one is sent under
    // its own name rather than an empty string.
    expect(sentPayload().order_items).toEqual([
      { name: 'Box', sku: 'BX-1', units: 1, selling_price: 10 },
      { name: 'Pin', sku: 'Pin', units: 1, selling_price: 5 },
    ]);
  });
});

describe('shiprocketService.refreshTracking', () => {
  it('does not call ShipRocket while it is unconfigured', async () => {
    mockConfigured.mockResolvedValue(false);
    await shiprocketService.refreshTracking(await seedOrder({ shiprocket: { shipment_id: 'SH-9' } }));
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('does not call ShipRocket before a shipment exists', async () => {
    mockConfigured.mockResolvedValue(true);
    await shiprocketService.refreshTracking(await seedOrder());
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('maps the live status onto the order and logs the latest activity', async () => {
    mockConfigured.mockResolvedValue(true);
    mockTrack.mockResolvedValue({
      current_status: 'OUT FOR DELIVERY',
      // A blank activity status falls back to the shipment-level one.
      activities: [{ status: '', location: 'Pune Hub', note: 'Out with rider', date: '' }],
    });
    const result = await shiprocketService.refreshTracking(
      await seedOrder({ shiprocket: { shipment_id: 'SH-9' } }),
    );
    expect(mockTrack).toHaveBeenCalledWith('SH-9');
    expect(result.fulfilment_status).toBe('OUT_FOR_DELIVERY');
    expect(result.shiprocket.tracking_status).toBe('OUT FOR DELIVERY');
    expect(result.shiprocket.last_synced_at).toBeInstanceOf(Date);
    expect(result.tracking_events.at(-1)).toMatchObject({
      status: 'OUT FOR DELIVERY',
      location: 'Pune Hub',
      note: 'Out with rider',
    });
  });

  it('keeps the activity label when the activity carries one of its own', async () => {
    mockConfigured.mockResolvedValue(true);
    mockTrack.mockResolvedValue({
      current_status: 'IN TRANSIT',
      activities: [{ status: 'Reached destination hub', location: 'Delhi', note: '', date: '' }],
    });
    const result = await shiprocketService.refreshTracking(
      await seedOrder({ shiprocket: { shipment_id: 'SH-10' } }),
    );
    expect(result.fulfilment_status).toBe('SHIPPED');
    expect(result.tracking_events.at(-1)?.status).toBe('Reached destination hub');
  });
});

describe('shiprocketService.applyWebhookEvent', () => {
  beforeEach(() => {
    mockConfigured.mockResolvedValue(true);
  });

  it('matches the order by AWB and applies the status', async () => {
    await seedOrder({ shiprocket: { awb: 'AWB-HOOK', shipment_id: 'SH-H' } });
    const result = await shiprocketService.applyWebhookEvent({
      awb: 'AWB-HOOK',
      current_status: 'DELIVERED',
    });
    expect(result?.fulfilment_status).toBe('DELIVERED');
    // The hook carries no activity list, so no timeline row is invented.
    expect(result?.tracking_events).toHaveLength(0);
  });

  it('matches on the ShipRocket order id when the hook carries no AWB', async () => {
    await seedOrder({ shiprocket: { order_id: 'SR-HOOK' } });
    const result = await shiprocketService.applyWebhookEvent({
      channel_order_id: 'SR-HOOK',
      shipment_status: 'IN TRANSIT',
    });
    expect(result?.fulfilment_status).toBe('SHIPPED');
  });

  it('answers null for an event about an order we do not have', async () => {
    expect(await shiprocketService.applyWebhookEvent({ awb: 'AWB-UNKNOWN' })).toBeNull();
  });

  // An empty status maps to AWAITING_SHIPMENT rather than crashing, so a hook
  // shape we have not seen never loses the order.
  it('parks the order at AWAITING_SHIPMENT when the hook names no status', async () => {
    await seedOrder({ shiprocket: { awb: 'AWB-BARE' }, fulfilment_status: 'SHIPPED' });
    const result = await shiprocketService.applyWebhookEvent({ awb: 'AWB-BARE' });
    expect(result?.fulfilment_status).toBe('AWAITING_SHIPMENT');
    expect(result?.shiprocket.tracking_status).toBe('');
  });
});
