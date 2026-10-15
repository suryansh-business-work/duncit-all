import type { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { makeContext } from '@test/harness';
import { venueFoodResolvers } from '../../venueFood.resolver';
import { venueFoodRating } from '../../venueFood.rating';
import { VenueFoodOrderModel, type FoodOrderStatus, type FoodPaymentStatus } from '../../venueFoodOrder.model';
import { venueFoodMineService, type FoodOrderKeyInput, type MyFoodOrdersInput } from '../../venueFoodOrder.mine';

/**
 * "Your Food Orders" and a venue's food rating, against the in-memory database.
 * An order is the caller's only by the account that placed it or by the key
 * that opens it — every case here pushes on one side of that rule.
 */

const HOUR_MS = 60 * 60 * 1000;
const venueId = new Types.ObjectId();
const otherVenueId = new Types.ObjectId();
let seq = 0;

interface SeedOptions {
  user?: Types.ObjectId | null;
  key?: string;
  status?: FoodOrderStatus;
  payment?: FoodPaymentStatus;
  venue?: Types.ObjectId;
  /** How long ago the order was placed. */
  ageMs?: number;
  rating?: number;
}

async function seedOrder(options: SeedOptions = {}) {
  seq += 1;
  const order = await VenueFoodOrderModel.create({
    order_no: `FOOD-${seq}`,
    venue_id: options.venue ?? venueId,
    venue_name: 'Cafe Uno',
    user_id: options.user ?? null,
    customer_name: 'Asha Rao',
    customer_phone: '9876543210',
    subtotal_paise: 24000,
    total_paise: 24000,
    status: options.status ?? 'PLACED',
    payment_status: options.payment ?? 'PAID',
    razorpay_integration_id: new Types.ObjectId(),
    client_key: `client-key-${seq}-${new Types.ObjectId().toHexString()}`,
    access_key: options.key ?? `key-${seq}-${new Types.ObjectId().toHexString()}`,
    ...(options.rating ? { feedback: { rating: options.rating, submitted_at: new Date() } } : {}),
  });
  // Mongoose holds created_at immutable; age it underneath the model.
  const createdAt = new Date(Date.now() - (options.ageMs ?? 0) - seq);
  await VenueFoodOrderModel.collection.updateOne({ _id: order._id }, { $set: { created_at: createdAt } });
  return order._id.toHexString();
}

const guestCtx = makeContext(null);
const list = (input: MyFoodOrdersInput, ctx = guestCtx) => venueFoodMineService.list(ctx, input);
const ids = (page: { rows: Array<{ id: string }> }) => page.rows.map((row) => row.id);

/** What a refused call was refused with. */
async function refusal(run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    const refused = error as GraphQLError;
    return { code: refused.extensions?.code, message: refused.message };
  }
  throw new Error('Expected the call to be refused');
}

