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

import { couriersForOrder, generateLabel, manifestFor, printInvoice } from '../../shiprocket.gateway';
import {
  clearParcelOverride,
  courierChoices,
  documentFor,
  setParcelOverride,
  shipmentView,
} from '../../shiprocket.shipment';
import type { ParcelDims } from '../../shiprocket.parcel';
import { GURUGRAM, reloadOrder, seedPaidOrder, seedProduct } from './order-fixtures';

/**
 * The order page's shipment panel: the courier list, an operator's parcel
 * correction, the view it renders, and the label / invoice / manifest
 * documents printed for one order or a whole pickup batch.
 */
const booked = (n: number) => ({
  shiprocket: { order_id: `730000${n}`, shipment_id: `630000${n}`, awb: `1433630000${n}` },
  parcel: { weight_kg: 0.5, length_cm: 20, breadth_cm: 14, height_cm: 10, volumetric_weight_kg: 0.56, chargeable_weight_kg: 0.56, source: 'AUTO', sent_at: new Date() },
  fulfilment_status: 'PICKUP_SCHEDULED',
});

const seedOrder = async (over: Record<string, unknown> = {}) => (await seedPaidOrder({ product: await seedProduct(), over })).order;

describe('courierChoices', () => {
  it('offers couriers only once the ShipRocket order exists', async () => {
    const order = await seedOrder();
    await expect(courierChoices(order)).rejects.toThrow('Create the shipment first — couriers are offered for a booked order');
    expect(couriersForOrder).not.toHaveBeenCalled();
  });

  it('lists the couriers for the booked order', async () => {
    jest.mocked(couriersForOrder).mockResolvedValue([]);
    const order = await seedOrder(booked(1));
    await expect(courierChoices(order)).resolves.toEqual([]);
    expect(couriersForOrder).toHaveBeenCalledWith('7300001');
  });
});

describe('the parcel override', () => {
  it('stores the corrected parcel with both courier weights', async () => {
    const order = await seedOrder();
    setParcelOverride(order, { weight_kg: 0.3, length_cm: 40, breadth_cm: 30, height_cm: 20 });
    expect(order.parcel).toMatchObject({ source: 'OVERRIDE', volumetric_weight_kg: 4.8, chargeable_weight_kg: 4.8, sent_at: null });
    clearParcelOverride(order);
    expect(order.parcel).toBeNull();
  });

  it.each<[ParcelDims, string]>([
    [{ weight_kg: 0, length_cm: 30, breadth_cm: 20, height_cm: 15 }, 'Enter a weight of at least 0.05 kg and every side of at least 0.5 cm'],
    [{ weight_kg: 1.2, length_cm: 30, breadth_cm: 0.2, height_cm: 15 }, 'Enter a weight of at least 0.05 kg and every side of at least 0.5 cm'],
    [{ weight_kg: 51, length_cm: 60, breadth_cm: 40, height_cm: 40 }, 'A parcel can weigh at most 50 kg'],
  ])('refuses %p', async (dims, message) => {
    const order = await seedOrder();
    expect(() => setParcelOverride(order, dims)).toThrow(message);
  });

  it('cannot change or clear the parcel of a booked shipment', async () => {
    const order = await seedOrder(booked(1));
    const already = 'The shipment is already booked — its parcel was sent with it';
    expect(() => setParcelOverride(order, { weight_kg: 1, length_cm: 20, breadth_cm: 20, height_cm: 20 })).toThrow(already);
    expect(() => clearParcelOverride(order)).toThrow(already);
  });
});

describe('shipmentView', () => {
  it('shows the parcel that would be declared, and what stops the booking, before it is booked', async () => {
    const order = await seedOrder({ shipping_address: { ...GURUGRAM, line1: 'India' } });
    const view = shipmentView(order);
    expect(view).toMatchObject({
      shiprocket_order_id: '',
      parcel_sent: false,
      parcel: { weight_kg: 0.5, length_cm: 20, breadth_cm: 14, height_cm: 10, chargeable_weight_kg: 0.56, source: 'AUTO', sent_at: null },
      packaging_missing: [],
      address_problems: ['the house number and street'],
      alert: '',
      ndr_actioned_at: null,
    });
  });

  it('names the lines without packaging', async () => {
    const product = await seedProduct();
    const line = { product_id: product._id, name: 'Himalaya Erina Tick Shampoo', variant_label: '450 ml', qty: 1, unit_cost: 299, gross: 299 };
    const order = await seedOrder({ line_items: [line] });
    expect(shipmentView(order).packaging_missing).toEqual(['Himalaya Erina Tick Shampoo (450 ml)']);
  });

  it('shows the parcel exactly as it was sent once the shipment is booked', async () => {
    const order = await seedOrder(booked(1));
    const view = shipmentView(order);
    expect(view).toMatchObject({ shiprocket_order_id: '7300001', shipment_id: '6300001', parcel_sent: true });
    expect(view.parcel.sent_at).toEqual(order.parcel?.sent_at?.toISOString());
  });
});

describe('documentFor', () => {
  it('needs at least one booked order', async () => {
    const order = await seedOrder();
    await expect(documentFor([order], 'INVOICE')).rejects.toThrow('None of these orders has a ShipRocket shipment yet');
  });

  it('needs an AWB on every order before a label or manifest', async () => {
    const order = await seedOrder({ shiprocket: { order_id: '7300001', shipment_id: '6300001' } });
    await expect(documentFor([order], 'LABEL')).rejects.toThrow('Assign a courier (AWB) to every selected order first');
    await expect(documentFor([order], 'MANIFEST')).rejects.toThrow('Assign a courier (AWB) to every selected order first');
  });

  it('prints an invoice before the AWB exists and keeps its link on the order', async () => {
    jest.mocked(printInvoice).mockResolvedValue('https://invoices.example/7300001.pdf');
    const order = await seedOrder({ shiprocket: { order_id: '7300001', shipment_id: '6300001' } });
    await expect(documentFor([order], 'INVOICE')).resolves.toBe('https://invoices.example/7300001.pdf');
    expect(printInvoice).toHaveBeenCalledWith(['7300001']);
    expect((await reloadOrder(order._id)).shiprocket.invoice_url).toBe('https://invoices.example/7300001.pdf');
  });

  it('prints one label for a batch and links it on every order, skipping the unbooked', async () => {
    jest.mocked(generateLabel).mockResolvedValue('https://labels.example/batch.pdf');
    const first = await seedOrder(booked(1));
    const second = await seedOrder(booked(2));
    const unbooked = await seedOrder();
    await documentFor([first, second, unbooked], 'LABEL');
    expect(generateLabel).toHaveBeenCalledWith(['6300001', '6300002']);
    expect((await reloadOrder(first._id)).shiprocket.label_url).toBe('https://labels.example/batch.pdf');
    expect((await reloadOrder(second._id)).shiprocket.label_url).toBe('https://labels.example/batch.pdf');
    expect((await reloadOrder(unbooked._id)).shiprocket.label_url).toBe('');
  });

  it('prints the pickup manifest from both the shipment and the order ids', async () => {
    jest.mocked(manifestFor).mockResolvedValue('https://manifests.example/m1.pdf');
    const first = await seedOrder(booked(1));
    const second = await seedOrder(booked(2));
    await documentFor([first, second], 'MANIFEST');
    expect(manifestFor).toHaveBeenCalledWith(['6300001', '6300002'], ['7300001', '7300002']);
    expect((await reloadOrder(second._id)).shiprocket.manifest_url).toBe('https://manifests.example/m1.pdf');
  });
});
