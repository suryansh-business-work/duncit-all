import crypto from 'node:crypto';
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import {
  ExpenseModel,
  deriveCompensationStatus,
  type IExpense,
  type IExpenseRefund,
} from './expense.model';
import { expenseOptionService } from '@modules/finance/expenseOption/expenseOption.service';
import { findEntity } from '@modules/finance/expenseOption/expenseOption.sources';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';

const expenseId = () => `exp_${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`;
const refundId = () => `ref_${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`;
const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const clean = (value: string | number | null | undefined, max = 1000) => String(value ?? '').trim().slice(0, max);
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

const refundTotal = (doc: IExpense) => round2((doc.refunds ?? []).reduce((s, r) => s + Number(r.amount || 0), 0));

export interface ExpenseFilter {
  from?: string | null;
  to?: string | null;
  category?: string | null;
  payment_method?: string | null;
  related_from_type?: string | null;
  related_from_id?: string | null;
  compensation_status?: string | null;
  compensation_method?: string | null;
  paid_by?: string | null;
  search?: string | null;
  min_amount?: number | null;
  max_amount?: number | null;
}

function refundPub(r: IExpenseRefund) {
  return {
    refund_id: r.refund_id,
    date: r.date.toISOString(),
    amount: r.amount,
    note: r.note ?? '',
    created_at: r.created_at?.toISOString?.() ?? '',
  };
}

function toPub(doc: IExpense) {
  const refunds = (doc.refunds ?? []).map(refundPub);
  const refunded = refundTotal(doc);
  return {
    id: String(doc._id),
    expense_id: doc.expense_id,
    date: doc.date.toISOString(),
    category: doc.category,
    amount: doc.amount,
    refund_total: refunded,
    net_amount: round2(doc.amount - refunded),
    description: doc.description ?? '',
    vendor_name: doc.vendor_name ?? '',
    payment_method: doc.payment_method,
    reference: doc.reference ?? '',
    attachment_url: doc.attachment_url ?? '',
    related_from_type: doc.related_from_type ?? '',
    related_from_id: doc.related_from_id ? String(doc.related_from_id) : null,
    related_from_name: doc.related_from_name ?? '',
    paid_by: doc.paid_by ?? '',
    compensation_status: doc.compensation_status ?? 'PENDING',
    compensation_method: doc.compensation_method ?? '',
    compensated_amount: round2(doc.compensated_amount ?? 0),
    pending_compensation: round2(Math.max(0, doc.amount - (doc.compensated_amount ?? 0))),
    compensation_date: doc.compensation_date?.toISOString?.() ?? null,
    compensation_reference: doc.compensation_reference ?? '',
    refunds,
    created_by: doc.created_by ? String(doc.created_by) : null,
    updated_by: doc.updated_by ? String(doc.updated_by) : null,
    created_at: doc.created_at?.toISOString?.() ?? '',
    updated_at: doc.updated_at?.toISOString?.() ?? '',
  };
}

/** Allowlists for the shared table engine (expensesTable — DUNCIT TABLE CONTRACT v1). */
const EXPENSE_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['vendor_name', 'description', 'reference', 'related_from_name', 'paid_by'],
  sortFields: {
    date: 'date',
    category: 'category',
    vendor_name: 'vendor_name',
    payment_method: 'payment_method',
    amount: 'amount',
    related_from_type: 'related_from_type',
    related_from_name: 'related_from_name',
    compensation_status: 'compensation_status',
    compensated_amount: 'compensated_amount',
    paid_by: 'paid_by',
    created_at: 'created_at',
  },
  filterFields: {
    category: { type: 'enum' },
    payment_method: { type: 'enum' },
    related_from_type: { type: 'enum' },
    related_from_id: { type: 'string' },
    compensation_status: { type: 'enum' },
    compensation_method: { type: 'enum' },
    paid_by: { type: 'string' },
    date: { type: 'date' },
    amount: { type: 'number' },
    created_at: { type: 'date' },
  },
  defaultSort: { date: -1, created_at: -1 },
};