describe('venueFoodMineService.list — whose orders', () => {
  it('shows a signed-out visitor whose device placed nothing no orders at all', async () => {
    await seedOrder();
    expect(await list({ scope: 'CURRENT' })).toEqual({ rows: [], total: 0, page: 1, page_size: 10 });
    expect(await list({ scope: 'CURRENT', keys: [] })).toMatchObject({ total: 0 });
  });

  it("shows a guest the orders their keys open, and silently drops a wrong key, a blank key and a bad id", async () => {
    const mine = await seedOrder({ key: 'right-key-abc' });
    const someoneElses = await seedOrder({ key: 'their-key-xyz' });
    const page = await list({
      scope: 'CURRENT',
      keys: [
        { order_id: mine, access_key: 'right-key-abc' },
        // Same length as the real key, one character off — the constant-time compare still refuses it.
        { order_id: someoneElses, access_key: 'their-key-xyZ' },
        { order_id: someoneElses, access_key: '   ' },
        { order_id: 'not-an-id', access_key: 'right-key-abc' },
      ],
    });
    expect(ids(page)).toEqual([mine]);
    expect(page.total).toBe(1);
    // The key itself is never handed back out.
    expect(page.rows[0]).not.toHaveProperty('access_key');
  });

  it('refuses a key that is a prefix or an extension of the real one', async () => {
    const mine = await seedOrder({ key: 'right-key-abc' });
    for (const access_key of ['right-key-ab', 'right-key-abcd']) {
      expect((await list({ scope: 'CURRENT', keys: [{ order_id: mine, access_key }] })).total).toBe(0);
    }
  });

  it('reads at most 20 keys from one device', async () => {
    const filler: FoodOrderKeyInput[] = Array.from({ length: 19 }, () => ({
      order_id: new Types.ObjectId().toHexString(),
      access_key: 'nothing',
    }));
    const twentieth = await seedOrder({ key: 'twentieth' });
    const twentyFirst = await seedOrder({ key: 'twenty-first' });
    const page = await list({
      scope: 'CURRENT',
      keys: [...filler, { order_id: twentieth, access_key: 'twentieth' }, { order_id: twentyFirst, access_key: 'twenty-first' }],
    });
    expect(ids(page)).toEqual([twentieth]);
  });

  it("matches a signed-in member by account, merges their device's keys, and never shows another account's order", async () => {
    const member = new Types.ObjectId();
    const byAccount = await seedOrder({ user: member });
    const byKey = await seedOrder({ key: 'guest-key-1' });
    await seedOrder({ user: new Types.ObjectId() });
    const page = await list(
      { scope: 'CURRENT', keys: [{ order_id: byKey, access_key: 'guest-key-1' }] },
      makeContext({ id: member.toHexString() })
    );
    expect(ids(page).sort((a, b) => a.localeCompare(b))).toEqual([byAccount, byKey].sort((a, b) => a.localeCompare(b)));
  });

  it('treats a caller whose id is not an object id as signed out', async () => {
    await seedOrder({ user: new Types.ObjectId() });
    expect((await list({ scope: 'CURRENT' }, makeContext({ id: 'legacy-id' }))).total).toBe(0);
  });
});

describe('venueFoodMineService.list — current and past', () => {
  const member = new Types.ObjectId();
  const asMember = () => makeContext({ id: member.toHexString() });

  it('splits paid orders by whether the kitchen is done, and keeps only a recent unpaid one as current', async () => {
    const cooking = await seedOrder({ user: member, status: 'PREPARING' });
    const placed = await seedOrder({ user: member, status: 'PLACED' });
    const awaitingPayment = await seedOrder({ user: member, payment: 'PENDING', ageMs: 30 * 60 * 1000 });
    await seedOrder({ user: member, payment: 'PENDING', ageMs: 2 * HOUR_MS });
    const served = await seedOrder({ user: member, status: 'SERVED' });
    const refunded = await seedOrder({ user: member, status: 'CANCELLED', payment: 'REFUNDED' });
    const refundPending = await seedOrder({ user: member, status: 'CANCELLED', payment: 'REFUND_PENDING' });
    // Never paid: no money moved, so it is neither current nor past.
    await seedOrder({ user: member, status: 'CANCELLED', payment: 'PENDING', ageMs: 2 * HOUR_MS });
    await seedOrder({ user: member, status: 'CANCELLED', payment: 'FAILED' });

    const current = await list({ scope: 'CURRENT' }, asMember());
    expect(new Set(ids(current))).toEqual(new Set([cooking, placed, awaitingPayment]));
    const past = await list({ scope: 'PAST' }, asMember());
    expect(new Set(ids(past))).toEqual(new Set([served, refunded, refundPending]));
  });

  it('narrows to one venue when asked, and refuses a venue id that is not an id', async () => {
    const here = await seedOrder({ user: member });
    await seedOrder({ user: member, venue: otherVenueId });
    expect(ids(await list({ scope: 'CURRENT', venue_id: venueId.toHexString() }, asMember()))).toEqual([here]);
    expect(await refusal(() => list({ scope: 'CURRENT', venue_id: 'nope' }, asMember()))).toEqual({
      code: 'BAD_USER_INPUT',
      message: 'Invalid venue id',
    });
  });

  it('refuses a scope it does not know, and a missing one', async () => {
    expect(await refusal(() => list({ scope: 'ALL' as string as MyFoodOrdersInput['scope'] }))).toMatchObject({ code: 'BAD_USER_INPUT' });
    expect(await refusal(() => venueFoodMineService.list(guestCtx, undefined as unknown as MyFoodOrdersInput))).toMatchObject({
      code: 'BAD_USER_INPUT',
    });
  });
});

