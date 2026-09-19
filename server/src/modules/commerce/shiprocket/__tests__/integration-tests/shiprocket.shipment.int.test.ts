jest.mock('../../shiprocket.gateway', () => ({
  assignAwb: jest.fn(),
  couriersForOrder: jest.fn(),
  createOrderAdhoc: jest.fn(),
  findOrderByChannelId: jest.fn(),
  generateLabel: jest.fn(),
  generatePickup: jest.fn(),
  manifestFor: jest.fn(),
  printInvoice: jest.fn(),
  walletBalance: jest.fn(),
}));

import { shiprocketError } from '../../shiprocket.client';
import {
  assignAwb,
  couriersForOrder,
  createOrderAdhoc,
  findOrderByChannelId,
  generatePickup,
  walletBalance,
  type CourierOption,
} from '../../shiprocket.gateway';
import { createShipment, setParcelOverride } from '../../shiprocket.shipment';
import { seedShiprocketAccount, WAREHOUSE } from './fake-shiprocket';
import { GURUGRAM, reloadOrder, seedPaidOrder, seedProduct } from './order-fixtures';

/**
 * The shipment pipeline's decisions — book, courier + wallet, pickup — with
 * the ShipRocket endpoints stubbed one by one. Each guard below is a parcel
 * that would otherwise have been booked wrong, or booked twice, with money
 * that cannot be taken back. The same pipeline against a fake ShipRocket is in
 * shiprocket.flow.int.test.ts.
 */
const mockFind = jest.mocked(findOrderByChannelId);
const mockCreate = jest.mocked(createOrderAdhoc);
const mockCouriers = jest.mocked(couriersForOrder);
const mockWallet = jest.mocked(walletBalance);
const mockAwb = jest.mocked(assignAwb);
const mockPickup = jest.mocked(generatePickup);

const courier = (id: string, name: string, rate: number, recommended = false): CourierOption => ({
  courier_company_id: id,
  courier_name: name,
  rate,
  etd: 'Sep 23, 2026',
  cod: true,
  rating: 4.2,
  recommended,
});

beforeEach(() => {
  mockFind.mockResolvedValue(null);
  mockCreate.mockResolvedValue({ order_id: '7300001', shipment_id: '6300001', status: 'NEW' });
  mockCouriers.mockResolvedValue([courier('12', 'Delhivery Surface', 68, true), courier('24', 'Xpressbees Surface', 74)]);
  mockWallet.mockResolvedValue(1500);
  mockAwb.mockImplementation(async (shipmentId, courierId) => ({
    awb: `1433${shipmentId}`,
    courier_name: '',
    courier_company_id: String(courierId ?? ''),
    label_url: 'https://labels.example/6300001.pdf',
  }));
  mockPickup.mockResolvedValue({ token: 'Reference No: 19461', scheduled_date: '2026-09-20 11:00:00' });
});

/** The ad-hoc order payload the most recent booking sent. */
const sentPayload = () => mockCreate.mock.calls.at(-1)?.[0] ?? {};

async function paidOrder(over: Record<string, unknown> = {}, productOver: Record<string, unknown> = {}) {
  await seedShiprocketAccount();
  const { order } = await seedPaidOrder({ product: await seedProduct(productOver), over });
  return order;
}

