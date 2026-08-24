/**
 * Pod Expenses — what Duncit spends to run a pod, and the bills behind it.
 *
 * Two reads, one behind the other, mirroring the Withdrawal Payments pair:
 *  - {@link podExpenseService.podsTable} — one row per POD, with its spend
 *    rolled up. This is the list Finance lands on; a pod with nothing spent on
 *    it yet is still a row, because that is the row you click to record the
 *    first bill.
 *  - {@link podExpenseService.podExpensesTable} — that pod's individual
 *    entries, the rows the drawer edits.
 *
 * The pods list is an aggregation rather than a find(): rolling the spend up in
 * mongo is what lets Finance sort by "most spent" and narrow to "pods with a
 * bill still missing" without pulling every pod into memory.
 */
import crypto from 'node:crypto';
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { PodModel } from '@modules/pods/pod/pod.model';
import { EXPENSE_PAYMENT_METHODS } from '@modules/finance/expense/expense.model';
import { bucketForPod } from '@modules/finance/finance/breakdown.service';
import {
  PodExpenseModel,
  POD_EXPENSE_CATEGORIES,
  type IPodExpense,
  type PodExpenseCategory,
} from './podExpense.model';
import { podExpenseSpend } from './podExpense.totals';
import {
  buildTableFilter,
  clampPage,
  resolveSort,
  runTableQuery,
  type TableEntityConfig,
  type TableQueryInput,
} from '@utils/table-query';

const expenseId = () => `pex_${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`;
const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const clean = (value: unknown, max = 1000) => String(value ?? '').trim().slice(0, max);

const CATEGORY_SET = new Set<string>(POD_EXPENSE_CATEGORIES);
const METHOD_SET = new Set<string>(EXPENSE_PAYMENT_METHODS);

/**
 * Pod-level allowlists: the search, the filters that can run BEFORE the
 * roll-up, and every sort the list offers. The rolled-up fields are sortable
 * here but not filterable — they only exist after `$addFields`, so their
 * filters live in {@link ROLLUP_TABLE_CONFIG} and are matched separately.
 */
const POD_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['pod_title', 'pod_id'],
  sortFields: {
    pod_title: 'pod_title',
    pod_date_time: 'pod_date_time',
    expense_total: 'expense_total',
    expense_count: 'expense_count',
    bill_count: 'bill_count',
    last_expense_at: 'last_expense_at',
  },
  filterFields: {
    pod_date_time: { type: 'date' },
    pod_mode: { type: 'enum' },
  },
  defaultSort: { pod_date_time: -1 },
};

/** Filters on the rolled-up numbers, applied after the roll-up stage. */
const ROLLUP_TABLE_CONFIG: TableEntityConfig = {
  searchFields: [],
  sortFields: {},
  filterFields: {
    expense_total: { type: 'number' },
    has_expenses: { type: 'boolean' },
    missing_bills: { type: 'boolean' },
  },
  defaultSort: {},
};

/** The drawer's own list — one pod's entries, newest spend first. */
const POD_EXPENSE_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['vendor_name', 'description', 'reference', 'bill_number'],
  sortFields: {
    date: 'date',
    category: 'category',
    vendor_name: 'vendor_name',
    amount: 'amount',
    created_at: 'created_at',
  },
  filterFields: {
    category: { type: 'enum' },
    payment_method: { type: 'enum' },
    date: { type: 'date' },
    amount: { type: 'number' },
  },
  defaultSort: { date: -1, created_at: -1 },
};

function toPub(doc: IPodExpense) {
  return {
    id: String(doc._id),
    expense_id: doc.expense_id,
    pod_id: String(doc.pod_id),
    date: doc.date.toISOString(),
    category: doc.category,
    amount: doc.amount,
    description: doc.description ?? '',
    vendor_name: doc.vendor_name ?? '',
    payment_method: doc.payment_method,
    reference: doc.reference ?? '',
    bill_number: doc.bill_number ?? '',
    bill_url: doc.bill_url ?? '',
    created_by: doc.created_by ? String(doc.created_by) : null,
    created_at: doc.created_at?.toISOString?.() ?? '',
    updated_at: doc.updated_at?.toISOString?.() ?? '',
  };
}

