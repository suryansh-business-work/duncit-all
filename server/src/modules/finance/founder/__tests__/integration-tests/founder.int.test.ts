import { Types } from 'mongoose';

import { founderService, type MetricSnapshot } from '../../founder.service';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { ExpenseModel } from '@modules/finance/expense/expense.model';
import { FOUNDER_CATEGORIES } from '../../founder.metrics';

const findMetric = (
  cats: { metrics: MetricSnapshot[] }[],
  key: string
): MetricSnapshot | undefined => cats.flatMap((c) => c.metrics).find((m) => m.key === key);

describe('founderService.dashboard', () => {
  beforeEach(async () => {
    await PaymentModel.create({
      payment_id: 'PAY-1',
      user_id: new Types.ObjectId(),
      user_name: 'Test',
      user_email: 'test@example.com',
      target_type: 'POD',
      subtotal: 800,
      platform_fee_amount: 200,
      gst_amount: 0,
      total: 1000,
      status: 'SUCCESS',
      gateway: 'razorpay',
    });
    await PaymentModel.create({
      payment_id: 'PAY-2',
      user_id: new Types.ObjectId(),
      user_name: 'T2',
      user_email: 't2@example.com',
      target_type: 'POD',
      subtotal: 100,
      total: 120,
      status: 'FAILED',
      gateway: 'razorpay',
    });
    await ExpenseModel.create({ expense_id: 'EXP-1', date: new Date(), category: 'SALARY', amount: 300 });
  });

  it('computes revenue, profit and expenses from the database', async () => {
    const d = await founderService.dashboard();
    expect(findMetric(d.categories, 'total_revenue')?.value).toBe(1000);
    expect(findMetric(d.categories, 'total_revenue')?.source).toBe('computed');
    expect(findMetric(d.categories, 'gross_profit')?.value).toBe(200);
    expect(findMetric(d.categories, 'total_expenses')?.value).toBe(300);
    expect(findMetric(d.categories, 'net_profit')?.value).toBe(200 - 300);
    expect(findMetric(d.categories, 'successful_payments')?.value).toBe(1);
    expect(findMetric(d.categories, 'failed_payments')?.value).toBe(1);
    expect(findMetric(d.categories, 'aov')?.value).toBe(1000);
  });

  it('serves manual metrics + formula constants from settings', async () => {
    await founderService.saveSetting('app_rating', 4.5);
    await founderService.saveSetting('cash_in_bank', 60000);
    await founderService.saveSetting('fixed_expenses_monthly', 100);
    const d = await founderService.dashboard();

    const rating = findMetric(d.categories, 'app_rating');
    expect(rating?.value).toBe(4.5);
    expect(rating?.source).toBe('manual');

    // variable = total expenses (300) - fixed (100)
    expect(findMetric(d.categories, 'variable_expenses')?.value).toBe(200);
    // runway = cash_in_bank / burn (burn = 300 / months). Just assert positive.
    expect((findMetric(d.categories, 'runway_months')?.value ?? 0)).toBeGreaterThan(0);
  });

  it('returns all categories + 12 top cards, and persists settings', async () => {
    const saved = await founderService.saveSetting('north_star_metric', 42);
    expect(saved).toEqual({ key: 'north_star_metric', value: 42 });

    const d = await founderService.dashboard();
    expect(d.categories).toHaveLength(FOUNDER_CATEGORIES.length);
    expect(d.top).toHaveLength(12);
    expect(d.top.some((t) => t.key === 'cash_in_bank')).toBe(true);
    expect(d.settings.find((s) => s.key === 'north_star_metric')?.value).toBe(42);
  });
});
