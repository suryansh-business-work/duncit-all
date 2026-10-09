jest.mock('@services/notify/notify.service', () => ({ notifyEach: jest.fn().mockResolvedValue([]) }));
jest.mock('@modules/commerce/shiprocket/shiprocket.service', () => ({
  shiprocketService: { createShipment: jest.fn(), refreshTracking: jest.fn() },
}));
jest.mock('@modules/commerce/shiprocket/shiprocket.shipment', () => ({ documentFile: jest.fn() }));

import { Types } from 'mongoose';
import { shiprocketService } from '@modules/commerce/shiprocket/shiprocket.service';
import { documentFile } from '@modules/commerce/shiprocket/shiprocket.shipment';
import { EcommBrandModel } from '@modules/venues/ecommBrand/ecommBrand.model';
import { ProductOrderModel } from '../../productOrder.model';
import { brandProductOrderService as desk } from '../../productOrder.brand';

/**
 * A partner's order desk: a brand owner sees and works ONLY the pod-shop
 * orders of the brands they own — never another brand's, never the pet store's
 * — and a ship-to can be corrected only while ShipRocket does not hold it.
 */

const mockCreateShipment = shiprocketService.createShipment as jest.Mock;
const mockRefresh = shiprocketService.refreshTracking as jest.Mock;
const mockDocumentFile = documentFile as jest.Mock;

const owner = new Types.ObjectId();
const stranger = new Types.ObjectId();
let mine: Types.ObjectId;
let theirs: Types.ObjectId;
let seq = 0;

beforeAll(() => ProductOrderModel.init());

// The harness empties every collection between tests, so the brands are seeded per test.
beforeEach(async () => {
  jest.clearAllMocks();
  const [a, b] = await Promise.all([
    EcommBrandModel.collection.insertOne({ name: 'Mine', owner_user_id: owner }),
    EcommBrandModel.collection.insertOne({ name: 'Theirs', owner_user_id: stranger }),
  ]);
  mine = a.insertedId as Types.ObjectId;
  theirs = b.insertedId as Types.ObjectId;
});

const seedOrder = (brandId: Types.ObjectId, over: Record<string, unknown> = {}) => {
  seq += 1;
  return ProductOrderModel.create({
    order_no: `ord_brand_${seq}`,
    payment_id: new Types.ObjectId(),
    buyer_name: 'Asha',
    buyer_email: 'asha@x.com',
    items_total: 300,
    total: 300,
    channel: 'POD_SHOP',
    fulfilment_method: 'SHIP',
    fulfilment_status: 'FAILED',
    line_items: [{ product_id: new Types.ObjectId(), brand_id: brandId, name: 'Leash', qty: 1, unit_cost: 300, gross: 300 }],
    ...over,
  });
};

const shipTo = {
  name: 'Asha Rao',
  phone: '+91 98765-43210',
  line1: '12 Main Street, Baner',
  city: 'Pune',
  state: 'Maharashtra',
  pincode: '411 045',
};

describe('brandProductOrderService.table — the scope is the caller’s own brands', () => {
  it('lists only pod-shop orders of brands the caller owns', async () => {
    const own = await seedOrder(mine);
    await seedOrder(theirs);
    await seedOrder(mine, { channel: 'PET_STORE' });
    const page = await desk.table(String(owner), null);
    const ids = page.rows.map((r) => r.id);
    expect(ids).toContain(String(own._id));
    expect(page.rows.every((r) => r.channel === 'POD_SHOP')).toBe(true);
    expect(page.rows.every((r) => r.line_items.every((l) => String(l.brand_id) === String(mine)))).toBe(true);
  });

  it('cannot be widened to another owner’s brand through brand_id', async () => {
    await seedOrder(theirs);
    const page = await desk.table(String(owner), null, String(theirs));
    expect(page.rows).toEqual([]);
    expect(page.total).toBe(0);
  });

  it('answers an empty page to a user who owns no brand', async () => {
    const page = await desk.table(String(new Types.ObjectId()), null);
    expect(page.total).toBe(0);
  });
});

