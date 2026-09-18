import type { Types } from 'mongoose';
import { ProductOrderModel, type FulfilmentStatus } from '@modules/commerce/productOrder/productOrder.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { dayKeyExpr, inRange } from './window';
import type { Keyed } from './aggregates';

/**
 * Everything Analytics > Business > Pod Shop reads: the orders placed in the
 * shop inside the apps, and the catalogue it sells from. The pet store has a
 * dashboard of its own (Pet Store), so its orders are left out here rather
 * than counted twice. Order amounts are rupees, as stored.
 */

/**
 * Orders written before the pet store existed carry no channel and belong to
 * the pod shop, so `null` is listed with it; matching on channel also lets the
 * (channel, created_at) index serve the date read.
 */
const POD_SHOP = { $in: ['POD_SHOP', null] };
const ordersIn = (from: Date, to: Date) => ({ channel: POD_SHOP, created_at: inRange(from, to) });

const IS_LIVE = { $eq: [{ $ifNull: ['$cancelled_at', null] }, null] };
/** What the buyer paid for an order: goods and delivery, less its share of every discount — the pet store's own rule. */
const NET = { $subtract: ['$total', { $ifNull: ['$discount_total', 0] }] };
const DONE_STATUSES = ['DELIVERED', 'PICKED_UP'];
const IS_DONE = { $in: ['$fulfilment_status', DONE_STATUSES] };
/**
 * When an order reached its buyer: the first tracking event saying so.
 * ShipRocket writes its own labels ("Delivered") and an operator writes ours
 * ("DELIVERED"), so case is ignored; an order with no such event falls back to
 * its last update.
 */
const REACHED_EVENTS = {
  $filter: {
    input: { $ifNull: ['$tracking_events', []] },
    as: 'event',
    cond: { $in: [{ $toUpper: { $ifNull: ['$$event.status', ''] } }, DONE_STATUSES] },
  },
};
const DONE_AT = { $ifNull: [{ $min: { $map: { input: REACHED_EVENTS, as: 'event', in: '$$event.at' } } }, '$updated_at'] };

/** Still on its way to the buyer — the Products console's own "pending fulfilment". */
const IN_FLIGHT: FulfilmentStatus[] = [
  'PENDING', 'AWAITING_SHIPMENT', 'AWB_ASSIGNED', 'PICKUP_SCHEDULED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'READY_FOR_PICKUP',
];
/** Products a buyer can actually be sold: switched on, approved, not archived or drafted. */
const ON_SALE = { is_active: true, status: { $in: ['ACTIVE', 'OUT_OF_STOCK'] }, listing_review_status: 'APPROVED' };
/** Units free to sell: stock less what hosts have requested and checkouts are holding. */
const AVAILABLE = {
  $subtract: [
    { $ifNull: ['$inventory_count', 0] },
    { $add: [{ $ifNull: ['$requested_count', 0] }, { $ifNull: ['$reserved_count', 0] }] },
  ],
};
/** The Products console reads an unset (or zero) alert level as 5, the model's default. */
const DEFAULT_LOW_STOCK = 5;
const ALERT_AT = { $cond: [{ $gt: [{ $ifNull: ['$low_stock_alert', 0] }, 0] }, '$low_stock_alert', DEFAULT_LOW_STOCK] };

export interface ShopPeriod {
  orders: number;
  cancelled: number;
  value: number;
  cod: number;
  done: number;
  done_ms: number;
}

