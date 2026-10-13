import { Types } from 'mongoose';
import { VENUE_FOOD_DISCOUNT_MAX_PCT } from '@modules/venues/venue/venue.constants';
import { logs } from '@observability/log';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { VenueFoodCouponModel, type IVenueFoodCoupon } from './venueFoodCoupon.model';
import { FOOD_COUPON_CODE, normalizeFoodCouponCode } from './venueFoodCoupon.redemption';
import { FOOD_LOG, badInput, fail, iso, managedVenue, objectId, rupees, text } from './venueFoodOrder.shared';

/**
 * A venue owner's own coupons for food orders: list, create, edit, switch on
 * and off, delete.
 *
 * Every call starts from `managedVenue` — the rule the order board uses — so a
 * coupon is only ever read or written by the owner of its venue, or by a
 * venues-console editor. The venue comes from the stored coupon on an edit,
 * never from the request.
 *
 * Deleting is a real delete: an order keeps the code, the percent and the
 * paise it took off, so its history survives the coupon. Every write is logged
 * with who made it.
 */

const DESCRIPTION_MAX = 300;
const DUPLICATE_KEY = 11000;

const COUPON_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['code', 'description'],
  sortFields: {
    code: 'code',
    discount_pct: 'discount_pct',
    min_order_amount: 'min_order_paise',
    valid_from: 'valid_from',
    valid_until: 'valid_until',
    used_count: 'used_count',
    is_active: 'is_active',
    created_at: 'created_at',
  },
  filterFields: {
    is_active: { type: 'boolean' },
    discount_pct: { type: 'number' },
    used_count: { type: 'number' },
    valid_from: { type: 'date' },
    valid_until: { type: 'date' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

/** What the owner's form sends. On an edit, a field left out is left alone; null clears a field that can be empty. */
export interface FoodCouponInput {
  code?: string | null;
  description?: string | null;
  discount_pct?: number | null;
  /** Rupees. */
  min_order_amount?: number | null;
  valid_from?: string | null;
  valid_until?: string | null;
  max_uses?: number | null;
  per_phone_limit?: number | null;
  is_active?: boolean | null;
}

export interface CreateFoodCouponInput extends FoodCouponInput {
  venue_id: string;
  code: string;
  discount_pct: number;
}

/** The terms of a coupon — what the owner sets, and what a change is logged as. */
interface CouponTerms {
  code: string;
  description: string;
  discount_pct: number;
  min_order_paise: number;
  valid_from: Date | null;
  valid_until: Date | null;
  max_uses: number | null;
  per_phone_limit: number | null;
  is_active: boolean;
}

const BLANK_TERMS: CouponTerms = {
  code: '',
  description: '',
  discount_pct: 0,
  min_order_paise: 0,
  valid_from: null,
  valid_until: null,
  max_uses: null,
  per_phone_limit: null,
  is_active: true,
};

// Every field below has a schema default, and the collection is new: there is no older shape to read around.
const termsOf = (coupon: IVenueFoodCoupon): CouponTerms => ({
  code: coupon.code,
  description: coupon.description,
  discount_pct: coupon.discount_pct,
  min_order_paise: coupon.min_order_paise,
  valid_from: coupon.valid_from,
  valid_until: coupon.valid_until,
  max_uses: coupon.max_uses,
  per_phone_limit: coupon.per_phone_limit,
  is_active: coupon.is_active,
});

export const toFoodCouponPub = (coupon: IVenueFoodCoupon) => ({
  id: coupon._id.toHexString(),
  venue_id: coupon.venue_id.toHexString(),
  code: coupon.code,
  description: coupon.description,
  discount_pct: coupon.discount_pct,
  min_order_amount: rupees(coupon.min_order_paise),
  valid_from: iso(coupon.valid_from),
  valid_until: iso(coupon.valid_until),
  max_uses: coupon.max_uses,
  per_phone_limit: coupon.per_phone_limit,
  used_count: coupon.used_count,
  is_active: coupon.is_active,
  created_at: coupon.created_at.toISOString(),
  updated_at: coupon.updated_at.toISOString(),
});

function cleanCode(raw: unknown) {
  const code = normalizeFoodCouponCode(raw);
  if (!FOOD_COUPON_CODE.test(code)) badInput('Code must be 3-30 chars: A-Z, 0-9, - or _');
  return code;
}

function cleanDescription(raw: unknown) {
  const description = text(raw);
  if (description.length > DESCRIPTION_MAX) badInput(`Keep the description under ${DESCRIPTION_MAX} characters`);
  return description;
}

function cleanDiscount(raw: unknown) {
  const pct = Number(raw);
  if (!Number.isInteger(pct) || pct < 1 || pct > VENUE_FOOD_DISCOUNT_MAX_PCT) {
    badInput(`The discount must be a whole number from 1 to ${VENUE_FOOD_DISCOUNT_MAX_PCT}`);
  }
  return pct;
}

function cleanMinOrder(raw: unknown) {
  const paise = Math.round(Number(raw) * 100);
  if (!Number.isSafeInteger(paise) || paise < 0) badInput('Enter a minimum order of 0 or more');
  return paise;
}

function cleanDate(raw: string | null, label: string) {
  if (raw === null) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) badInput(`Enter a valid ${label} date`);
  return date;
}

function cleanLimit(raw: number | null, label: string) {
  if (raw === null) return null;
  if (!Number.isInteger(raw) || raw < 1) badInput(`${label} must be a whole number of 1 or more`);
  return raw;
}

/** `current` with every field the input carries laid over it, each one checked. */
function mergeTerms(current: CouponTerms, input: FoodCouponInput): CouponTerms {
  const sent = <T>(value: T | null | undefined): value is T => value !== undefined && value !== null;
  const terms: CouponTerms = {
    code: sent(input.code) ? cleanCode(input.code) : current.code,
    description: sent(input.description) ? cleanDescription(input.description) : current.description,
    discount_pct: sent(input.discount_pct) ? cleanDiscount(input.discount_pct) : current.discount_pct,
    min_order_paise: sent(input.min_order_amount) ? cleanMinOrder(input.min_order_amount) : current.min_order_paise,
    valid_from: input.valid_from === undefined ? current.valid_from : cleanDate(input.valid_from, 'start'),
    valid_until: input.valid_until === undefined ? current.valid_until : cleanDate(input.valid_until, 'end'),
    max_uses: input.max_uses === undefined ? current.max_uses : cleanLimit(input.max_uses, 'Total uses'),
    per_phone_limit:
      input.per_phone_limit === undefined ? current.per_phone_limit : cleanLimit(input.per_phone_limit, 'Uses per person'),
    is_active: sent(input.is_active) ? input.is_active : current.is_active,
  };
  if (terms.valid_from && terms.valid_until && terms.valid_until.getTime() <= terms.valid_from.getTime()) {
    badInput('The end date must be after the start date');
  }
  return terms;
}

const isDuplicateKey = (error: unknown) => (error as { code?: number } | null)?.code === DUPLICATE_KEY;

/** Save, turning the per-venue unique index's refusal into a sentence the owner can act on. */
async function saved(coupon: IVenueFoodCoupon) {
  try {
    return await coupon.save();
  } catch (error) {
    if (isDuplicateKey(error)) badInput('This venue already has a coupon with this code');
    throw error;
  }
}

async function managedCoupon(userId: string, isAdmin: boolean, couponId: string) {
  const coupon = await VenueFoodCouponModel.findById(objectId(couponId, 'Invalid coupon id'));
  if (!coupon) return fail('NOT_FOUND', 'Coupon not found');
  await managedVenue(userId, isAdmin, coupon.venue_id.toHexString());
  return coupon;
}

const actorId = (userId: string) => (Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : null);

type CouponAction = 'create' | 'update' | 'activate' | 'deactivate' | 'delete';

/** The trail of who changed a venue's coupon, in the log food ordering already writes its cancels and refunds to. */
function audit(
  action: CouponAction,
  actor: { userId: string; isAdmin: boolean },
  coupon: IVenueFoodCoupon,
  before: CouponTerms | null
) {
  logs.server.info(FOOD_LOG, 'coupon', {
    action,
    by: actor.userId,
    isAdmin: actor.isAdmin,
    venueId: coupon.venue_id.toHexString(),
    couponId: coupon._id.toHexString(),
    code: coupon.code,
    usedCount: coupon.used_count,
    before,
    after: action === 'delete' ? null : termsOf(coupon),
  });
}

export const venueFoodCouponService = {
  /** The venue's coupons (DUNCIT TABLE CONTRACT v1). The venue filter is pinned, so no client filter can widen it. */
  async table(userId: string, isAdmin: boolean, venueId: string, input?: TableQueryInput | null) {
    const venue = await managedVenue(userId, isAdmin, venueId);
    const { docs, total, page, page_size } = await runTableQuery<IVenueFoodCoupon>(
      VenueFoodCouponModel,
      { venue_id: venue._id },
      input,
      COUPON_TABLE_CONFIG
    );
    return { rows: docs.map(toFoodCouponPub), total, page, page_size };
  },

  async create(userId: string, isAdmin: boolean, input: CreateFoodCouponInput) {
    const venue = await managedVenue(userId, isAdmin, input.venue_id);
    const terms = mergeTerms(BLANK_TERMS, input);
    const by = actorId(userId);
    const coupon = await saved(new VenueFoodCouponModel({ ...terms, venue_id: venue._id, created_by: by, updated_by: by }));
    audit('create', { userId, isAdmin }, coupon, null);
    return toFoodCouponPub(coupon);
  },

  /** Edit a coupon's terms. `used_count` is never part of the write, so an edit cannot rewind what was redeemed. */
  async update(userId: string, isAdmin: boolean, couponId: string, input: FoodCouponInput) {
    const coupon = await managedCoupon(userId, isAdmin, couponId);
    const before = termsOf(coupon);
    coupon.set({ ...mergeTerms(before, input), updated_by: actorId(userId) });
    await saved(coupon);
    audit('update', { userId, isAdmin }, coupon, before);
    return toFoodCouponPub(coupon);
  },

  async setActive(userId: string, isAdmin: boolean, couponId: string, isActive: boolean) {
    const coupon = await managedCoupon(userId, isAdmin, couponId);
    const before = termsOf(coupon);
    coupon.set({ is_active: isActive === true, updated_by: actorId(userId) });
    await coupon.save();
    audit(coupon.is_active ? 'activate' : 'deactivate', { userId, isAdmin }, coupon, before);
    return toFoodCouponPub(coupon);
  },

  /** Remove a coupon. Orders that used it keep their own record of the code and the discount. */
  async remove(userId: string, isAdmin: boolean, couponId: string) {
    const coupon = await managedCoupon(userId, isAdmin, couponId);
    const before = termsOf(coupon);
    await coupon.deleteOne();
    audit('delete', { userId, isAdmin }, coupon, before);
    return true;
  },
};
