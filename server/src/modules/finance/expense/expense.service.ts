import crypto from 'node:crypto';
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import {
  ExpenseModel,
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_METHODS,
  type IExpense,
  type IExpenseRefund,
  type ExpenseCategory,
  type ExpensePaymentMethod,
} from './expense.model';

const expenseId = () => `exp_${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`;
const refundId = () => `ref_${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`;
const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const clean = (value: string | number | null | undefined, max = 1000) => String(value ?? '').trim().slice(0, max);
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

const CATEGORY_SET = new Set<string>(EXPENSE_CATEGORIES);
const METHOD_SET = new Set<string>(EXPENSE_PAYMENT_METHODS);

const refundTotal = (doc: IExpense) => round2((doc.refunds ?? []).reduce((s, r) => s + Number(r.amount || 0), 0));

interface ExpenseFilter {
  from?: string | null;
  to?: string | null;
  category?: string | null;
  payment_method?: string | null;
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
    refunds,
    created_by: doc.created_by ? String(doc.created_by) : null,
    created_at: doc.created_at?.toISOString?.() ?? '',
    updated_at: doc.updated_at?.toISOString?.() ?? '',
  };
}

function buildFilter(filter?: ExpenseFilter) {
  const query: any = {};
  const range: any = {};
  if (filter?.from) range.$gte = new Date(filter.from);
  if (filter?.to) range.$lte = new Date(filter.to);
  if (Object.keys(range).length) query.date = range;
  if (filter?.category && CATEGORY_SET.has(filter.category)) query.category = filter.category;
  if (filter?.payment_method && METHOD_SET.has(filter.payment_method)) query.payment_method = filter.payment_method;
  const amount: any = {};
  if (filter?.min_amount != null) amount.$gte = Number(filter.min_amount);
  if (filter?.max_amount != null) amount.$lte = Number(filter.max_amount);
  if (Object.keys(amount).length) query.amount = amount;
  if (filter?.search) {
    const rx = new RegExp(escapeRegex(filter.search), 'i');
    query.$or = [{ vendor_name: rx }, { description: rx }, { reference: rx }];
  }
  return query;
}

export const expenseService = {
  async list(filter?: ExpenseFilter) {
    const docs = await ExpenseModel.find(buildFilter(filter)).sort({ date: -1, created_at: -1 }).limit(500);
    return docs.map(toPub);
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
    const fields = normalizeFields(input);
    const doc = await ExpenseModel.create({
      expense_id: expenseId(),
      ...fields,
      created_by: actorId ? new Types.ObjectId(actorId) : null,
    });
    return toPub(doc);
  },

  async update(id: string, input: any) {
    const doc = await ExpenseModel.findById(id);
    if (!doc) throw new GraphQLError('Expense not found', { extensions: { code: 'NOT_FOUND' } });
    const fields = normalizeFields(input);
    if (fields.amount < refundTotal(doc)) {
      throw new GraphQLError('Amount cannot be less than refunds already recorded', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    Object.assign(doc, fields);
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

function normalizeFields(input: any) {
  const amount = round2(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new GraphQLError('Expense amount must be greater than 0', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const date = new Date(input.date);
  if (Number.isNaN(date.getTime())) {
    throw new GraphQLError('Enter a valid expense date', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  return {
    date,
    amount,
    category: (CATEGORY_SET.has(input.category) ? input.category : 'OTHER') as ExpenseCategory,
    payment_method: (METHOD_SET.has(input.payment_method) ? input.payment_method : 'BANK_TRANSFER') as ExpensePaymentMethod,
    description: clean(input.description),
    vendor_name: clean(input.vendor_name, 200),
    reference: clean(input.reference, 200),
    attachment_url: clean(input.attachment_url, 2048),
  };
}
