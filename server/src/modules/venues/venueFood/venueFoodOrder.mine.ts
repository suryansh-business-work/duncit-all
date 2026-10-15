import { Types, type FilterQuery } from 'mongoose';
import type { GraphQLContext } from '@context';
import { sameSecret } from '@modules/commerce/store/store.shared';
import { VenueFoodOrderModel, type IVenueFoodOrder } from './venueFoodOrder.model';
import { FOOD_PAID_STATUSES, badInput, objectId, text, toFoodOrderPub } from './venueFoodOrder.shared';

/**
 * "Your Food Orders": the orders that are the CALLER's, and nobody else's.
 *
 * An order is the caller's in exactly the two ways reading one already is
 * (`assertOrderAccess`): the signed-in account placed it, or the caller holds
 * its access key. A guest's device remembers the keys of the orders it placed,
 * so it sends them here; a signed-in member is also matched by account, so
 * their orders follow them to another device. Nothing else widens the filter.
 */

export const MY_FOOD_ORDER_SCOPES = ['CURRENT', 'PAST'] as const;
export type MyFoodOrderScope = (typeof MY_FOOD_ORDER_SCOPES)[number];

/** The keys one device may send — it remembers at most a handful of orders. */
const MAX_KEYS = 20;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 20;
/**
 * How long an order nobody has paid for yet still counts as current. Its
 * payment can still be finished from its page, but a checkout abandoned long
 * ago is not an order the guest is waiting on.
 */
const AWAITING_PAYMENT_WINDOW_MS = 60 * 60 * 1000;

export interface FoodOrderKeyInput {
  order_id: string;
  access_key: string;
}

export interface MyFoodOrdersInput {
  scope: MyFoodOrderScope;
  /** Only this venue's orders — the venue page's "running orders" banner. */
  venue_id?: string | null;
  /** The orders this device placed, each with the key that proves it. */
  keys?: FoodOrderKeyInput[] | null;
  /** 1-based. */
  page?: number | null;
  page_size?: number | null;
}

/** The ids among `keys` whose key really opens the order — a wrong key is dropped, never an error. */
async function provenOrderIds(keys: FoodOrderKeyInput[] | null | undefined): Promise<Types.ObjectId[]> {
  const wanted = new Map<string, string>();
  for (const entry of (keys ?? []).slice(0, MAX_KEYS)) {
    const id = text(entry?.order_id);
    const key = text(entry?.access_key);
    if (key && Types.ObjectId.isValid(id)) wanted.set(id, key);
  }
  if (wanted.size === 0) return [];
  const orders = await VenueFoodOrderModel.find({ _id: { $in: [...wanted.keys()].map((id) => new Types.ObjectId(id)) } })
    // Naming the key in an inclusive projection reads it despite `select: false`.
    .select('access_key')
    .lean<Array<Pick<IVenueFoodOrder, '_id' | 'access_key'>>>();
  return orders
    .filter((order) => sameSecret(wanted.get(order._id.toHexString()) ?? '', order.access_key ?? ''))
    .map((order) => order._id);
}

/**
 * CURRENT: paid and still with the kitchen, or placed within the last hour and
 * still waiting for its payment. PAST: paid, and served or cancelled. An order
 * that was never paid is never "past" — no money moved, there is nothing to look back on.
 */
function scopeFilter(scope: MyFoodOrderScope, now: number): FilterQuery<IVenueFoodOrder> {
  if (scope === 'PAST') {
    return { payment_status: { $in: [...FOOD_PAID_STATUSES] }, status: { $in: ['SERVED', 'CANCELLED'] } };
  }
  return {
    $or: [
      { payment_status: 'PAID', status: { $nin: ['SERVED', 'CANCELLED'] } },
      { payment_status: 'PENDING', created_at: { $gte: new Date(now - AWAITING_PAYMENT_WINDOW_MS) } },
    ],
  };
}

const pageOf = (value: number | null | undefined, fallback: number, max: number) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? Math.min(n, max) : fallback;
};

export const venueFoodMineService = {
  /** One page of the caller's own orders, newest first. Anyone may ask; only their own orders come back. */
  async list(ctx: GraphQLContext, input: MyFoodOrdersInput) {
    if (!MY_FOOD_ORDER_SCOPES.includes(input?.scope)) badInput('Choose which orders to show');
    const page = pageOf(input.page, 1, Number.MAX_SAFE_INTEGER);
    const pageSize = pageOf(input.page_size, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const empty = { rows: [], total: 0, page, page_size: pageSize };

    const userId = ctx.user?.id && Types.ObjectId.isValid(ctx.user.id) ? new Types.ObjectId(ctx.user.id) : null;
    const proven = await provenOrderIds(input.keys);
    const owners: FilterQuery<IVenueFoodOrder>[] = [];
    if (userId) owners.push({ user_id: userId });
    if (proven.length) owners.push({ _id: { $in: proven } });
    // A signed-out visitor whose device placed nothing has no orders to see.
    if (owners.length === 0) return empty;

    const filter: FilterQuery<IVenueFoodOrder> = {
      $and: [{ $or: owners }, scopeFilter(input.scope, Date.now())],
      ...(input.venue_id ? { venue_id: objectId(input.venue_id, 'Invalid venue id') } : {}),
    };
    const [docs, total] = await Promise.all([
      VenueFoodOrderModel.find(filter)
        .sort({ created_at: -1, _id: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      VenueFoodOrderModel.countDocuments(filter),
    ]);
    return { rows: docs.map(toFoodOrderPub), total, page, page_size: pageSize };
  },
};
