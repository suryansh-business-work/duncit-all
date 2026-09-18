import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { ProductOrderModel } from '@modules/commerce/productOrder/productOrder.model';
import { getAppTimeZone } from '@utils/app-time';
import { StoreCartModel } from './storeCart.model';
import { StoreReturnModel } from './storeReturn.model';
import { round2 } from './store.shared';

/**
 * The ecomm portal's home: how the store did over a period, and what is
 * waiting on the team right now. Every figure is read from orders, never from
 * payments, so a COD order counts the day it is placed — the same day an
 * operator has to pack it.
 */

type Doc = Record<string, any>;

const PERIODS = new Set([7, 30, 90, 365]);
const DAY_MS = 86_400_000;

/** Revenue an order brings: goods + delivery, less its share of every discount. */
const NET = { $subtract: ['$total', { $ifNull: ['$discount_total', 0] }] };

async function periodTotals(from: Date) {
  const [row] = await ProductOrderModel.aggregate<Doc>([
    { $match: { channel: 'PET_STORE', created_at: { $gte: from } } },
    {
      $group: {
        _id: null,
        orders: { $sum: 1 },
        cancelled: { $sum: { $cond: [{ $ne: ['$cancelled_at', null] }, 1, 0] } },
        revenue: { $sum: { $cond: [{ $eq: ['$cancelled_at', null] }, NET, 0] } },
        cod_orders: { $sum: { $cond: [{ $eq: ['$payment_method', 'COD'] }, 1, 0] } },
        delivered: { $sum: { $cond: [{ $eq: ['$fulfilment_status', 'DELIVERED'] }, 1, 0] } },
        units: { $sum: { $sum: '$line_items.qty' } },
        buyers: { $addToSet: '$buyer_email' },
      },
    },
  ]);
  return row ?? { orders: 0, cancelled: 0, revenue: 0, cod_orders: 0, delivered: 0, units: 0, buyers: [] };
}

async function dailySeries(from: Date) {
  const timezone = getAppTimeZone();
  const rows = await ProductOrderModel.aggregate<Doc>([
    { $match: { channel: 'PET_STORE', created_at: { $gte: from } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at', timezone } },
        orders: { $sum: 1 },
        revenue: { $sum: { $cond: [{ $eq: ['$cancelled_at', null] }, NET, 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  return rows.map((r) => ({ date: r._id, orders: r.orders, revenue: round2(r.revenue) }));
}

async function topProducts(from: Date) {
  const rows = await ProductOrderModel.aggregate<Doc>([
    { $match: { channel: 'PET_STORE', created_at: { $gte: from }, cancelled_at: null } },
    { $unwind: '$line_items' },
    {
      $group: {
        _id: '$line_items.product_id',
        name: { $first: '$line_items.name' },
        image_url: { $first: '$line_items.image_url' },
        units: { $sum: '$line_items.qty' },
        revenue: { $sum: '$line_items.gross' },
      },
    },
    { $sort: { units: -1, revenue: -1 } },
    { $limit: 10 },
  ]);
  return rows.map((r) => ({
    product_id: String(r._id),
    name: r.name,
    image_url: r.image_url ?? '',
    units: r.units,
    revenue: round2(r.revenue),
  }));
}

async function statusBreakdown(from: Date) {
  const rows = await ProductOrderModel.aggregate<Doc>([
    { $match: { channel: 'PET_STORE', created_at: { $gte: from } } },
    { $group: { _id: '$fulfilment_status', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  return rows.map((r) => ({ status: r._id, count: r.count }));
}

/** Customers whose FIRST pet-store order falls inside the period. */
async function newCustomers(from: Date) {
  const [row] = await ProductOrderModel.aggregate<Doc>([
    { $match: { channel: 'PET_STORE' } },
    { $group: { _id: '$buyer_email', first: { $min: '$created_at' } } },
    { $match: { first: { $gte: from } } },
    { $count: 'n' },
  ]);
  return row?.n ?? 0;
}

/** What needs someone today, whatever the period. */
async function workQueue() {
  const listed = { 'store.listed': true, is_active: true };
  const available = {
    $subtract: [
      { $ifNull: ['$inventory_count', 0] },
      { $add: [{ $ifNull: ['$requested_count', 0] }, { $ifNull: ['$reserved_count', 0] }] },
    ],
  };
  const [toShip, returnsOpen, stock, abandoned, listedCount] = await Promise.all([
    ProductOrderModel.countDocuments({
      channel: 'PET_STORE',
      cancelled_at: null,
      fulfilment_status: { $in: ['PENDING', 'AWAITING_SHIPMENT', 'FAILED'] },
    }),
    StoreReturnModel.countDocuments({ status: { $in: ['REQUESTED', 'APPROVED', 'PICKUP_SCHEDULED', 'RECEIVED'] } }),
    InventoryProductModel.aggregate<Doc>([
      { $match: listed },
      { $project: { available, alert: { $ifNull: ['$low_stock_alert', 0] } } },
      {
        $group: {
          _id: null,
          out: { $sum: { $cond: [{ $lte: ['$available', 0] }, 1, 0] } },
          low: {
            $sum: { $cond: [{ $and: [{ $gt: ['$available', 0] }, { $lte: ['$available', '$alert'] }] }, 1, 0] },
          },
        },
      },
    ]),
    StoreCartModel.countDocuments({
      'items.0': { $exists: true },
      last_activity_at: { $lt: new Date(Date.now() - 60 * 60 * 1000), $gt: new Date(Date.now() - 7 * DAY_MS) },
    }),
    InventoryProductModel.countDocuments(listed),
  ]);
  return {
    to_ship: toShip,
    returns_open: returnsOpen,
    out_of_stock: stock[0]?.out ?? 0,
    low_stock: stock[0]?.low ?? 0,
    abandoned_carts: abandoned,
    listed_products: listedCount,
  };
}

export const storeDashboardService = {
  async overview(days: number) {
    const period = PERIODS.has(days) ? days : 30;
    const from = new Date(Date.now() - period * DAY_MS);
    const [totals, series, top, statuses, fresh, queue] = await Promise.all([
      periodTotals(from),
      dailySeries(from),
      topProducts(from),
      statusBreakdown(from),
      newCustomers(from),
      workQueue(),
    ]);
    const live = totals.orders - totals.cancelled;
    return {
      days: period,
      orders: totals.orders,
      cancelled: totals.cancelled,
      delivered: totals.delivered,
      revenue: round2(totals.revenue),
      average_order_value: live > 0 ? round2(totals.revenue / live) : 0,
      units: totals.units,
      cod_share_pct: totals.orders > 0 ? Math.round((totals.cod_orders / totals.orders) * 100) : 0,
      customers: (totals.buyers ?? []).length,
      new_customers: fresh,
      series,
      top_products: top,
      statuses,
      ...queue,
    };
  },
};