describe('venueFoodMineService.list — pages', () => {
  const member = new Types.ObjectId();
  const asMember = () => makeContext({ id: member.toHexString() });

  it('pages newest first, and the total counts every match', async () => {
    const oldest = await seedOrder({ user: member, ageMs: 3000 });
    const middle = await seedOrder({ user: member, ageMs: 2000 });
    const newest = await seedOrder({ user: member, ageMs: 1000 });

    const first = await list({ scope: 'CURRENT', page: 1, page_size: 2 }, asMember());
    expect(first).toMatchObject({ total: 3, page: 1, page_size: 2 });
    expect(ids(first)).toEqual([newest, middle]);
    const second = await list({ scope: 'CURRENT', page: 2, page_size: 2 }, asMember());
    expect(ids(second)).toEqual([oldest]);
  });

  it('caps the page size at 20 and falls back to page 1 / size 10 for values that are not whole positives', async () => {
    await Promise.all(Array.from({ length: 22 }, () => seedOrder({ user: member })));
    const capped = await list({ scope: 'CURRENT', page_size: 500 }, asMember());
    expect(capped).toMatchObject({ total: 22, page_size: 20 });
    expect(capped.rows).toHaveLength(20);

    for (const bad of [0, -1, 1.5, null]) {
      const page = await list({ scope: 'CURRENT', page: bad, page_size: bad }, asMember());
      expect(page).toMatchObject({ page: 1, page_size: 10 });
      expect(page.rows).toHaveLength(10);
    }
  });
});

describe('venueFoodRating', () => {
  it("averages the venue's rated orders to one decimal and counts them", async () => {
    await seedOrder({ rating: 4, status: 'SERVED' });
    await seedOrder({ rating: 5, status: 'SERVED' });
    await seedOrder({ rating: 4, status: 'SERVED' });
    await seedOrder({ status: 'SERVED' });
    await seedOrder({ rating: 1, status: 'SERVED', venue: otherVenueId });
    expect(await venueFoodRating(venueId.toHexString())).toEqual({ venue_id: venueId.toHexString(), average: 4.3, count: 3 });
  });

  it('reads 0 from 0 ratings rather than nothing', async () => {
    await seedOrder({ status: 'SERVED' });
    expect(await venueFoodRating(venueId.toHexString())).toEqual({ venue_id: venueId.toHexString(), average: 0, count: 0 });
  });

  it('refuses a venue id that is not an id', async () => {
    expect(await refusal(() => venueFoodRating('nope'))).toEqual({ code: 'BAD_USER_INPUT', message: 'Invalid venue id' });
  });
});

describe('venueFood resolvers — the two public reads', () => {
  const { Query } = venueFoodResolvers;

  it("answers myVenueFoodOrders for a guest with only their own key's orders", async () => {
    const mine = await seedOrder({ key: 'resolver-key' });
    await seedOrder();
    const page = await Query.myVenueFoodOrders(
      null,
      { input: { scope: 'CURRENT', keys: [{ order_id: mine, access_key: 'resolver-key' }] } },
      guestCtx
    );
    expect(ids(page)).toEqual([mine]);
  });

  it('answers venueFoodRating without a caller', async () => {
    await seedOrder({ rating: 3, status: 'SERVED' });
    expect(await Query.venueFoodRating(null, { venue_id: venueId.toHexString() })).toMatchObject({ average: 3, count: 1 });
  });
});