describe('createShipment — what it will not ship', () => {
  it('leaves a pickup order and a cancelled order alone', async () => {
    const pickup = await paidOrder({ fulfilment_method: 'PICKUP', fulfilment_status: 'PENDING', pickup_location_id: '' });
    const { order: cancelled } = await seedPaidOrder({ product: await seedProduct(), over: { cancelled_at: new Date() } });
    await createShipment(pickup);
    await createShipment(cancelled);
    expect(mockFind).not.toHaveBeenCalled();
    expect((await reloadOrder(pickup._id)).fulfilment_status).toBe('PENDING');
  });

  it('does nothing while ShipRocket is not configured', async () => {
    const { order } = await seedPaidOrder({ product: await seedProduct() });
    const result = await createShipment(order);
    expect(result.fulfilment_status).toBe('AWAITING_SHIPMENT');
    expect(mockFind).not.toHaveBeenCalled();
  });

  it('refuses an autofilled "India" address before calling ShipRocket, saying what to fix', async () => {
    const order = await paidOrder({ shipping_address: { ...GURUGRAM, line1: 'India', city: 'India' } });
    await createShipment(order);
    const failed = await reloadOrder(order._id);
    expect(failed.fulfilment_status).toBe('FAILED');
    expect(failed.last_error).toBe(
      'The ship-to address needs the house number and street and the city — correct it on this order, then retry'
    );
    expect(mockFind).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('names the item whose packaging is missing', async () => {
    const product = await seedProduct();
    const line = { product_id: product._id, name: product.product_name, qty: 1, unit_cost: 349, gross: 349 };
    const packed = { weight_kg: 0.25, length_cm: 20, breadth_cm: 14, height_cm: 5 };
    const order = await paidOrder({
      line_items: [
        { ...line, ...packed },
        { ...line, ...packed, variant_label: '1 kg pack', weight_kg: 0 },
      ],
    });
    await createShipment(order);
    expect((await reloadOrder(order._id)).last_error).toBe(
      'Packaging is missing for Drools Chicken Jerky 200g (1 kg pack) — add it on the product, or set the parcel on this order, then retry'
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('refuses an incomplete parcel an operator set', async () => {
    const parcel = { weight_kg: 1.2, length_cm: 30, breadth_cm: 0, height_cm: 15, source: 'OVERRIDE' };
    const order = await paidOrder({ parcel });
    await createShipment(order);
    expect((await reloadOrder(order._id)).last_error).toBe(
      'The parcel set on this order is incomplete — enter its weight, length, breadth and height'
    );
  });

  it('never guesses a pickup location', async () => {
    await seedShiprocketAccount({ pickup_location: '' });
    const { order } = await seedPaidOrder({ product: await seedProduct(), over: { pickup_location_id: '' } });
    await createShipment(order);
    expect((await reloadOrder(order._id)).last_error).toBe(
      'This order has no pickup location — give the product a warehouse, or set a default pickup nickname in the Tech portal'
    );
  });
});

describe('createShipment — booking', () => {
  it('sends a prepaid order with its variant names, SKUs, HSN and the packed parcel', async () => {
    const product = await seedProduct({ hsn_code: '9503' });
    const line = { product_id: product._id, name: 'KONG Classic', unit_cost: 899, weight_kg: 0.3, length_cm: 12, breadth_cm: 9, height_cm: 9 };
    const order = await paidOrder({
      items_total: 2697,
      line_items: [
        { ...line, variant_label: 'Medium', variant_sku: 'KONG-CL-M', sku: 'KONG-CL', qty: 3, gross: 2697 },
      ],
    });
    await createShipment(order);
    expect(sentPayload()).toMatchObject({
      order_id: order.order_no,
      pickup_location: WAREHOUSE,
      billing_address: 'Flat 402, Tower C, DLF Park Place',
      billing_address_2: 'Sector 54, Opp. Golf Course Road',
      payment_method: 'Prepaid',
      sub_total: 2697,
      order_items: [{ name: 'KONG Classic - Medium', sku: 'KONG-CL-M', units: 3, selling_price: 899, hsn: '9503' }],
      // Three 9 cm units stacked on a 12 × 9 footprint.
      weight: 0.9,
      length: 12,
      breadth: 9,
      height: 27,
    });
  });

  it('ships from the Tech portal default pickup when the order names no warehouse', async () => {
    const order = await paidOrder({ pickup_location_id: '' });
    await createShipment(order);
    expect(sentPayload()).toMatchObject({ pickup_location: WAREHOUSE });
    expect((await reloadOrder(order._id)).pickup_location_id).toBe(WAREHOUSE);
  });

  it("declares the operator's parcel instead of the computed one", async () => {
    const order = await paidOrder();
    setParcelOverride(order, { weight_kg: 1.2, length_cm: 30, breadth_cm: 20, height_cm: 15 });
    await order.save();
    await createShipment(order);
    expect(sentPayload()).toMatchObject({ weight: 1.2, length: 30, breadth: 20, height: 15 });
    const booked = await reloadOrder(order._id);
    expect(booked.parcel).toMatchObject({ source: 'OVERRIDE', chargeable_weight_kg: 1.8 });
    expect(booked.parcel?.sent_at).toBeInstanceOf(Date);
  });

  it("assigns the courier the operator picked, and records ShipRocket's courier name fallback", async () => {
    const order = await paidOrder();
    await createShipment(order, '24');
    expect(mockAwb).toHaveBeenCalledWith('6300001', '24');
    const booked = await reloadOrder(order._id);
    expect(booked.shiprocket).toMatchObject({
      awb: '14336300001',
      courier_name: 'Xpressbees Surface',
      courier_company_id: '24',
      label_url: 'https://labels.example/6300001.pdf',
      etd: 'Sep 23, 2026',
    });
  });

  it('fails readably when the picked courier is no longer offered — keeping the ShipRocket order', async () => {
    const order = await paidOrder();
    await createShipment(order, '99');
    const failed = await reloadOrder(order._id);
    expect(failed.fulfilment_status).toBe('FAILED');
    expect(failed.last_error).toBe('That courier is no longer offered for this shipment — pick another');
    expect(failed.shiprocket.order_id).toBe('7300001');
    expect(mockAwb).not.toHaveBeenCalled();
  });

  it('fails readably when no courier can carry the parcel', async () => {
    mockCouriers.mockResolvedValue([]);
    const order = await paidOrder();
    await createShipment(order);
    expect((await reloadOrder(order._id)).last_error).toBe(
      'No courier can carry this shipment right now — check the pincode and parcel, then retry'
    );
  });
});

describe('createShipment — pickup', () => {
  it('takes a pickup ShipRocket already queued as scheduled', async () => {
    mockPickup.mockRejectedValue(shiprocketError('ShipRocket: Pickup already generated for this shipment', 400));
    const order = await paidOrder();
    await createShipment(order);
    const booked = await reloadOrder(order._id);
    expect(booked.fulfilment_status).toBe('PICKUP_SCHEDULED');
    expect(booked.shiprocket.pickup_token).toBe('SCHEDULED');
    expect(booked.last_error).toBe('');
  });

  it('keeps the AWB — not FAILED — when the pickup request fails, so Retry only asks for the pickup', async () => {
    mockPickup.mockRejectedValueOnce(shiprocketError('ShipRocket: Pickup location not verified', 400));
    const order = await paidOrder();
    await createShipment(order);
    const stuck = await reloadOrder(order._id);
    expect(stuck.fulfilment_status).toBe('AWB_ASSIGNED');
    expect(stuck.last_error).toBe('ShipRocket: Pickup location not verified');

    await createShipment(stuck);
    const scheduled = await reloadOrder(order._id);
    expect(scheduled.fulfilment_status).toBe('PICKUP_SCHEDULED');
    expect(scheduled.last_error).toBe('');
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockAwb).toHaveBeenCalledTimes(1);
  });
});
