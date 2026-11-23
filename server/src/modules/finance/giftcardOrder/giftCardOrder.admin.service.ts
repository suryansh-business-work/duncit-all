import { GraphQLError } from 'graphql';
import {
  GiftCardOrderModel,
  type IGiftCardOrder,
  type IGiftCardShippingAddress,
} from './giftCardOrder.model';
import { GiftCardActivityModel } from './giftCardActivity.model';
import {
  giftCardOrderService,
  orderPub,
  recordOrderActivity,
  syncPaymentStatuses,
} from './giftCardOrder.service';
import { addressProblems } from '@modules/commerce/shiprocket/shiprocket.address';
import { loadUserMap, userNameOrDeleted, type UserInfo } from '@utils/admin-ledger';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';

/** Loyalty > Gift Card Orders: the order book, one order's full story, and the
 * fulfilment actions that come before the courier. */

const badInput = (message: string, field?: string): never => {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT', ...(field ? { field } : {}) } });
};

const ORDER_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['order_no', 'buyer_name', 'buyer_email', 'buyer_phone', 'payment_id', 'recipient_name', 'recipient_email', 'shipment.awb'],
  sortFields: {
    order_no: 'order_no',
    delivery_mode: 'delivery_mode',
    design_name: 'design_name',
    quantity: 'quantity',
    total: 'total',
    payment_status: 'payment_status',
    fulfilment_status: 'fulfilment_status',
    paid_at: 'paid_at',
    created_at: 'created_at',
  },
  filterFields: {
    order_no: { type: 'string' },
    delivery_mode: { type: 'enum' },
    payment_status: { type: 'enum' },
    fulfilment_status: { type: 'enum' },
    design_name: { type: 'string' },
    buyer_name: { type: 'string' },
    stock_short: { type: 'boolean' },
    total: { type: 'number' },
    quantity: { type: 'number' },
    created_at: { type: 'date' },
    paid_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

/** What the console reads beyond the member's view. */
function adminOrderPub(order: IGiftCardOrder, users: Map<string, UserInfo>) {
  const buyer = users.get(String(order.user_id));
  return {
    ...orderPub(order),
    user_id: String(order.user_id),
    buyer_name: order.buyer_name || userNameOrDeleted(buyer, order.user_id),
    buyer_email: order.buyer_email || buyer?.email || '',
    buyer_phone: order.buyer_phone ?? '',
    payment_id: order.payment_id,
    payment_doc_id: String(order.payment_doc_id),
    design_id: order.design_id ? String(order.design_id) : null,
    physical_batch_id: order.physical_batch_id ? String(order.physical_batch_id) : null,
    gift_card_ids: (order.gift_card_ids ?? []).map(String),
    stock_short: !!order.stock_short,
    last_error: order.last_error ?? '',
    shipment_alert: order.shipment?.alert ?? '',
    shipment_alert_message: order.shipment?.alert_message ?? '',
    shipment_sandbox: !!order.shipment?.sandbox,
    label_available: !!order.shipment?.awb,
  };
}

function usersOf(orders: IGiftCardOrder[]): Promise<Map<string, UserInfo>> {
  return loadUserMap(orders.map((o) => String(o.user_id)));
}

const ADDRESS_FIELDS: (keyof IGiftCardShippingAddress)[] = [
  'name', 'phone', 'line1', 'line2', 'landmark', 'city', 'state', 'pincode', 'country',
];

export const giftCardOrderAdminService = {
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IGiftCardOrder>(
      GiftCardOrderModel,
      {},
      input,
      ORDER_TABLE_CONFIG
    );
    await syncPaymentStatuses(docs);
    const users = await usersOf(docs);
    return { rows: docs.map((d) => adminOrderPub(d, users)), total, page, page_size };
  },

  /** One order with its audit trail, newest first. */
  async detail(id: string) {
    const order = await giftCardOrderService.findById(id);
    await syncPaymentStatuses([order]);
    const history = await GiftCardActivityModel.find({ entity_type: 'ORDER', entity_id: order._id })
      // _id breaks ties: rows written in the same millisecond keep the order they were written in.
      .sort({ created_at: -1, _id: -1 })
      .limit(200)
      .lean();
    const users = await loadUserMap([
      String(order.user_id),
      ...history.map((h) => (h.actor_user_id ? String(h.actor_user_id) : '')),
    ]);
    return {
      order: adminOrderPub(order, users),
      history: history.map((h) => ({
        id: String(h._id),
        action: h.action,
        note: h.note ?? '',
        actor_name: userNameOrDeleted(
          h.actor_user_id ? users.get(String(h.actor_user_id)) : null,
          h.actor_user_id
        ),
        created_at: h.created_at?.toISOString?.() ?? '',
      })),
    };
  },

  /** The order book at a glance, and what is waiting on the team. */
  async stats() {
    const [byStatus, byPayment, attention] = await Promise.all([
      GiftCardOrderModel.aggregate<{ _id: string; n: number }>([
        { $match: { payment_status: 'PAID' } },
        { $group: { _id: '$fulfilment_status', n: { $sum: 1 } } },
      ]),
      GiftCardOrderModel.aggregate<{ _id: string; n: number; value: number }>([
        { $group: { _id: '$payment_status', n: { $sum: 1 }, value: { $sum: '$total' } } },
      ]),
      GiftCardOrderModel.countDocuments({
        payment_status: 'PAID',
        $or: [{ stock_short: true }, { 'shipment.alert': { $ne: '' } }, { last_error: { $ne: '' } }],
      }),
    ]);
    const status = new Map(byStatus.map((s) => [s._id, s.n]));
    const paid = byPayment.find((p) => p._id === 'PAID');
    const count = (...keys: string[]) => keys.reduce((sum, k) => sum + (status.get(k) ?? 0), 0);
    return {
      paid_orders: paid?.n ?? 0,
      paid_value: paid?.value ?? 0,
      pending_payment: byPayment.find((p) => p._id === 'PENDING')?.n ?? 0,
      to_print: count('PROCESSING'),
      to_ship: count('PRINTED'),
      in_transit: count('AWAITING_SHIPMENT', 'AWB_ASSIGNED', 'PICKUP_SCHEDULED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'NDR'),
      delivered: count('DELIVERED'),
      returned_or_lost: count('RTO', 'RTO_DELIVERED', 'LOST'),
      needs_attention: attention,
    };
  },

  /** The scratch cards of a paid physical order are printed and packed. */
  async markPrinted(id: string, actorId: string) {
    const order = await giftCardOrderService.findById(id);
    if (order.delivery_mode !== 'PHYSICAL') badInput('Only a physical order is printed');
    if (order.payment_status !== 'PAID') badInput('This order has not been paid');
    if (order.fulfilment_status !== 'PROCESSING') badInput('This order is already past printing');
    order.fulfilment_status = 'PRINTED';
    order.printed_at = new Date();
    await order.save();
    await recordOrderActivity(order._id, 'ORDER_PRINTED', actorId, `${order.quantity} card(s)`);
    return adminOrderPub(order, await usersOf([order]));
  },

  /** Correct the ship-to before the courier is booked — the same rules checkout applied. */
  async updateAddress(id: string, input: Partial<Record<keyof IGiftCardShippingAddress, string | null>>, actorId: string) {
    const order = await giftCardOrderService.findById(id);
    if (order.delivery_mode !== 'PHYSICAL') badInput('A digital order has no delivery address');
    if (order.shipment?.order_id) badInput('The courier is already booked — change the address in ShipRocket');
    // Field by field: spreading a Mongoose subdocument copies none of its fields.
    const current = order.shipping_address;
    const next = {} as IGiftCardShippingAddress;
    for (const key of ADDRESS_FIELDS) {
      const value = input[key];
      next[key] = value == null ? String(current?.[key] ?? '') : String(value).trim().slice(0, 200);
    }
    if (!next.country) next.country = 'India';
    if (!next.name) badInput('Enter who the cards are delivered to', 'name');
    const problems = addressProblems(next);
    if (problems.length > 0) badInput(`Enter ${problems.join(' and ')}`, 'shipping_address');
    order.shipping_address = next;
    order.last_error = '';
    await order.save();
    await recordOrderActivity(order._id, 'ADDRESS_UPDATED', actorId, `${next.city} ${next.pincode}`);
    return adminOrderPub(order, await usersOf([order]));
  },

  adminOrderPub,
  usersOf,
};
