/**
 * Pod-spend totals, with the model faked.
 *
 * The window is where the meaning lives. The Finance dashboard asks the SAME
 * function for all-time, this month and last month, so the three calls have to
 * differ only in the `$match` they build — an all-time call that still carried
 * a `to`, or a month boundary written as `$lte` instead of `$lt`, would count
 * the first of the month into both months at once.
 */
jest.mock('../../podExpense.model', () => ({
  PodExpenseModel: { aggregate: jest.fn() },
}));

import { PodExpenseModel } from '../../podExpense.model';
import { podExpenseSpend } from '../../podExpense.totals';

const aggregate = PodExpenseModel.aggregate as unknown as jest.Mock;

/** The pipeline the call was built with. */
const pipeline = (): Record<string, any>[] => aggregate.mock.calls[0]?.[0];

const MONTH_START = new Date('2026-08-01T00:00:00.000Z');
const LAST_MONTH_START = new Date('2026-07-01T00:00:00.000Z');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('podExpenseSpend', () => {
  it('sums every recorded spend when no window is given, rounded to paise', async () => {
    aggregate.mockResolvedValue([{ _id: null, total: 1234.567 }]);

    await expect(podExpenseSpend()).resolves.toBe(1234.57);
    // No window means no $match at all — not a $match on an empty object,
    // which mongo would still have to walk.
    expect(pipeline()).toHaveLength(1);
    expect(pipeline()[0]).toHaveProperty('$group');
  });

  it('matches from a start date onwards when only `from` is given', async () => {
    aggregate.mockResolvedValue([{ _id: null, total: 400 }]);

    await expect(podExpenseSpend(MONTH_START)).resolves.toBe(400);
    expect(pipeline()[0]).toEqual({ $match: { date: { $gte: MONTH_START } } });
  });

  it('closes the window on `to` exclusively, so a month boundary is counted once', async () => {
    aggregate.mockResolvedValue([{ _id: null, total: 99.994 }]);

    await expect(podExpenseSpend(LAST_MONTH_START, MONTH_START)).resolves.toBe(99.99);
    expect(pipeline()[0]).toEqual({
      $match: { date: { $gte: LAST_MONTH_START, $lt: MONTH_START } },
    });
  });

  it('reads a month with nothing spent in it as 0, not as undefined', async () => {
    aggregate.mockResolvedValue([]);

    await expect(podExpenseSpend(MONTH_START)).resolves.toBe(0);
  });

  it('reads a group row with no total as 0', async () => {
    aggregate.mockResolvedValue([{ _id: null, total: null }]);

    await expect(podExpenseSpend()).resolves.toBe(0);
  });
});