/** Rolls one pod's expenses onto the pod document, as `$lookup` + `$group`. */
const ROLLUP_STAGES = [
  {
    $lookup: {
      from: PodExpenseModel.collection.name,
      let: { pid: '$_id' },
      pipeline: [
        { $match: { $expr: { $eq: ['$pod_id', '$$pid'] } } },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 },
            // A bill that was never uploaded is stored as '', so counting the
            // non-empty ones is what makes "3 of 5 bills" answerable.
            bills: { $sum: { $cond: [{ $eq: ['$bill_url', ''] }, 0, 1] } },
            last_at: { $max: '$date' },
          },
        },
      ],
      as: 'rollup',
    },
  },
  { $addFields: { rollup: { $arrayElemAt: ['$rollup', 0] } } },
  {
    $addFields: {
      expense_total: { $ifNull: ['$rollup.total', 0] },
      expense_count: { $ifNull: ['$rollup.count', 0] },
      bill_count: { $ifNull: ['$rollup.bills', 0] },
      last_expense_at: { $ifNull: ['$rollup.last_at', null] },
    },
  },
  {
    $addFields: {
      has_expenses: { $gt: ['$expense_count', 0] },
      missing_bills: { $gt: [{ $subtract: ['$expense_count', '$bill_count'] }, 0] },
    },
  },
];

/**
 * Cancelled pods are IN this list on purpose.
 *
 * Every other pod read hides a soft-deleted pod, but money already spent on a
 * pod that was later called off is exactly the spend this screen exists to
 * catch — hiding it would quietly drop it out of Duncit's cost of running pods.
 * The status chip names it, so nobody mistakes it for a live pod.
 */
const INCLUDE_CANCELLED = { includeDeleted: true };

function toPodRow(doc: any) {
  return {
    pod_doc_id: String(doc._id),
    pod_code: doc.pod_id ?? '',
    pod_title: doc.pod_title ?? '',
    pod_date_time: doc.pod_date_time?.toISOString?.() ?? '',
    pod_mode: doc.pod_mode ?? 'PHYSICAL',
    pod_status: bucketForPod(doc, Date.now()).toUpperCase(),
    ticket_price: round2(doc.pod_amount ?? 0),
    no_of_spots: doc.no_of_spots ?? 0,
    expense_total: round2(doc.expense_total),
    expense_count: doc.expense_count ?? 0,
    bill_count: doc.bill_count ?? 0,
    last_expense_at: doc.last_expense_at?.toISOString?.() ?? null,
  };
}

