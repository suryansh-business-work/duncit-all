import type { Types } from 'mongoose';
import {
  ORDER_CHANNELS,
  ProductOrderModel,
  type FulfilmentStatus,
} from '@modules/commerce/productOrder/productOrder.model';
import { StoreReturnModel } from '@modules/commerce/store/storeReturn.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { dayKeyExpr, inRange } from './window';
import type { Keyed } from './aggregates';

/**
 * Everything Analytics > Money > Shop reads: the orders from both shops — the
 * pod shop inside the apps and the pet store — their returns, and the
 * catalogue they sell from. Order amounts are rupees, as stored.
 */

/**
 * Orders written before the pet store existed carry no channel and belong to
 * the pod shop. Listing `null` keeps them, and lets the (channel, created_at)
 * index serve a read that is really about dates.
 */
const ANY_CHANNEL = { $in: [...ORDER_CHANNELS, null] };
const ordersIn = (from: Date, to: Date) => ({ channel: ANY_CHANNEL, created_at: inRange(from, to) });

const IS_LIVE = { $eq: [{ $ifNull: ['$cancelled_at', null] }, null] };
/** What the buyer paid for an order: goods and delivery, less its share of every discount — the pet store's own rule. */
const NET = { $subtract: ['$total', { $ifNull: ['$discount_total', 0] }] };
const IS_PET_STORE = { $eq: ['$channel', 'PET_STORE'] };
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
  returns: number;
}

/** Each tile's raw totals for one period — loaded identically for the period before. */
export async function loadShopPeriod(from: Date, to: Date): Promise<ShopPeriod> {
  const [totals, returns] = await Promise.all([
    ProductOrderModel.aggregate<Omit<ShopPeriod, 'returns'>>([
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
    ]),
    StoreReturnModel.countDocuments({ created_at: inRange(from, to) }),
  ]);
  return { ...(totals[0] ?? { orders: 0, cancelled: 0, value: 0, cod: 0, done: 0, done_ms: 0 }), returns };
}

/** Orders in flight and the state of the catalogue, right now. */
export async function loadShopLive() {
  const [open, stock, listed] = await Promise.all([
    ProductOrderModel.countDocuments({ cancelled_at: null, fulfilment_status: { $in: IN_FLIGHT } }),
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
    InventoryProductModel.countDocuments({ 'store.listed': true, is_active: true }),
  ]);
  return { open, listed, ...(stock[0] ?? { products: 0, low: 0, out: 0 }) };
}

export interface OrderMixRow {
  _id: { channel: string; method: string; status: string; fulfilment: string; courier: string };
  count: number;
}

/** Orders in the period by every way the page splits them — a few dozen rows at most. */
export const loadOrderMix = (from: Date, to: Date) =>
  ProductOrderModel.aggregate<OrderMixRow>([
    { $match: ordersIn(from, to) },
    {
      $group: {
        _id: {
          channel: { $ifNull: ['$channel', 'POD_SHOP'] },
          method: { $ifNull: ['$payment_method', 'PREPAID'] },
          status: '$fulfilment_status',
          fulfilment: '$fulfilment_method',
          courier: { $ifNull: ['$shiprocket.courier_name', ''] },
        },
        count: { $sum: 1 },
      },
    },
  ]);

/** Pet store return requests in the period, by the reason the buyer picked. */
export const loadReturnReasons = (from: Date, to: Date) =>
  StoreReturnModel.aggregate<{ _id: string; count: number }>([
    { $match: { created_at: inRange(from, to) } },
    { $group: { _id: '$reason', count: { $sum: 1 } } },
  ]);

/** Per-day totals for the trends, in the admin's time zone. */
export async function loadShopDays(from: Date, to: Date, zone: string) {
  const [orders, returns] = await Promise.all([
    ProductOrderModel.aggregate<Keyed & { pod_shop: number; pet_store: number; value: number; cancelled: number }>([
      { $match: ordersIn(from, to) },
      {
        $group: {
          _id: dayKeyExpr('created_at', zone),
          pod_shop: { $sum: { $cond: [IS_PET_STORE, 0, 1] } },
          pet_store: { $sum: { $cond: [IS_PET_STORE, 1, 0] } },
          value: { $sum: { $cond: [IS_LIVE, NET, 0] } },
          cancelled: { $sum: { $cond: [IS_LIVE, 0, 1] } },
        },
      },
    ]),
    StoreReturnModel.aggregate<Keyed & { value: number }>([
      { $match: { created_at: inRange(from, to) } },
      { $group: { _id: dayKeyExpr('created_at', zone), value: { $sum: 1 } } },
    ]),
  ]);
  return { orders, returns };
}

export interface ProductSales { _id: Types.ObjectId; name: string; units: number; revenue: number; orders: number }

/** The ten products that sold the most units in the period, across both shops. */
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
