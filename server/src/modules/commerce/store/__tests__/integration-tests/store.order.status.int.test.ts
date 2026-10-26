jest.mock('../../store.emails', () => ({ mailOrderUpdate: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../store.whatsapp', () => ({ whatsappOrderUpdate: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@modules/commerce/shiprocket/shiprocket.gateway', () => ({
  ...jest.requireActual('@modules/commerce/shiprocket/shiprocket.gateway'),
  cancelOrders: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@modules/finance/payment/payment.refundRecord', () => ({
  creditCoinsBack: jest.fn().mockResolvedValue(undefined),
  recordPaymentRefund: jest.fn().mockResolvedValue(undefined),
}));

import { Types } from 'mongoose';
import type { GraphQLContext } from '@context';
import { ProductOrderModel } from '@modules/commerce/productOrder/productOrder.model';
import { cancelOrders } from '@modules/commerce/shiprocket/shiprocket.gateway';
import { mailOrderUpdate } from '../../store.emails';
import { storeOrderService as svc } from '../../store.order.service';

/**
 * The ecomm portal moving a pet-store order by hand, and either side calling
 * one off: an order only moves forward through its lifecycle, and a cancelled
 * order is refused as cancelled — not as "already with the courier".
 */

let seq = 0;
const buyerId = new Types.ObjectId();
const buyer = { user: { id: String(buyerId), email: 'buyer@x.com', roles: [] } } as unknown as GraphQLContext;
const staff = { user: { id: 'staff-1', email: 'staff@x.com', roles: ['ECOMM_STORE_MANAGER'] } } as unknown as GraphQLContext;

async function seedOrder(over: Record<string, unknown> = {}) {
  seq += 1;
  return ProductOrderModel.create({
    order_no: `PET-ST-${seq}`,
    channel: 'PET_STORE',
    payment_id: new Types.ObjectId(),
    buyer_id: buyerId,
    buyer_name: 'Buyer',
    buyer_email: 'buyer@x.com',
    items_total: 300,
    total: 300,
    fulfilment_method: 'SHIP',
    fulfilment_status: 'PENDING',
    line_items: [{ product_id: new Types.ObjectId(), name: 'Leash', qty: 3, unit_cost: 100, gross: 300 }],
    ...over,
  });
}

describe('updateStatus — forward only', () => {
  it('moves an order forward, records the note and tells the buyer', async () => {
    const order = await seedOrder({ fulfilment_status: 'SHIPPED' });

    const out = await svc.updateStatus(String(order._id), 'OUT_FOR_DELIVERY', 'With the rider');

    expect(out.fulfilment_status).toBe('OUT_FOR_DELIVERY');
    const saved = await ProductOrderModel.findById(order._id);
    expect(saved?.tracking_events.at(-1)).toMatchObject({ status: 'OUT_FOR_DELIVERY', note: 'With the rider' });
    expect(mailOrderUpdate).toHaveBeenCalledTimes(1);
  });

  it('lets a failed delivery go out again at the same stage', async () => {
    const order = await seedOrder({ fulfilment_status: 'NDR' });
    const out = await svc.updateStatus(String(order._id), 'OUT_FOR_DELIVERY', '');
    expect(out.fulfilment_status).toBe('OUT_FOR_DELIVERY');
  });

  it('refuses to pull a delivered order back to pending and leaves it untouched', async () => {
    const order = await seedOrder({ fulfilment_status: 'DELIVERED' });

    await expect(svc.updateStatus(String(order._id), 'PENDING', 'oops')).rejects.toMatchObject({
      message: 'An order that is DELIVERED cannot be moved to PENDING',
      extensions: { code: 'BAD_USER_INPUT' },
    });

    const saved = await ProductOrderModel.findById(order._id);
    expect(saved?.fulfilment_status).toBe('DELIVERED');
    expect(saved?.tracking_events).toHaveLength(0);
    expect(mailOrderUpdate).not.toHaveBeenCalled();
  });

  it('refuses a shipped order going back before the courier, and a write of the status it already has', async () => {
    const shipped = await seedOrder({ fulfilment_status: 'SHIPPED' });
    await expect(svc.updateStatus(String(shipped._id), 'AWAITING_SHIPMENT', '')).rejects.toThrow(
      'An order that is SHIPPED cannot be moved to AWAITING_SHIPMENT'
    );
    await expect(svc.updateStatus(String(shipped._id), 'SHIPPED', '')).rejects.toMatchObject({
      extensions: { code: 'BAD_USER_INPUT' },
    });
    expect((await ProductOrderModel.findById(shipped._id))?.fulfilment_status).toBe('SHIPPED');
  });

  it('still sends cancelling to its own action', async () => {
    const order = await seedOrder();
    await expect(svc.updateStatus(String(order._id), 'CANCELLED', '')).rejects.toThrow('Use Cancel order');
  });
});

describe('cancelling — the right refusal', () => {
  it('tells the buyer and the portal an already-cancelled order is cancelled', async () => {
    const order = await seedOrder({ fulfilment_status: 'CANCELLED', cancelled_at: new Date(), cancelled_by: 'CUSTOMER' });

    await expect(svc.cancelMine(buyer, order.order_no, 'again')).rejects.toMatchObject({
      message: 'This order is already cancelled',
      extensions: { code: 'BAD_USER_INPUT' },
    });
    await expect(svc.adminCancel(staff, String(order._id), 'again', 'ORIGINAL')).rejects.toThrow('This order is already cancelled');
    expect(cancelOrders).not.toHaveBeenCalled();
  });

  it('still says a shipped order is with the courier', async () => {
    const order = await seedOrder({ fulfilment_status: 'SHIPPED' });
    await expect(svc.adminCancel(staff, String(order._id), 'late', 'ORIGINAL')).rejects.toThrow(
      'This order can no longer be cancelled — it is already with the courier'
    );
    expect((await ProductOrderModel.findById(order._id))?.cancelled_at).toBeNull();
  });
});
