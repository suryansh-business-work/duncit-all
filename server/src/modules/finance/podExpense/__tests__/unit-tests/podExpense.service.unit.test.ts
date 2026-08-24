/**
 * Pod Expenses service, with mongo faked.
 *
 * Three things here decide whether the number Finance reads is the truth:
 *
 *  - the pods list rolls the spend up BEFORE it cuts the page, so "most spent
 *    first" and "only pods still missing a bill" are answers about the whole
 *    matched set rather than about page one;
 *  - a cancelled pod stays in the list, because money already spent on a pod
 *    that was called off is still Duncit's cost;
 *  - and nothing a client sends is trusted: the category, the payment method,
 *    the amount and the date are all re-derived on the way in.
 */
jest.mock('@modules/pods/pod/pod.model', () => ({
  PodModel: { aggregate: jest.fn(), findById: jest.fn() },
}));

jest.mock('@modules/finance/expense/expense.model', () => ({
  EXPENSE_PAYMENT_METHODS: ['UPI', 'BANK_TRANSFER', 'CASH', 'CARD', 'CHEQUE', 'OTHER'],
}));

jest.mock('@modules/finance/finance/breakdown.service', () => ({
  bucketForPod: jest.fn(() => 'completed'),
}));

jest.mock('../../podExpense.totals', () => ({
  podExpenseSpend: jest.fn(),
}));