export const podExpenseService = {
  /** One row per pod, with its Duncit spend rolled up. */
  async podsTable(input?: TableQueryInput | null) {
    const podMatch = buildTableFilter(input, POD_TABLE_CONFIG);
    const rollupMatch = buildTableFilter(input, ROLLUP_TABLE_CONFIG);
    const { page, pageSize } = clampPage(input ?? {});
    const sort = resolveSort(input ?? {}, POD_TABLE_CONFIG);

    const pipeline: any[] = [
      ...(Object.keys(podMatch).length > 0 ? [{ $match: podMatch }] : []),
      ...ROLLUP_STAGES,
      ...(Object.keys(rollupMatch).length > 0 ? [{ $match: rollupMatch }] : []),
      { $sort: sort },
      {
        $facet: {
          rows: [{ $skip: (page - 1) * pageSize }, { $limit: pageSize }],
          count: [{ $count: 'total' }],
        },
      },
    ];
    const [result] = await PodModel.aggregate(pipeline, INCLUDE_CANCELLED);
    return {
      rows: (result?.rows ?? []).map(toPodRow),
      total: result?.count?.[0]?.total ?? 0,
      page,
      page_size: pageSize,
    };
  },

  /** The pods list row for ONE pod — the drawer's header, kept in step with
   * the table it was opened from rather than recomputed on the client. */
  async podSummary(podDocId: string) {
    if (!Types.ObjectId.isValid(podDocId)) return null;
    const rows = await PodModel.aggregate(
      [{ $match: { _id: new Types.ObjectId(podDocId) } }, ...ROLLUP_STAGES],
      INCLUDE_CANCELLED
    );
    return rows.length > 0 ? toPodRow(rows[0]) : null;
  },

  /** One pod's expense entries — the drawer's table. */
  async podExpensesTable(podDocId: string, input?: TableQueryInput | null) {
    if (!Types.ObjectId.isValid(podDocId)) {
      throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });
    }
    const { docs, total, page, page_size } = await runTableQuery<IPodExpense>(
      PodExpenseModel,
      { pod_id: new Types.ObjectId(podDocId) },
      input,
      POD_EXPENSE_TABLE_CONFIG
    );
    return { rows: docs.map(toPub), total, page, page_size };
  },

  /** The page's KPI cards, plus the per-category split beneath them. */
  async summary() {
    const [totals, byCategory, thisMonth] = await Promise.all([
      PodExpenseModel.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 },
            bills: { $sum: { $cond: [{ $eq: ['$bill_url', ''] }, 0, 1] } },
            pods: { $addToSet: '$pod_id' },
          },
        },
      ]),
      PodExpenseModel.aggregate([
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
        { $sort: { total: -1 } },
      ]),
      podExpenseSpend(monthStart()),
    ]);
    const count = totals[0]?.count ?? 0;
    const bills = totals[0]?.bills ?? 0;
    return {
      total_spent: round2(totals[0]?.total ?? 0),
      this_month_spent: thisMonth,
      expense_count: count,
      pods_covered: (totals[0]?.pods ?? []).length,
      bill_count: bills,
      missing_bill_count: Math.max(0, count - bills),
      by_category: byCategory.map((row) => ({ category: row._id, total: round2(row.total) })),
    };
  },

  async create(podDocId: string, input: any, actorId?: string | null) {
    if (!Types.ObjectId.isValid(podDocId)) {
      throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });
    }
    // includeDeleted for the same reason the list shows cancelled pods: a bill
    // for a pod that was called off still has to be recordable.
    const pod = await PodModel.findById(podDocId).select('_id').setOptions(INCLUDE_CANCELLED);
    if (!pod) throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });
    const doc = await PodExpenseModel.create({
      expense_id: expenseId(),
      pod_id: pod._id,
      ...normalizeFields(input),
      created_by: actorId ? new Types.ObjectId(actorId) : null,
    });
    return toPub(doc);
  },

  async update(id: string, input: any) {
    const doc = await PodExpenseModel.findById(id);
    if (!doc) throw new GraphQLError('Pod expense not found', { extensions: { code: 'NOT_FOUND' } });
    Object.assign(doc, normalizeFields(input));
    await doc.save();
    return toPub(doc);
  },

  async remove(id: string) {
    const deleted = await PodExpenseModel.findByIdAndDelete(id);
    if (!deleted) {
      throw new GraphQLError('Pod expense not found', { extensions: { code: 'NOT_FOUND' } });
    }
    return true;
  },
};

const monthStart = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

function normalizeFields(input: any) {
  const amount = round2(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new GraphQLError('Expense amount must be greater than 0', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  const date = new Date(input.date);
  if (Number.isNaN(date.getTime())) {
    throw new GraphQLError('Enter a valid expense date', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  return {
    date,
    amount,
    category: (CATEGORY_SET.has(input.category) ? input.category : 'OTHER') as PodExpenseCategory,
    payment_method: METHOD_SET.has(input.payment_method) ? input.payment_method : 'BANK_TRANSFER',
    description: clean(input.description),
    vendor_name: clean(input.vendor_name, 200),
    reference: clean(input.reference, 200),
    bill_number: clean(input.bill_number, 120),
    bill_url: clean(input.bill_url, 2048),
  };
}