function buildFilter(filter?: ExpenseFilter) {
  const query: any = {};
  const range: any = {};
  if (filter?.from) range.$gte = new Date(filter.from);
  if (filter?.to) range.$lte = new Date(filter.to);
  if (Object.keys(range).length) query.date = range;
  // The valid set is whatever Finance has configured, so a filter is passed
  // through as typed rather than checked against a compiled list — an unknown
  // key simply matches nothing, which is the honest answer to asking for it.
  if (filter?.category) query.category = filter.category;
  if (filter?.payment_method) query.payment_method = filter.payment_method;
  if (filter?.related_from_type) query.related_from_type = filter.related_from_type;
  if (filter?.related_from_id && Types.ObjectId.isValid(filter.related_from_id)) {
    query.related_from_id = new Types.ObjectId(filter.related_from_id);
  }
  if (filter?.compensation_status) query.compensation_status = filter.compensation_status;
  if (filter?.compensation_method) query.compensation_method = filter.compensation_method;
  if (filter?.paid_by) query.paid_by = new RegExp(escapeRegex(filter.paid_by), 'i');
  const amount: any = {};
  if (filter?.min_amount != null) amount.$gte = Number(filter.min_amount);
  if (filter?.max_amount != null) amount.$lte = Number(filter.max_amount);
  if (Object.keys(amount).length) query.amount = amount;
  if (filter?.search) {
    const rx = new RegExp(escapeRegex(filter.search), 'i');
    query.$or = [
      { vendor_name: rx },
      { description: rx },
      { reference: rx },
      { related_from_name: rx },
      { paid_by: rx },
    ];
  }
  return query;
}

export { buildFilter as buildExpenseFilter };

