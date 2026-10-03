jest.mock('@services/notify/notify.service', () => ({ notifyEach: jest.fn().mockResolvedValue([]) }));
jest.mock('@modules/commerce/store/store.order.service', () => ({ afterStoreStatusChange: jest.fn() }));
jest.mock('@modules/commerce/shiprocket/shiprocket.service', () => ({
  shiprocketService: { createShipment: jest.fn(), refreshTracking: jest.fn() },
}));
jest.mock('@modules/commerce/shiprocket/shiprocket.shipment', () => ({ documentFile: jest.fn() }));
jest.mock('@observability/log', () => ({ logs: { server: { warn: jest.fn(), error: jest.fn(), info: jest.fn() } } }));

import { Types } from 'mongoose';
import { notifyEach } from '@services/notify/notify.service';
import { afterStoreStatusChange } from '@modules/commerce/store/store.order.service';
import { shiprocketService } from '@modules/commerce/shiprocket/shiprocket.service';
import { documentFile } from '@modules/commerce/shiprocket/shiprocket.shipment';
import { logs } from '@observability/log';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { StoreProductModel } from '@modules/commerce/store/storeProduct.model';
import { BrandPickupLocationModel } from '@modules/venues/brandPickupLocation/brandPickupLocation.model';
import { UserModel } from '@modules/access/user/user.model';
import { ProductOrderModel } from '../../productOrder.model';
import { productOrderService as svc } from '../../productOrder.service';

/**
 * Everything an order goes through after it exists — status moves, the switch
 * between shipping and pickup, the courier calls, the tracking reads — plus the
 * one money split the pet store depends on: COD, discount and coins divided
 * across the orders one payment fans out into, always adding back up exactly.
 */

const mockNotifyEach = notifyEach as jest.Mock;
const mockCreateShipment = shiprocketService.createShipment as jest.Mock;
let seq = 0;

beforeAll(async () => {
  await Promise.all([ProductOrderModel.init(), BrandPickupLocationModel.init()]);
});

const seedOrder = (over: Record<string, unknown> = {}) => {
  seq += 1;
  return ProductOrderModel.create({
    order_no: `ord_ops_${seq}`,
    payment_id: new Types.ObjectId(),
    buyer_name: 'Asha',
    buyer_email: 'asha@x.com',
    items_total: 300,
    total: 300,
    fulfilment_method: 'SHIP',
    fulfilment_status: 'SHIPPED',
    pickup_location_id: `WH-${seq}`,
    line_items: [{ product_id: new Types.ObjectId(), name: 'Leash', qty: 1, unit_cost: 300, gross: 300 }],
    ...over,
  });
};

describe('createFromPayment — a pet-store payment split across two warehouses', () => {
  it('splits the COD collection, the discount and the coins by each order’s goods + shipping, adding back exactly', async () => {
    const [north, south] = await Promise.all([
      BrandPickupLocationModel.create({ owner_kind: 'DUNCIT', nickname: 'WH-NORTH', pincode: '110001' }),
      BrandPickupLocationModel.create({ owner_kind: 'DUNCIT', nickname: 'WH-SOUTH', pincode: '560001' }),
    ]);
    const [food, toy] = await Promise.all([
      StoreProductModel.create({ product_name: 'Food', sku: 'OPS-FOOD', unit_cost: 300, inventory_count: 10, pickup_location_id: north._id }),
      StoreProductModel.create({ product_name: 'Toy', sku: 'OPS-TOY', unit_cost: 300, inventory_count: 10, pickup_location_id: south._id }),
    ]);
    const payment = await PaymentModel.create({
      payment_id: 'pay-ops-split',
      user_id: null,
      user_name: 'Guest',
      user_email: 'guest@x.com',
      subtotal: 1000,
      total: 1000,
      coins_redeemed: 7,
      target_type: 'PRODUCT',
      gateway: 'COD',
      metadata: {
        fulfilment_method: 'SHIP',
        shipping_address: { name: 'Guest', line1: '1 Road', city: 'Pune', state: 'MH', pincode: '411001' },
        // Legacy breakup: keyed by warehouse alone.
        shipping: {
          breakup: [
            { warehouse_id: String(north._id), charge: 60 },
            { warehouse_id: String(south._id), charge: 40 },
          ],
        },
        product_lines: [
          { product_id: String(food._id), name: 'Food', quantity: 2, unit_cost: 300, gross: 600 },
          { product_id: String(toy._id), name: 'Toy', quantity: 1, unit_cost: 300, gross: 300 },
        ],
        store: { payment_method: 'COD', discount_total: 100, access_key: 'key-1' },
      },
    });

    const orders = await svc.createFromPayment(payment);

    expect(orders).toHaveLength(2);
    const byWh = Object.fromEntries(orders.map((o) => [o.pickup_location_id, o]));
    // Weights: 600 + 60 = 660 and 300 + 40 = 340.
    expect(byWh['WH-NORTH']).toMatchObject({
      channel: 'PET_STORE',
      payment_method: 'COD',
      items_total: 600,
      shipping_charge: 60,
      total: 660,
      cod_amount: 660,
      discount_total: 66,
      coins_share: 4, // floor(7 * 0.66)
      fulfilment_status: 'AWAITING_SHIPMENT',
      buyer_id: null,
    });
    expect(byWh['WH-SOUTH']).toMatchObject({ total: 340, cod_amount: 340, discount_total: 34, coins_share: 3 });
    const sum = (k: 'cod_amount' | 'discount_total' | 'coins_share') => orders.reduce((s, o) => s + o[k], 0);
    expect(sum('cod_amount')).toBe(1000);
    expect(sum('discount_total')).toBe(100);
    expect(sum('coins_share')).toBe(7);
    const stored = await ProductOrderModel.findOne({ pickup_location_id: 'WH-NORTH' }).select('+access_key').lean();
    expect(stored?.access_key).toBe('key-1');
  });
});

