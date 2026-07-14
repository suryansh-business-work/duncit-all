import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { CouponModel, type ICoupon } from './coupon.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';

const round2 = (n: number) => Math.round(n * 100) / 100;
const iso = (d?: Date | null) => (d ? d.toISOString() : null);

const toPub = (c: ICoupon) => ({
  id: String(c._id),
  code: c.code,
  description: c.description ?? '',
  discount_pct: c.discount_pct,
  scope: c.scope,
  pod_id: c.pod_id ? String(c.pod_id) : null,
  valid_from: iso(c.valid_from),
  valid_until: iso(c.valid_until),
  max_uses: c.max_uses,
  per_user_limit: c.per_user_limit,
  min_order_amount: c.min_order_amount,
  used_count: c.used_count,
  is_active: c.is_active,
  created_at: c.created_at.toISOString(),
  updated_at: c.updated_at.toISOString(),
});

const toDate = (v?: string | null) => (v ? new Date(v) : null);

/** Allowlists for the shared table engine (couponsTable / couponsForPodTable — DUNCIT TABLE CONTRACT v1). */
const COUPON_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['code', 'description'],
  sortFields: {
    code: 'code',
    discount_pct: 'discount_pct',
    valid_from: 'valid_from',
    valid_until: 'valid_until',
    used_count: 'used_count',
    is_active: 'is_active',
    created_at: 'created_at',
  },
  filterFields: {
    scope: { type: 'enum' },
    pod_id: { type: 'string' },
    is_active: { type: 'boolean' },
    discount_pct: { type: 'number' },
    valid_from: { type: 'date' },
    valid_until: { type: 'date' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

function buildDoc(input: any) {
  return {
    code: String(input.code).toUpperCase().trim(),
    description: input.description ?? '',
    discount_pct: input.discount_pct,
    scope: input.scope,
    pod_id: input.scope === 'POD' && input.pod_id ? new Types.ObjectId(input.pod_id) : null,
    valid_from: toDate(input.valid_from),
    valid_until: toDate(input.valid_until),
    max_uses: input.max_uses ?? null,
    per_user_limit: input.per_user_limit ?? null,
    min_order_amount: input.min_order_amount ?? 0,
    is_active: input.is_active !== false,
  };
}

export interface CouponEvaluation {
  ok: boolean;
  message: string | null;
  coupon: ICoupon | null;
  discount_pct: number;
  original_total: number;
  discount_amount: number;
  final_total: number;
}

/**
 * Evaluate a coupon against an order. `amount` is the gross payable (pod amount +
 * selected products) which equals the user-facing total. Returns the discount
 * breakdown, or ok:false with a reason. Pure read — no mutation.
 */
async function evaluate(
  code: string,
  podId: string | null,
  amount: number,
  userId?: string | null
): Promise<CouponEvaluation> {
  const original = round2(Math.max(0, Number(amount) || 0));
  const fail = (message: string): CouponEvaluation => ({
    ok: false,
    message,
    coupon: null,
    discount_pct: 0,
    original_total: original,
    discount_amount: 0,
    final_total: original,
  });

  const coupon = await CouponModel.findOne({ code: String(code).toUpperCase().trim() });
  if (!coupon?.is_active) return fail('Invalid or inactive coupon code');
  if (coupon.scope === 'POD' && String(coupon.pod_id) !== String(podId))
    return fail('This coupon is not valid for this pod');

  const now = Date.now();
  if (coupon.valid_from && now < coupon.valid_from.getTime()) return fail('Coupon is not active yet');
  if (coupon.valid_until && now > coupon.valid_until.getTime()) return fail('Coupon has expired');
  if (coupon.min_order_amount && original < coupon.min_order_amount)
    return fail(`Minimum order of ₹${coupon.min_order_amount} required`);
  if (coupon.max_uses != null && coupon.used_count >= coupon.max_uses)
    return fail('Coupon usage limit reached');
  if (coupon.per_user_limit != null && userId) {
    const used = await PaymentModel.countDocuments({
      user_id: new Types.ObjectId(userId),
      coupon_code: coupon.code,
      status: 'SUCCESS',
    });
    if (used >= coupon.per_user_limit) return fail('You have already used this coupon');
  }

  const discount_amount = round2((original * coupon.discount_pct) / 100);
  const final_total = round2(Math.max(0, original - discount_amount));
  return {
    ok: true,
    message: null,
    coupon,
    discount_pct: coupon.discount_pct,
    original_total: original,
    discount_amount,
    final_total,
  };
}

export const couponService = {
  toPub,
  evaluate,

  async list(filter?: { scope?: string; pod_id?: string; is_active?: boolean; search?: string }) {
    const q: any = {};
    if (filter?.scope) q.scope = filter.scope;
    if (filter?.pod_id) q.pod_id = new Types.ObjectId(filter.pod_id);
    if (filter?.is_active != null) q.is_active = filter.is_active;
    if (filter?.search) {
      const r = new RegExp(filter.search.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`), 'i');
      q.$or = [{ code: r }, { description: r }];
    }
    const docs = await CouponModel.find(q).sort({ created_at: -1 });
    return docs.map(toPub);
  },

  /** Server-side table page (search/filter/sort/paginate) for the couponsTable query. */
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<ICoupon>(
      CouponModel,
      {},
      input,
      COUPON_TABLE_CONFIG
    );
    return { rows: docs.map(toPub), total, page, page_size };
  },

  /** Table sibling of couponsForPod — same $or scope (this pod + GLOBAL) as a
   * baseFilter, so client filters can never widen it to other pods' coupons. */
  async tableForPod(podId: string, input?: TableQueryInput | null) {
    const base = { $or: [{ pod_id: new Types.ObjectId(podId) }, { scope: 'GLOBAL' }] };
    const { docs, total, page, page_size } = await runTableQuery<ICoupon>(
      CouponModel,
      base,
      input,
      COUPON_TABLE_CONFIG
    );
    return { rows: docs.map(toPub), total, page, page_size };
  },

  async getById(id: string) {
    const d = await CouponModel.findById(id);
    return d ? toPub(d) : null;
  },

  async listForPod(podId: string) {
    const docs = await CouponModel.find({
      $or: [{ pod_id: new Types.ObjectId(podId) }, { scope: 'GLOBAL' }],
    }).sort({ created_at: -1 });
    return docs.map(toPub);
  },

  // Active + currently-valid coupons a shopper can apply: every GLOBAL coupon
  // plus the ones scoped to this pod. Public (checkout "available coupons").
  async listAvailableForPod(podId?: string | null) {
    const now = new Date();
    const scopes: any[] = [{ scope: 'GLOBAL' }];
    if (podId && Types.ObjectId.isValid(podId)) {
      scopes.push({ scope: 'POD', pod_id: new Types.ObjectId(podId) });
    }
    const docs = await CouponModel.find({
      is_active: true,
      $or: scopes,
      $and: [
        { $or: [{ valid_from: null }, { valid_from: { $lte: now } }] },
        { $or: [{ valid_until: null }, { valid_until: { $gte: now } }] },
      ],
    }).sort({ discount_pct: -1 });
    return docs.map(toPub);
  },

  async create(input: any) {
    const existing = await CouponModel.findOne({ code: String(input.code).toUpperCase().trim() });
    if (existing)
      throw new GraphQLError('A coupon with this code already exists', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    const doc = await CouponModel.create(buildDoc(input));
    return toPub(doc);
  },

  async update(id: string, input: any) {
    const doc = await CouponModel.findById(id);
    if (!doc) throw new GraphQLError('Coupon not found', { extensions: { code: 'NOT_FOUND' } });
    const merged = buildDoc({ ...toPub(doc), ...input, scope: input.scope ?? doc.scope });
    if (input.code && merged.code !== doc.code) {
      const clash = await CouponModel.findOne({ code: merged.code, _id: { $ne: doc._id } });
      if (clash)
        throw new GraphQLError('A coupon with this code already exists', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
    }
    Object.assign(doc, merged);
    await doc.save();
    return toPub(doc);
  },

  async remove(id: string) {
    const res = await CouponModel.deleteOne({ _id: id });
    return res.deletedCount > 0;
  },

  /** Evaluate for the public preview, attaching the currency symbol. */
  async preview(input: { code: string; pod_id?: string | null; amount: number }, userId?: string) {
    const fs = await getFinanceSettings();
    const result = await evaluate(input.code, input.pod_id ?? null, input.amount, userId);
    return {
      ok: result.ok,
      message: result.message,
      code: result.ok ? result.coupon?.code ?? null : null,
      discount_pct: result.ok ? result.discount_pct : null,
      original_total: result.original_total,
      discount_amount: result.discount_amount,
      final_total: result.final_total,
      currency_symbol: fs.currency_symbol,
    };
  },

  /** Increment the redemption counter after a successful paid checkout. */
  async recordRedemption(code: string) {
    await CouponModel.updateOne({ code: String(code).toUpperCase().trim() }, { $inc: { used_count: 1 } });
  },
};