jest.mock('../../podExpense.model', () => ({
  POD_EXPENSE_CATEGORIES: [
    'VENUE_RENT',
    'EQUIPMENT',
    'REFRESHMENTS',
    'TRANSPORT',
    'STAFF',
    'PHOTOGRAPHY',
    'MARKETING',
    'PRIZES',
    'MATERIALS',
    'PERMITS',
    'OTHER',
  ],
  PodExpenseModel: {
    collection: { name: 'podexpenses' },
    aggregate: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));

jest.mock('@utils/table-query', () => {
  const actual = jest.requireActual('@utils/table-query');
  return { ...actual, runTableQuery: jest.fn() };
});

import { Types } from 'mongoose';
import { GraphQLError } from 'graphql';
import { PodModel } from '@modules/pods/pod/pod.model';
import { bucketForPod } from '@modules/finance/finance/breakdown.service';
import { runTableQuery } from '@utils/table-query';
import { PodExpenseModel } from '../../podExpense.model';
import { podExpenseSpend } from '../../podExpense.totals';
import { podExpenseService } from '../../podExpense.service';

const pods = PodModel as unknown as Record<string, jest.Mock>;
const expenses = PodExpenseModel as unknown as Record<string, jest.Mock>;
const bucket = bucketForPod as unknown as jest.Mock;
const tableQuery = runTableQuery as unknown as jest.Mock;
const spend = podExpenseSpend as unknown as jest.Mock;

const POD_DOC_ID = '65b000000000000000000001';
const EXPENSE_DOC_ID = '65b000000000000000000002';
const ACTOR_ID = '65b000000000000000000003';

/** The pipeline PodModel.aggregate was last built with. */
const lastPipeline = (): Record<string, any>[] =>
  pods.aggregate.mock.calls[pods.aggregate.mock.calls.length - 1]?.[0];

const matchStages = () => lastPipeline().filter((stage) => '$match' in stage);

const podDoc = (over: Record<string, unknown> = {}) => ({
  _id: new Types.ObjectId(POD_DOC_ID),
  pod_id: 'DUN-POD-4821',
  pod_title: 'Sunday Badminton',
  pod_date_time: new Date('2026-08-20T10:00:00.000Z'),
  expense_total: 2500.555,
  expense_count: 3,
  bill_count: 2,
  last_expense_at: new Date('2026-08-21T09:00:00.000Z'),
  ...over,
});

const expenseDoc = (over: Record<string, unknown> = {}) => ({
  _id: new Types.ObjectId(EXPENSE_DOC_ID),
  expense_id: 'pex_abc123',
  pod_id: new Types.ObjectId(POD_DOC_ID),
  date: new Date('2026-08-20T00:00:00.000Z'),
  category: 'VENUE_RENT',
  amount: 2500,
  description: 'Court booking',
  vendor_name: 'Smash Arena',
  payment_method: 'UPI',
  reference: 'txn-99',
  bill_number: 'INV-14',
  bill_url: 'https://img.duncit.com/bill.pdf',
  created_by: new Types.ObjectId(ACTOR_ID),
  created_at: new Date('2026-08-20T05:00:00.000Z'),
  updated_at: new Date('2026-08-20T06:00:00.000Z'),
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  bucket.mockReturnValue('completed');
  spend.mockResolvedValue(250);
});

describe('podsTable', () => {
  it('rolls the spend onto every pod and shapes one row each', async () => {
    pods.aggregate.mockResolvedValue([{ rows: [podDoc()], count: [{ total: 7 }] }]);

    const page = await podExpenseService.podsTable({ page: 2, page_size: 10 });

    expect(page).toEqual({
      rows: [
        {
          pod_doc_id: POD_DOC_ID,
          pod_code: 'DUN-POD-4821',
          pod_title: 'Sunday Badminton',
          pod_date_time: '2026-08-20T10:00:00.000Z',
          pod_status: 'COMPLETED',
          expense_total: 2500.56,
          expense_count: 3,
          bill_count: 2,
          last_expense_at: '2026-08-21T09:00:00.000Z',
        },
      ],
      total: 7,
      page: 2,
      page_size: 10,
    });
    // Cancelled pods are IN this list on purpose — the aggregation opts into
    // soft-deleted pods rather than inheriting the global hide.
    expect(pods.aggregate.mock.calls[0]?.[1]).toEqual({ includeDeleted: true });
  });

  it('reads a pod with nothing recorded against it as a zeroed row, not a gap', async () => {
    pods.aggregate.mockResolvedValue([
      { rows: [{ _id: new Types.ObjectId(POD_DOC_ID) }], count: [] },
    ]);
    bucket.mockReturnValue('upcoming');

    const { rows, total } = await podExpenseService.podsTable();

    expect(rows[0]).toEqual({
      pod_doc_id: POD_DOC_ID,
      pod_code: '',
      pod_title: '',
      pod_date_time: '',
      pod_status: 'UPCOMING',
      expense_total: 0,
      expense_count: 0,
      bill_count: 0,
      last_expense_at: null,
    });
    expect(total).toBe(0);
  });

  it('runs with no $match at all when nothing was searched or filtered', async () => {
    pods.aggregate.mockResolvedValue([]);

    const page = await podExpenseService.podsTable(null);

    expect(page).toEqual({ rows: [], total: 0, page: 1, page_size: 25 });
    expect(matchStages()).toHaveLength(0);
  });

  it('matches the pod fields BEFORE the roll-up and the rolled-up ones after it', async () => {
    pods.aggregate.mockResolvedValue([{ rows: [], count: [] }]);

    await podExpenseService.podsTable({
      search: 'badminton',
      filters: [{ field: 'missing_bills', op: 'is_true' }],
      sort_by: 'expense_total',
      sort_dir: 'desc',
    });

    const pipeline = lastPipeline();
    const stages = matchStages();
    expect(stages).toHaveLength(2);
    // The searchable match has to run first — it is the one an index can serve.
    expect(pipeline.indexOf(stages[0]!)).toBe(0);
    expect(stages[0]).toHaveProperty('$match.$or');
    expect(stages[1]).toEqual({ $match: { missing_bills: true } });
    expect(pipeline.indexOf(stages[1]!)).toBeGreaterThan(pipeline.indexOf(stages[0]!));
    // `_id` rides along as the tiebreaker, so a page boundary between two pods
    // that spent the same amount cannot duplicate or drop a row.
    expect(pipeline.find((stage) => '$sort' in stage)).toEqual({
      $sort: { expense_total: -1, _id: -1 },
    });
  });
});

describe('podSummary', () => {
  it('reads back the one row the drawer header renders', async () => {
    pods.aggregate.mockResolvedValue([podDoc()]);

    const row = await podExpenseService.podSummary(POD_DOC_ID);

    expect(row).toMatchObject({ pod_doc_id: POD_DOC_ID, expense_total: 2500.56 });
    expect(lastPipeline()[0]).toEqual({ $match: { _id: new Types.ObjectId(POD_DOC_ID) } });
  });

  it('answers null for a pod id that is not an id, without touching mongo', async () => {
    await expect(podExpenseService.podSummary('not-an-id')).resolves.toBeNull();

    expect(pods.aggregate).not.toHaveBeenCalled();
  });

  it('answers null for a well-formed id that matches no pod', async () => {
    pods.aggregate.mockResolvedValue([]);

    await expect(podExpenseService.podSummary(POD_DOC_ID)).resolves.toBeNull();
  });
});

describe('podExpensesTable', () => {
  it('shapes the entries of one pod for the drawer', async () => {
    tableQuery.mockResolvedValue({ docs: [expenseDoc()], total: 1, page: 1, page_size: 10 });

    const page = await podExpenseService.podExpensesTable(POD_DOC_ID, { page_size: 10 });

    expect(tableQuery.mock.calls[0]?.[1]).toEqual({ pod_id: new Types.ObjectId(POD_DOC_ID) });
    expect(page.rows[0]).toEqual({
      id: EXPENSE_DOC_ID,
      expense_id: 'pex_abc123',
      pod_id: POD_DOC_ID,
      date: '2026-08-20T00:00:00.000Z',
      category: 'VENUE_RENT',
      amount: 2500,
      description: 'Court booking',
      vendor_name: 'Smash Arena',
      payment_method: 'UPI',
      reference: 'txn-99',
      bill_number: 'INV-14',
      bill_url: 'https://img.duncit.com/bill.pdf',
      created_by: ACTOR_ID,
      created_at: '2026-08-20T05:00:00.000Z',
      updated_at: '2026-08-20T06:00:00.000Z',
    });
    expect(page).toMatchObject({ total: 1, page: 1, page_size: 10 });
  });

  it('reads a half-filled legacy row as empty strings rather than nulls', async () => {
    tableQuery.mockResolvedValue({
      docs: [
        expenseDoc({
          description: null,
          vendor_name: null,
          reference: null,
          bill_number: null,
          bill_url: null,
          created_by: null,
          created_at: undefined,
          updated_at: undefined,
        }),
      ],
      total: 1,
      page: 1,
      page_size: 25,
    });

    const { rows } = await podExpenseService.podExpensesTable(POD_DOC_ID);

    expect(rows[0]).toMatchObject({
      description: '',
      vendor_name: '',
      reference: '',
      bill_number: '',
      bill_url: '',
      created_by: null,
      created_at: '',
      updated_at: '',
    });
  });

  it('refuses a pod id that is not an id', async () => {
    await expect(podExpenseService.podExpensesTable('not-an-id')).rejects.toThrow(GraphQLError);

    expect(tableQuery).not.toHaveBeenCalled();
  });
});

describe('summary', () => {
  it('rolls up the KPI tiles and the per-category split', async () => {
    expenses.aggregate
      .mockResolvedValueOnce([
        {
          _id: null,
          total: 5000.005,
          count: 5,
          bills: 3,
          pods: [new Types.ObjectId(POD_DOC_ID), new Types.ObjectId(EXPENSE_DOC_ID)],
        },
      ])
      .mockResolvedValueOnce([
        { _id: 'VENUE_RENT', total: 3000.004 },
        { _id: 'REFRESHMENTS', total: 2000 },
      ]);
    spend.mockResolvedValue(1200.5);

    await expect(podExpenseService.summary()).resolves.toEqual({
      total_spent: 5000.01,
      this_month_spent: 1200.5,
      expense_count: 5,
      pods_covered: 2,
      bill_count: 3,
      missing_bill_count: 2,
      by_category: [
        { category: 'VENUE_RENT', total: 3000 },
        { category: 'REFRESHMENTS', total: 2000 },
      ],
    });
    // This month is dated by when the money LEFT, so it is asked for from the
    // first of the current month.
    const from = spend.mock.calls[0]?.[0] as Date;
    expect(from.getDate()).toBe(1);
    expect(from.getMonth()).toBe(new Date().getMonth());
  });

  it('answers zeroes before a single expense has been recorded', async () => {
    expenses.aggregate.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    spend.mockResolvedValue(0);

    await expect(podExpenseService.summary()).resolves.toEqual({
      total_spent: 0,
      this_month_spent: 0,
      expense_count: 0,
      pods_covered: 0,
      bill_count: 0,
      missing_bill_count: 0,
      by_category: [],
    });
  });

  it('never reports a negative number of missing bills', async () => {
    expenses.aggregate
      .mockResolvedValueOnce([{ _id: null, total: 10, count: 1, bills: 4 }])
      .mockResolvedValueOnce([]);

    const summary = await podExpenseService.summary();

    expect(summary.missing_bill_count).toBe(0);
    // No `pods` on the row at all — the tile reads 0 rather than throwing.
    expect(summary.pods_covered).toBe(0);
  });
});

describe('create', () => {
  const foundPod = (pod: unknown) => ({
    select: () => ({ setOptions: () => Promise.resolve(pod) }),
  });

  it('records a bill against a pod, stamping who typed it', async () => {
    pods.findById.mockReturnValue(foundPod({ _id: new Types.ObjectId(POD_DOC_ID) }));
    expenses.create.mockImplementation((doc: any) => expenseDoc(doc));

    const row = await podExpenseService.create(
      POD_DOC_ID,
      {
        date: '2026-08-20T00:00:00.000Z',
        category: 'VENUE_RENT',
        amount: 2500.004,
        description: '  Court booking  ',
        vendor_name: 'Smash Arena',
        payment_method: 'UPI',
        reference: 'txn-99',
        bill_number: 'INV-14',
        bill_url: 'https://img.duncit.com/bill.pdf',
      },
      ACTOR_ID
    );

    const written = expenses.create.mock.calls[0]?.[0];
    expect(written).toMatchObject({
      pod_id: new Types.ObjectId(POD_DOC_ID),
      category: 'VENUE_RENT',
      payment_method: 'UPI',
      amount: 2500,
      description: 'Court booking',
      created_by: new Types.ObjectId(ACTOR_ID),
    });
    expect(written.expense_id).toMatch(/^pex_/);
    expect(row.pod_id).toBe(POD_DOC_ID);
  });

  it('falls back to OTHER / BANK_TRANSFER for anything off the list, leaving no field null', async () => {
    pods.findById.mockReturnValue(foundPod({ _id: new Types.ObjectId(POD_DOC_ID) }));
    expenses.create.mockImplementation((doc: any) => expenseDoc(doc));

    await podExpenseService.create(POD_DOC_ID, {
      date: '2026-08-20T00:00:00.000Z',
      category: 'BRIBES',
      amount: 10,
      payment_method: 'CRYPTO',
    });

    expect(expenses.create.mock.calls[0]?.[0]).toMatchObject({
      category: 'OTHER',
      payment_method: 'BANK_TRANSFER',
      description: '',
      vendor_name: '',
      reference: '',
      bill_number: '',
      bill_url: '',
      created_by: null,
    });
  });

  it('refuses a pod id that is not an id, and a pod that is not there', async () => {
    await expect(
      podExpenseService.create('not-an-id', { date: '2026-08-20', amount: 10 })
    ).rejects.toThrow('Pod not found');
    expect(pods.findById).not.toHaveBeenCalled();

    pods.findById.mockReturnValue(foundPod(null));
    await expect(
      podExpenseService.create(POD_DOC_ID, { date: '2026-08-20', amount: 10 })
    ).rejects.toThrow('Pod not found');
    expect(expenses.create).not.toHaveBeenCalled();
  });

  it('refuses an amount that is not money, and a date that is not a date', async () => {
    pods.findById.mockReturnValue(foundPod({ _id: new Types.ObjectId(POD_DOC_ID) }));

    await expect(
      podExpenseService.create(POD_DOC_ID, { date: '2026-08-20', amount: Number.POSITIVE_INFINITY })
    ).rejects.toThrow('Expense amount must be greater than 0');
    await expect(
      podExpenseService.create(POD_DOC_ID, { date: '2026-08-20', amount: 0 })
    ).rejects.toThrow('Expense amount must be greater than 0');
    await expect(
      podExpenseService.create(POD_DOC_ID, { date: 'the other day', amount: 10 })
    ).rejects.toThrow('Enter a valid expense date');

    expect(expenses.create).not.toHaveBeenCalled();
  });
});

describe('update / remove', () => {
  it('re-normalizes an edited entry and saves it', async () => {
    const save = jest.fn();
    const doc = Object.assign(expenseDoc(), { save });
    expenses.findById.mockResolvedValue(doc);

    const row = await podExpenseService.update(EXPENSE_DOC_ID, {
      date: '2026-08-22T00:00:00.000Z',
      category: 'REFRESHMENTS',
      amount: 999.996,
      vendor_name: 'Chai Point',
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(row).toMatchObject({
      category: 'REFRESHMENTS',
      amount: 1000,
      vendor_name: 'Chai Point',
      date: '2026-08-22T00:00:00.000Z',
    });
  });

  it('deletes one entry, and says so when there was none to delete', async () => {
    expenses.findByIdAndDelete.mockResolvedValue(expenseDoc());
    await expect(podExpenseService.remove(EXPENSE_DOC_ID)).resolves.toBe(true);

    expenses.findByIdAndDelete.mockResolvedValue(null);
    await expect(podExpenseService.remove(EXPENSE_DOC_ID)).rejects.toThrow('Pod expense not found');
  });

  it('says so when the entry being edited is already gone', async () => {
    expenses.findById.mockResolvedValue(null);

    await expect(
      podExpenseService.update(EXPENSE_DOC_ID, { date: '2026-08-22', amount: 10 })
    ).rejects.toThrow('Pod expense not found');
  });
});