export const expenseService = {
  async list(filter?: ExpenseFilter) {
    const docs = await ExpenseModel.find(buildFilter(filter)).sort({ date: -1, created_at: -1 }).limit(500);
    return docs.map(toPub);
  },

  /** Server-side table page (search/filter/sort/paginate) for the expensesTable query. */
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IExpense>(
      ExpenseModel,
      {},
      input,
      EXPENSE_TABLE_CONFIG
    );
    return { rows: docs.map(toPub), total, page, page_size };
  },

  async summary(filter?: ExpenseFilter) {
    const rows = await ExpenseModel.aggregate([
      { $match: buildFilter(filter) },
      { $addFields: { refunded: { $sum: '$refunds.amount' } } },
      { $group: { _id: '$category', gross: { $sum: '$amount' }, refunds: { $sum: '$refunded' }, count: { $sum: 1 } } },
      { $sort: { gross: -1 } },
    ]);
    const by_category = rows.map((r) => ({ category: r._id, total: round2(r.gross - r.refunds) }));
    const gross_total = round2(rows.reduce((s, r) => s + Number(r.gross || 0), 0));
    const refund_total = round2(rows.reduce((s, r) => s + Number(r.refunds || 0), 0));
    const count = rows.reduce((s, r) => s + Number(r.count || 0), 0);
    return { total: round2(gross_total - refund_total), gross_total, refund_total, count, by_category };
  },

  async create(input: any, actorId?: string | null) {
    const fields = await normalizeFields(input);
    const actor = actorId ? new Types.ObjectId(actorId) : null;
    const doc = await ExpenseModel.create({
      expense_id: expenseId(),
      ...fields,
      created_by: actor,
      updated_by: actor,
    });
    return toPub(doc);
  },

  async update(id: string, input: any, actorId?: string | null) {
    const doc = await ExpenseModel.findById(id);
    if (!doc) throw new GraphQLError('Expense not found', { extensions: { code: 'NOT_FOUND' } });
    const fields = await normalizeFields(input);
    if (fields.amount < refundTotal(doc)) {
      throw new GraphQLError('Amount cannot be less than refunds already recorded', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    Object.assign(doc, fields);
    if (actorId) doc.updated_by = new Types.ObjectId(actorId);
    await doc.save();
    return toPub(doc);
  },

  async addRefund(id: string, input: any) {
    const doc = await ExpenseModel.findById(id);
    if (!doc) throw new GraphQLError('Expense not found', { extensions: { code: 'NOT_FOUND' } });
    const amount = round2(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new GraphQLError('Refund amount must be greater than 0', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    if (amount > round2(doc.amount - refundTotal(doc))) {
      throw new GraphQLError('Refund cannot exceed the remaining expense amount', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const date = new Date(input.date);
    if (Number.isNaN(date.getTime())) {
      throw new GraphQLError('Enter a valid refund date', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    doc.refunds.push({ refund_id: refundId(), date, amount, note: clean(input.note, 300), created_at: new Date() });
    await doc.save();
    return toPub(doc);
  },

  async removeRefund(id: string, refund_id: string) {
    const doc = await ExpenseModel.findById(id);
    if (!doc) throw new GraphQLError('Expense not found', { extensions: { code: 'NOT_FOUND' } });
    doc.refunds = doc.refunds.filter((r) => r.refund_id !== refund_id);
    await doc.save();
    return toPub(doc);
  },

  async remove(id: string) {
    const deleted = await ExpenseModel.findByIdAndDelete(id);
    if (!deleted) throw new GraphQLError('Expense not found', { extensions: { code: 'NOT_FOUND' } });
    return true;
  },
};

/**
 * A submitted option key, stored AS SENT.
 *
 * It is deliberately not checked against the configured list. The list is what
 * the form OFFERS, and it changes: an expense filed last quarter under a
 * category Finance has since retired is edited to fix a typo, and rewriting its
 * category to a default because that row is no longer offered would silently
 * re-classify history. A key with no option behind it renders as itself, which
 * is legible, rather than as somebody else's category, which is wrong.
 *
 * The one key that IS resolved is `related_from_type`, because it has to name
 * an entity source before an entity can be looked up — see normalizeRelation.
 */
function optionKey(raw: unknown, fallback = ''): string {
  return clean(raw as string, 60).toUpperCase() || fallback;
}

/**
 * The entity an expense is attributed to, resolved through its type's source.
 *
 * The NAME is read from the source and stored beside the id rather than taken
 * from the client: the client would happily send "Sunday Run" for a venue id,
 * and the ledger is the one place that must not be able to say so.
 */
async function normalizeRelation(input: any) {
  const type = optionKey(input.related_from_type);
  const rawId = clean(input.related_from_id, 40);
  if (!type || !rawId || !Types.ObjectId.isValid(rawId)) {
    return { related_from_type: type, related_from_id: null, related_from_name: '' };
  }
  const source = await expenseOptionService.entitySource(type);
  const entity = source ? await findEntity(source, rawId) : null;
  if (!entity) {
    throw new GraphQLError('That entity could not be found for the selected type', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  return {
    related_from_type: type,
    related_from_id: new Types.ObjectId(rawId),
    related_from_name: entity.name || entity.reference,
  };
}

/** The compensation block, with its status derived rather than accepted. */
function normalizeCompensation(input: any, amount: number) {
  const compensated = Math.min(amount, Math.max(0, round2(input.compensated_amount ?? 0)));
  const rejected = input.compensation_rejected === true;
  const method = optionKey(input.compensation_method);
  const rawDate = clean(input.compensation_date, 40);
  const date = rawDate ? new Date(rawDate) : null;
  return {
    compensation_status: deriveCompensationStatus(amount, compensated, rejected),
    compensation_method: method,
    compensated_amount: compensated,
    compensation_date: date && !Number.isNaN(date.getTime()) ? date : null,
    compensation_reference: clean(input.compensation_reference, 200),
  };
}

async function normalizeFields(input: any) {
  const amount = round2(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new GraphQLError('Expense amount must be greater than 0', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const date = new Date(input.date);
  if (Number.isNaN(date.getTime())) {
    throw new GraphQLError('Enter a valid expense date', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const relation = await normalizeRelation(input);
  return {
    date,
    amount,
    category: optionKey(input.category, 'MISCELLANEOUS'),
    payment_method: optionKey(input.payment_method, 'BANK_TRANSFER'),
    ...relation,
    ...normalizeCompensation(input, amount),
    paid_by: clean(input.paid_by, 200),
    description: clean(input.description),
    vendor_name: clean(input.vendor_name, 200),
    reference: clean(input.reference, 200),
    attachment_url: clean(input.attachment_url, 2048),
  };
}
