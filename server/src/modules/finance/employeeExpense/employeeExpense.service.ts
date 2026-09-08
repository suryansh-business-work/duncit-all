/**
 * Employee Expenses — what an employee paid out of pocket, and what Finance
 * decided about it.
 *
 * ONE read shape, two audiences: {@link employeeExpenseService.myTable} is the
 * employee's own claims and {@link employeeExpenseService.financeTable} is
 * every employee's, and both run the SAME pipeline with a different base match.
 * A second row shape would be a second place for "how much is this person
 * owed" to be answered, and the two answers would drift.
 *
 * The employee is joined in mongo rather than denormalized onto the claim: a
 * person's name changes, and a claim filed last quarter must still name them as
 * they are now — that is who Finance pays.
 */
import crypto from 'node:crypto';
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { EXPENSE_PAYMENT_METHODS } from '@modules/finance/expense/expense.model';
import {
  EmployeeExpenseModel,
  EMPLOYEE_EXPENSE_CATEGORIES,
  type EmployeeExpenseCategory,
  type EmployeeExpenseStatus,
} from './employeeExpense.model';
import {
  buildTableFilter,
  clampPage,
  resolveSort,
  type TableEntityConfig,
  type TableQueryInput,
} from '@utils/table-query';

/** `DUN-EXP-4F2A19` — the id shape the rest of the product already uses. */
const claimId = () => `DUN-EXP-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const clean = (value: string | number | null | undefined, max = 1000) =>
  String(value ?? '').trim().slice(0, max);

const CATEGORY_SET = new Set<string>(EMPLOYEE_EXPENSE_CATEGORIES);
const METHOD_SET = new Set<string>(EXPENSE_PAYMENT_METHODS);

/**
 * The allowlists both lists share. `employee_name` / `employee_email` only
 * exist after the join, so every filter here is matched AFTER it — which is
 * also what lets Finance search by the person rather than by the receipt.
 */
const TABLE_CONFIG: TableEntityConfig = {
  searchFields: [
    'claim_id',
    'merchant',
    'description',
    'reference',
    'bill_number',
    'employee_name',
    'employee_email',
  ],
  sortFields: {
    claim_id: 'claim_id',
    date: 'date',
    category: 'category',
    merchant: 'merchant',
    amount: 'amount',
    status: 'status',
    employee_name: 'employee_name',
    reviewed_at: 'reviewed_at',
    created_at: 'created_at',
  },
  filterFields: {
    category: { type: 'enum' },
    payment_method: { type: 'enum' },
    status: { type: 'enum' },
    date: { type: 'date' },
    amount: { type: 'number' },
    has_bill: { type: 'boolean' },
  },
  defaultSort: { created_at: -1 },
};

/** Joins the person onto the claim and derives the fields the lists filter on. */
const JOIN_STAGES = [
  {
    $lookup: {
      from: UserModel.collection.name,
      let: { uid: '$employee_id' },
      pipeline: [
        { $match: { $expr: { $eq: ['$_id', '$$uid'] } } },
        { $project: { 'profile.first_name': 1, 'profile.last_name': 1, 'auth.email': 1 } },
      ],
      as: 'employee',
    },
  },
  { $addFields: { employee: { $arrayElemAt: ['$employee', 0] } } },
  {
    $addFields: {
      employee_name: {
        $trim: {
          input: {
            $concat: [
              { $ifNull: ['$employee.profile.first_name', ''] },
              ' ',
              { $ifNull: ['$employee.profile.last_name', ''] },
            ],
          },
        },
      },
      employee_email: { $ifNull: ['$employee.auth.email', ''] },
      has_bill: { $ne: [{ $ifNull: ['$bill_url', ''] }, ''] },
    },
  },
];

interface JoinedClaim {
  _id: Types.ObjectId;
  claim_id: string;
  employee_id: Types.ObjectId;
  employee_name?: string;
  employee_email?: string;
  date: Date;
  category: string;
  amount: number;
  description?: string;
  merchant?: string;
  payment_method: string;
  reference?: string;
  bill_number?: string;
  bill_url?: string;
  status: string;
  reviewed_by?: Types.ObjectId | null;
  reviewed_at?: Date | null;
  review_note?: string;
  created_at?: Date;
  updated_at?: Date;
}

function toPub(doc: JoinedClaim) {
  return {
    id: String(doc._id),
    claim_id: doc.claim_id ?? '',
    employee_id: String(doc.employee_id),
    employee_name: doc.employee_name ?? '',
    employee_email: doc.employee_email ?? '',
    date: doc.date?.toISOString?.() ?? '',
    category: doc.category,
    amount: round2(doc.amount),
    description: doc.description ?? '',
    merchant: doc.merchant ?? '',
    payment_method: doc.payment_method,
    reference: doc.reference ?? '',
    bill_number: doc.bill_number ?? '',
    bill_url: doc.bill_url ?? '',
    status: doc.status,
    reviewed_by: doc.reviewed_by ? String(doc.reviewed_by) : null,
    reviewed_at: doc.reviewed_at?.toISOString?.() ?? null,
    review_note: doc.review_note ?? '',
    created_at: doc.created_at?.toISOString?.() ?? '',
    updated_at: doc.updated_at?.toISOString?.() ?? '',
  };
}

/** One claim, joined and published — what every mutation answers with. */
async function publishOne(id: Types.ObjectId) {
  const rows: JoinedClaim[] = await EmployeeExpenseModel.aggregate([
    { $match: { _id: id } },
    ...JOIN_STAGES,
  ]);
  return toPub(rows[0]);
}

/** The shared page read: base match -> join -> client filters -> sort -> page. */
async function pageOf(baseMatch: Record<string, unknown>, input?: TableQueryInput | null) {
  const match = buildTableFilter(input, TABLE_CONFIG);
  const { page, pageSize } = clampPage(input ?? {});
  const sort = resolveSort(input ?? {}, TABLE_CONFIG);

  const [result] = await EmployeeExpenseModel.aggregate([
    ...(Object.keys(baseMatch).length > 0 ? [{ $match: baseMatch }] : []),
    ...JOIN_STAGES,
    ...(Object.keys(match).length > 0 ? [{ $match: match }] : []),
    { $sort: sort },
    {
      $facet: {
        rows: [{ $skip: (page - 1) * pageSize }, { $limit: pageSize }],
        count: [{ $count: 'total' }],
      },
    },
  ]);
  return {
    rows: (result?.rows ?? []).map(toPub),
    total: result?.count?.[0]?.total ?? 0,
    page,
    page_size: pageSize,
  };
}

/** Per-status totals + counts, over whatever set the caller is allowed to see. */
async function summaryOf(baseMatch: Record<string, unknown>) {
  const [byStatus, employees] = await Promise.all([
    EmployeeExpenseModel.aggregate([
      ...(Object.keys(baseMatch).length > 0 ? [{ $match: baseMatch }] : []),
      { $group: { _id: '$status', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    EmployeeExpenseModel.distinct('employee_id', baseMatch),
  ]);
  const of = (status: EmployeeExpenseStatus) =>
    byStatus.find((row) => row._id === status) ?? { total: 0, count: 0 };
  const pending = of('PENDING');
  const approved = of('APPROVED');
  const rejected = of('REJECTED');
  return {
    claimed_total: round2(pending.total + approved.total + rejected.total),
    pending_total: round2(pending.total),
    approved_total: round2(approved.total),
    rejected_total: round2(rejected.total),
    pending_count: pending.count,
    approved_count: approved.count,
    rejected_count: rejected.count,
    claim_count: pending.count + approved.count + rejected.count,
    employee_count: employees.length,
  };
}

/**
 * A claim the signed-in employee may still change.
 *
 * Ownership AND status in one read: once Finance has decided, the row is the
 * evidence behind that decision, so editing it would silently change what was
 * approved.
 */
async function ownPendingClaim(id: string, employeeId: string) {
  if (!Types.ObjectId.isValid(id)) {
    throw new GraphQLError('Expense claim not found', { extensions: { code: 'NOT_FOUND' } });
  }
  const doc = await EmployeeExpenseModel.findOne({ _id: id, employee_id: employeeId });
  if (!doc) {
    throw new GraphQLError('Expense claim not found', { extensions: { code: 'NOT_FOUND' } });
  }
  if (doc.status !== 'PENDING') {
    throw new GraphQLError('This claim has already been reviewed and can no longer be changed', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  return doc;
}

export const employeeExpenseService = {
  /** The signed-in employee's own claims. */
  myTable(employeeId: string, input?: TableQueryInput | null) {
    return pageOf({ employee_id: new Types.ObjectId(employeeId) }, input);
  },

  /**
   * One of the signed-in employee's own claims, by id.
   *
   * The owner is part of the MATCH rather than checked after the read, so an
   * employee asking for somebody else's claim id gets the same "not found" as
   * asking for one that never existed.
   */
  async mine(id: string, employeeId: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new GraphQLError('Expense claim not found', { extensions: { code: 'NOT_FOUND' } });
    }
    const rows: JoinedClaim[] = await EmployeeExpenseModel.aggregate([
      { $match: { _id: new Types.ObjectId(id), employee_id: new Types.ObjectId(employeeId) } },
      ...JOIN_STAGES,
    ]);
    if (rows.length === 0) {
      throw new GraphQLError('Expense claim not found', { extensions: { code: 'NOT_FOUND' } });
    }
    return toPub(rows[0]);
  },

  /** Tiles for the signed-in employee's own claims. */
  mySummary(employeeId: string) {
    return summaryOf({ employee_id: new Types.ObjectId(employeeId) });
  },

  /** Finance: every employee's claims. */
  financeTable(input?: TableQueryInput | null) {
    return pageOf({}, input);
  },

  /** Finance: tiles across every employee's claims. */
  financeSummary() {
    return summaryOf({});
  },

  async create(employeeId: string, input: unknown) {
    const doc = await EmployeeExpenseModel.create({
      claim_id: claimId(),
      employee_id: new Types.ObjectId(employeeId),
      ...normalizeFields(input),
      status: 'PENDING',
    });
    return publishOne(doc._id);
  },

  async update(id: string, employeeId: string, input: unknown) {
    const doc = await ownPendingClaim(id, employeeId);
    Object.assign(doc, normalizeFields(input));
    await doc.save();
    return publishOne(doc._id);
  },

  async remove(id: string, employeeId: string) {
    const doc = await ownPendingClaim(id, employeeId);
    await doc.deleteOne();
    return true;
  },

  /**
   * Finance's decision. A claim is decided ONCE — the status guard is in the
   * update filter, so two reviewers pressing Approve and Reject together can
   * never both win.
   */
  async review(id: string, decision: string, note: string, reviewerId: string) {
    if (decision !== 'APPROVED' && decision !== 'REJECTED') {
      throw new GraphQLError('Decision must be APPROVED or REJECTED', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    const reviewNote = clean(note);
    if (decision === 'REJECTED' && !reviewNote) {
      throw new GraphQLError('Give the employee a reason for the rejection', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    if (!Types.ObjectId.isValid(id)) {
      throw new GraphQLError('Expense claim not found', { extensions: { code: 'NOT_FOUND' } });
    }
    const doc = await EmployeeExpenseModel.findOneAndUpdate(
      { _id: id, status: 'PENDING' },
      {
        $set: {
          status: decision,
          review_note: reviewNote,
          reviewed_by: new Types.ObjectId(reviewerId),
          reviewed_at: new Date(),
        },
      },
      { new: true }
    );
    if (!doc) {
      throw new GraphQLError('This claim is not awaiting a decision', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    return publishOne(doc._id);
  },
};

function normalizeFields(raw: unknown) {
  const input = raw as Record<string, unknown>;
  const amount = round2(Number(input.amount));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new GraphQLError('Claim amount must be greater than 0', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  const date = new Date(String(input.date));
  if (Number.isNaN(date.getTime())) {
    throw new GraphQLError('Enter a valid expense date', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  return {
    date,
    amount,
    category: (CATEGORY_SET.has(String(input.category))
      ? String(input.category)
      : 'OTHER') as EmployeeExpenseCategory,
    payment_method: METHOD_SET.has(String(input.payment_method))
      ? String(input.payment_method)
      : 'UPI',
    description: clean(input.description as string),
    merchant: clean(input.merchant as string, 200),
    reference: clean(input.reference as string, 200),
    bill_number: clean(input.bill_number as string, 120),
    bill_url: clean(input.bill_url as string, 2048),
  };
}