describe('advanceStatus', () => {
  it('refuses an unknown order', async () => {
    await expect(svc.advanceStatus(new Types.ObjectId().toHexString(), 'DELIVERED')).rejects.toThrow('Order not found');
  });

  it('records the move as a tracking event and asks each partner brand for feedback once, on the crossing into delivery', async () => {
    const owner = await UserModel.create({
      auth: { email: 'brand-owner@x.com' },
      profile: { first_name: 'Brand', last_name: 'Owner' },
      metadata: { status: 'ACTIVE' },
    });
    const [leash, bowl, orphan] = await Promise.all([
      InventoryProductModel.create({ product_name: 'Leash', sku: 'OPS-L', unit_cost: 100, listing_submitted_by_id: String(owner._id) }),
      InventoryProductModel.create({ product_name: 'Bowl', sku: 'OPS-B', unit_cost: 100, listing_submitted_by_id: String(owner._id) }),
      InventoryProductModel.create({ product_name: 'NoOwner', sku: 'OPS-N', unit_cost: 100 }),
    ]);
    const order = await seedOrder({
      line_items: [leash, bowl, orphan].map((p) => ({ product_id: p._id, name: p.product_name, qty: 1, unit_cost: 100, gross: 100 })),
    });

    const pub = await svc.advanceStatus(String(order._id), 'DELIVERED', 'Handed to buyer');

    expect(pub.fulfilment_status).toBe('DELIVERED');
    expect(pub.tracking_events.at(-1)).toMatchObject({ status: 'DELIVERED', code: 0, note: 'Handed to buyer' });
    expect(mockNotifyEach).toHaveBeenCalledTimes(1);
    const [batch] = mockNotifyEach.mock.calls[0];
    expect(batch).toHaveLength(1);
    expect(batch[0]).toMatchObject({ event: 'ECOMM_FEEDBACK', entityId: String(order._id), name: 'Brand Owner' });
    expect(batch[0].params[0]).toBe('Brand Owner');
    expect(batch[0].params[1]).toBe('Leash, Bowl');
    expect(batch[0].params[2]).toMatch(/\/support\/feedback$/);
    expect(afterStoreStatusChange).not.toHaveBeenCalled();

    // Re-applying a delivered state is not a second crossing.
    await svc.advanceStatus(String(order._id), 'DELIVERED');
    expect(mockNotifyEach).toHaveBeenCalledTimes(1);
  });

  it('asks nobody when no product has a valid owner, and nobody for a move that is not delivery', async () => {
    const product = await InventoryProductModel.create({ product_name: 'Lonely', sku: 'OPS-LONE', unit_cost: 50, listing_submitted_by_id: 'not-an-id' });
    const order = await seedOrder({
      fulfilment_method: 'PICKUP',
      fulfilment_status: 'READY_FOR_PICKUP',
      line_items: [{ product_id: product._id, name: 'Lonely', qty: 1, unit_cost: 50, gross: 50 }],
    });
    await svc.advanceStatus(String(order._id), 'PICKED_UP');
    const other = await seedOrder();
    await svc.advanceStatus(String(other._id), 'OUT_FOR_DELIVERY');
    expect(mockNotifyEach).not.toHaveBeenCalled();
  });

  it('a pet-store order asks no partner brand and hands the change to the store with the previous status', async () => {
    const order = await seedOrder({ channel: 'PET_STORE', fulfilment_status: 'OUT_FOR_DELIVERY' });
    await svc.advanceStatus(String(order._id), 'DELIVERED');
    expect(mockNotifyEach).not.toHaveBeenCalled();
    const [changed, previous] = jest.mocked(afterStoreStatusChange).mock.calls[0];
    expect(String(changed._id)).toBe(String(order._id));
    expect(changed.fulfilment_status).toBe('DELIVERED');
    expect(previous).toBe('OUT_FOR_DELIVERY');
  });
});