/** Each tile's raw totals for one period — loaded identically for the period before. */
export async function loadShopPeriod(from: Date, to: Date): Promise<ShopPeriod> {
  const totals = await ProductOrderModel.aggregate<ShopPeriod>([
    { $match: ordersIn(from, to) },
    {
      $group: {
        _id: null,
        orders: { $sum: 1 },
        cancelled: { $sum: { $cond: [IS_LIVE, 0, 1] } },
        value: { $sum: { $cond: [IS_LIVE, NET, 0] } },
        cod: { $sum: { $cond: [{ $eq: ['$payment_method', 'COD'] }, 1, 0] } },
        done: { $sum: { $cond: [IS_DONE, 1, 0] } },
        done_ms: { $sum: { $cond: [IS_DONE, { $subtract: [DONE_AT, '$created_at'] }, 0] } },
      },
    },
  ]);
  return totals[0] ?? { orders: 0, cancelled: 0, value: 0, cod: 0, done: 0, done_ms: 0 };
}

/** Orders in flight and the state of the catalogue, right now. */
export async function loadShopLive() {
  const [open, stock] = await Promise.all([
    ProductOrderModel.countDocuments({ channel: POD_SHOP, cancelled_at: null, fulfilment_status: { $in: IN_FLIGHT } }),
    InventoryProductModel.aggregate<{ products: number; low: number; out: number }>([
      { $match: ON_SALE },
      {
        $group: {
          _id: null,
          products: { $sum: 1 },
          out: { $sum: { $cond: [{ $lte: [AVAILABLE, 0] }, 1, 0] } },
          low: { $sum: { $cond: [{ $and: [{ $gt: [AVAILABLE, 0] }, { $lte: [AVAILABLE, ALERT_AT] }] }, 1, 0] } },
        },
      },
    ]),
  ]);
  return { open, ...(stock[0] ?? { products: 0, low: 0, out: 0 }) };
}

export interface OrderMixRow {
  _id: { method: string; status: string; fulfilment: string; courier: string };
  count: number;
}

/** Orders in the period by every way the page splits them — a few dozen rows at most. */
export const loadOrderMix = (from: Date, to: Date) =>
  ProductOrderModel.aggregate<OrderMixRow>([
    { $match: ordersIn(from, to) },
    {
      $group: {
        _id: {
          method: { $ifNull: ['$payment_method', 'PREPAID'] },
          status: '$fulfilment_status',
          fulfilment: '$fulfilment_method',
          courier: { $ifNull: ['$shiprocket.courier_name', ''] },
        },
        count: { $sum: 1 },
      },
    },
  ]);

/** Per-day totals for the trends, in the admin's time zone. */
export const loadShopDays = (from: Date, to: Date, zone: string) =>
  ProductOrderModel.aggregate<Keyed & { orders: number; value: number; cancelled: number }>([
    { $match: ordersIn(from, to) },
    {
      $group: {
        _id: dayKeyExpr('created_at', zone),
        orders: { $sum: 1 },
        value: { $sum: { $cond: [IS_LIVE, NET, 0] } },
        cancelled: { $sum: { $cond: [IS_LIVE, 0, 1] } },
      },
    },
  ]);

export interface ProductSales { _id: Types.ObjectId; name: string; units: number; revenue: number; orders: number }

/** The ten products that sold the most units in the pod shop in the period. */
export const loadTopProducts = (from: Date, to: Date) =>
  ProductOrderModel.aggregate<ProductSales>([
    { $match: { ...ordersIn(from, to), cancelled_at: null } },
    { $unwind: '$line_items' },
    {
      $group: {
        _id: '$line_items.product_id',
        name: { $first: '$line_items.name' },
        units: { $sum: '$line_items.qty' },
        revenue: { $sum: '$line_items.gross' },
        orders: { $sum: 1 },
      },
    },
    { $sort: { units: -1, revenue: -1 } },
    { $limit: 10 },
  ]);

/** Whose product each ranked row is, so it can open the right catalogue page. */
export async function productOwners(ids: Types.ObjectId[]) {
  const products = await InventoryProductModel.find({ _id: { $in: ids } })
    .select('brand_name brand_id ownership')
    .lean<Array<{ _id: Types.ObjectId; brand_name?: string; brand_id?: Types.ObjectId | null; ownership?: string }>>();
  return new Map(products.map((product) => [product._id.toHexString(), product]));
}