describe('brandProductOrderService — one order', () => {
  it('reads an own order and answers NOT_FOUND for another brand’s or a malformed id', async () => {
    const own = await seedOrder(mine);
    const other = await seedOrder(theirs);
    await expect(desk.get(String(owner), String(own._id))).resolves.toMatchObject({ order_no: own.order_no });
    await expect(desk.get(String(owner), String(other._id))).rejects.toThrow('Order not found');
    await expect(desk.get(String(owner), 'not-an-id')).rejects.toThrow('Order not found');
  });

  it('books an own order and refuses a cancelled one without calling ShipRocket', async () => {
    const own = await seedOrder(mine);
    await desk.book(String(owner), String(own._id));
    expect(mockCreateShipment).toHaveBeenCalledTimes(1);

    const cancelled = await seedOrder(mine, { cancelled_at: new Date() });
    await expect(desk.book(String(owner), String(cancelled._id))).rejects.toThrow('This order was cancelled');
    expect(mockCreateShipment).toHaveBeenCalledTimes(1);
  });

  it('refreshes tracking only for an own order', async () => {
    const own = await seedOrder(mine);
    const other = await seedOrder(theirs);
    await desk.refreshTracking(String(owner), String(own._id));
    await expect(desk.refreshTracking(String(owner), String(other._id))).rejects.toThrow('Order not found');
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });
});

describe('brandProductOrderService.updateAddress', () => {
  it('writes a cleaned, courier-ready ship-to and notes who corrected it', async () => {
    const own = await seedOrder(mine);
    const pub = await desk.updateAddress(String(owner), String(own._id), shipTo, 'owner@brand.com');
    expect(pub.shipping_address).toMatchObject({
      name: 'Asha Rao',
      phone: '9876543210',
      line1: '12 Main Street, Baner',
      pincode: '411045',
      country: 'India',
    });
    expect(pub.notes.at(-1)).toMatchObject({ text: 'Ship-to address corrected', by_name: 'owner@brand.com' });
  });

  it('refuses an address a courier would refuse, naming what is missing', async () => {
    const own = await seedOrder(mine);
    await expect(
      desk.updateAddress(String(owner), String(own._id), { ...shipTo, pincode: '4110' }, 'x'),
    ).rejects.toThrow('a 6-digit pincode');
    await expect(desk.updateAddress(String(owner), String(own._id), { ...shipTo, name: ' ' }, 'x')).rejects.toThrow(
      'Enter the name to deliver to',
    );
  });

  it('refuses once ShipRocket holds the order, and for a pickup order', async () => {
    const booked = await seedOrder(mine, { shiprocket: { order_id: 'SR-9' } });
    await expect(desk.updateAddress(String(owner), String(booked._id), shipTo, 'x')).rejects.toThrow(/already booked/);
    const pickup = await seedOrder(mine, { fulfilment_method: 'PICKUP', fulfilment_status: 'PENDING' });
    await expect(desk.updateAddress(String(owner), String(pickup._id), shipTo, 'x')).rejects.toThrow(
      'Only a shipped order has a delivery address',
    );
  });
});

describe('brandProductOrderService.shipmentFile', () => {
  it('prints documents for own orders only — one foreign id refuses the whole request', async () => {
    mockDocumentFile.mockResolvedValue({ filename: 'label.pdf', mime: 'application/pdf', content_base64: 'JVBERi0=' });
    const a = await seedOrder(mine);
    const b = await seedOrder(theirs);
    await expect(desk.shipmentFile(String(owner), [String(a._id)], 'LABEL')).resolves.toMatchObject({ filename: 'label.pdf' });
    await expect(desk.shipmentFile(String(owner), [String(a._id), String(b._id)], 'LABEL')).rejects.toThrow('Order not found');
    await expect(desk.shipmentFile(String(owner), [], 'LABEL')).rejects.toThrow('Order not found');
    expect(mockDocumentFile).toHaveBeenCalledTimes(1);
  });
});