describe('setFulfilmentMethod', () => {
  it('switching to PICKUP resets the status and mints a pickup ref once; switching to SHIP awaits shipment', async () => {
    const order = await seedOrder({ pickup_ref: '' });
    const pickup = await svc.setFulfilmentMethod(String(order._id), 'PICKUP');
    expect(pickup).toMatchObject({ fulfilment_method: 'PICKUP', fulfilment_status: 'PENDING' });
    expect(pickup.pickup_ref).toMatch(/^PU-[0-9A-F]{6}$/);

    const again = await svc.setFulfilmentMethod(String(order._id), 'PICKUP');
    expect(again.pickup_ref).toBe(pickup.pickup_ref);

    const ship = await svc.setFulfilmentMethod(String(order._id), 'SHIP');
    expect(ship).toMatchObject({ fulfilment_method: 'SHIP', fulfilment_status: 'AWAITING_SHIPMENT' });
  });

  it('refuses an unknown order', async () => {
    await expect(svc.setFulfilmentMethod(new Types.ObjectId().toHexString(), 'SHIP')).rejects.toThrow('Order not found');
  });
});

describe('createShipmentForOrder', () => {
  it('refuses a missing order and a pickup order', async () => {
    await expect(svc.createShipmentForOrder(new Types.ObjectId().toHexString())).rejects.toThrow('Order not found');
    const pickup = await seedOrder({ fulfilment_method: 'PICKUP', pickup_location_id: '' });
    await expect(svc.createShipmentForOrder(String(pickup._id))).rejects.toThrow('Only SHIP orders can create a shipment');
    expect(mockCreateShipment).not.toHaveBeenCalled();
  });

  it('will not move the pickup of an order ShipRocket already holds, nor to a warehouse that does not exist', async () => {
    const booked = await seedOrder({ pickup_location_id: 'WH-OLD', shiprocket: { order_id: 'SR-9' } });
    await expect(svc.createShipmentForOrder(String(booked._id), 'WH-NEW')).rejects.toThrow(
      'This shipment is already booked from "WH-OLD" — its pickup cannot change'
    );
    const open = await seedOrder({ pickup_location_id: 'WH-OLD-2' });
    await expect(svc.createShipmentForOrder(String(open._id), 'WH-NOWHERE')).rejects.toThrow(
      'There is no warehouse named "WH-NOWHERE"'
    );
    expect(mockCreateShipment).not.toHaveBeenCalled();
  });

  it('re-points the pickup to a real warehouse and books the parcel from it', async () => {
    await BrandPickupLocationModel.create({ owner_kind: 'DUNCIT', nickname: 'WH-EAST', pincode: '700001' });
    const order = await seedOrder({ pickup_location_id: 'WH-WEST' });

    const pub = await svc.createShipmentForOrder(String(order._id), 'WH-EAST');

    expect(pub.pickup_location_id).toBe('WH-EAST');
    expect(mockCreateShipment).toHaveBeenCalledTimes(1);
    expect(mockCreateShipment.mock.calls[0][0].pickup_location_id).toBe('WH-EAST');
  });

  it('the same pickup, or none, books straight away', async () => {
    const order = await seedOrder({ pickup_location_id: 'WH-SAME' });
    await svc.createShipmentForOrder(String(order._id), 'WH-SAME');
    await svc.createShipmentForOrder(String(order._id));
    expect(mockCreateShipment).toHaveBeenCalledTimes(2);
  });
});

describe('courier helpers', () => {
  it('tryCreateShipment swallows a courier failure with a warning', async () => {
    const order = await seedOrder();
    mockCreateShipment.mockRejectedValueOnce(new Error('ShipRocket 503'));
    await expect(svc.tryCreateShipment(order)).resolves.toBeUndefined();
    expect(logs.server.warn).toHaveBeenCalledWith('productOrder', 'tryCreateShipment', expect.objectContaining({ msg: 'shipment create skipped/failed' }));

    await svc.tryCreateShipment(order);
    expect(mockCreateShipment).toHaveBeenCalledTimes(2);
    expect(logs.server.warn).toHaveBeenCalledTimes(1);
  });

  it('shipmentFile needs at least one real order and passes the documents kind through', async () => {
    await expect(svc.shipmentFile(['junk'], 'LABEL')).rejects.toThrow('No orders selected');
    await expect(svc.shipmentFile([new Types.ObjectId().toHexString()], 'LABEL')).rejects.toThrow('No orders selected');
    const order = await seedOrder();
    jest.mocked(documentFile).mockResolvedValue({ filename: 'labels.pdf' } as never);
    await expect(svc.shipmentFile([String(order._id), 'junk'], 'MANIFEST')).resolves.toEqual({ filename: 'labels.pdf' });
    const [orders, kind] = jest.mocked(documentFile).mock.calls[0];
    expect(orders.map((o) => String(o._id))).toEqual([String(order._id)]);
    expect(kind).toBe('MANIFEST');
  });

  it('refreshTrackingById refuses an unknown order and refreshes a known one', async () => {
    await expect(svc.refreshTrackingById(new Types.ObjectId().toHexString())).rejects.toThrow('Order not found');
    const order = await seedOrder();
    const pub = await svc.refreshTrackingById(String(order._id));
    expect(pub.id).toBe(String(order._id));
    expect(shiprocketService.refreshTracking).toHaveBeenCalledTimes(1);
  });
});

describe('reads', () => {
  it('trackingByOrderNo returns the public tracking shape, or null', async () => {
    expect(await svc.trackingByOrderNo('nope')).toBeNull();
    const at = new Date('2026-10-01T10:00:00Z');
    await seedOrder({
      order_no: 'ord_track_1',
      shiprocket: { awb: 'AWB123', courier_name: 'Delhivery', tracking_status: 'In transit', label_url: 'https://l' },
      tracking_events: [{ status: 'SHIPPED', code: 6, location: 'Delhi', note: 'Picked', at }],
    });
    expect(await svc.trackingByOrderNo('ord_track_1')).toEqual({
      order_no: 'ord_track_1',
      fulfilment_method: 'SHIP',
      fulfilment_status: 'SHIPPED',
      awb: 'AWB123',
      courier_name: 'Delhivery',
      label_url: 'https://l',
      tracking_status: 'In transit',
      events: [{ status: 'SHIPPED', code: 6, location: 'Delhi', note: 'Picked', at: at.toISOString() }],
    });
  });

  it('list filters by buyer, pod, method, status and an escaped search', async () => {
    const buyer = new Types.ObjectId();
    const pod = new Types.ObjectId();
    const mine = await seedOrder({ buyer_id: buyer, pod_id: pod, order_no: 'ord_a+b' });
    await seedOrder({ buyer_id: buyer, fulfilment_method: 'PICKUP', fulfilment_status: 'PENDING', pickup_location_id: '' });
    await seedOrder({ order_no: 'ord_aab' });

    expect((await svc.list({ buyer_id: String(buyer) })).length).toBe(2);
    expect((await svc.list({ pod_id: String(pod) })).map((o) => o.id)).toEqual([String(mine._id)]);
    expect((await svc.list({ fulfilment_method: 'PICKUP' })).length).toBe(1);
    expect((await svc.list({ fulfilment_status: 'SHIPPED', buyer_id: String(buyer) })).length).toBe(1);
    // "+" is literal, so 'ord_aab' does not match.
    expect((await svc.list({ search: 'A+B' })).map((o) => o.order_no)).toEqual(['ord_a+b']);
    expect(await svc.list(undefined, 1)).toHaveLength(1);
  });

  it('getById and listForBuyer', async () => {
    const buyer = new Types.ObjectId();
    const pod = new Types.ObjectId();
    const a = await seedOrder({ buyer_id: buyer, pod_id: pod });
    await seedOrder({ buyer_id: buyer });

    expect((await svc.getById(String(a._id)))?.order_no).toBe(a.order_no);
    expect(await svc.getById(new Types.ObjectId().toHexString())).toBeNull();
    expect(await svc.listForBuyer(String(buyer))).toHaveLength(2);
    expect((await svc.listForBuyer(String(buyer), String(pod))).map((o) => o.id)).toEqual([String(a._id)]);
  });
});
