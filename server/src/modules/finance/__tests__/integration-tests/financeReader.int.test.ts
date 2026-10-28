import { Types } from 'mongoose';
import type { GraphQLContext } from '@context';
import { assertPortalLogin } from '@modules/portals';
import { financeResolvers } from '../../finance/finance.resolver';
import { paymentResolvers } from '../../payment/payment.resolver';
import { walletResolvers } from '../../wallet/wallet.resolver';
import { coinResolvers } from '../../coin/coin.resolver';
import { giftCardResolvers } from '../../giftcard/giftcard.resolver';
import { expenseResolvers } from '../../expense/expense.resolver';
import { expenseOptionResolvers } from '../../expenseOption/expenseOption.resolver';
import { employeeExpenseResolvers } from '../../employeeExpense/employeeExpense.resolver';
import { founderResolvers } from '../../founder/founder.resolver';
import { podCalculatorResolvers } from '../../podCalculator/podCalculator.resolver';
import { podExpenseResolvers } from '../../podExpense/podExpense.resolver';
import { couponResolvers } from '../../coupon/coupon.resolver';
import { referralAdminResolvers } from '@modules/engagement/referral/referral.admin.resolver';
import { getFinanceSettings } from '../../finance/finance.model';

/**
 * FINANCE_USER — "Finance console access (analyst level)".
 *
 * It used to sit in no finance guard and not in the Finance console's roles, so
 * the seat granted nothing. It is now the console's read-only seat: it signs in,
 * every query the console reads admits it, and every write still refuses it.
 */

type Field = (parent: unknown, args: Record<string, unknown>, ctx: GraphQLContext) => unknown;

const ctxFor = (roles: string[]) =>
  ({ user: { id: new Types.ObjectId().toHexString(), roles } }) as unknown as GraphQLContext;
const analyst = () => ctxFor(['FINANCE_USER']);

const pick = (map: Record<string, unknown>, names: string[]): [string, Field][] =>
  names.map((name) => [name, map[name] as Field]);

/** Every read the Finance console makes that a role gates. */
const consoleReads: [string, Field][] = [
  ...pick(financeResolvers.Query, [
    'financeSettings', 'foodTaxDefaults', 'paymentReleaseRequests', 'paymentReleaseRequestsTable',
    'podPaymentReleasesTable', 'financeDashboardStats', 'podCancellations', 'podCancellationStats',
  ]),
  ...pick(paymentResolvers.Query, [
    'payments', 'paymentTotals', 'paymentRoundOffsTable', 'paymentsTable', 'userRefundsTable',
  ]),
  ...pick(walletResolvers.Query, ['withdrawalRequests', 'withdrawalRequestsTable', 'podWithdrawalGroupsTable', 'withdrawalMinimums']),
  ...pick(coinResolvers.Query, ['coinAdminStats', 'coinSettings', 'coinTransactionsTable']),
  ...pick(giftCardResolvers.Query, ['giftCardAdminStats', 'giftCardsTable', 'giftCardTransactionsTable']),
  ...pick(expenseResolvers.Query, ['expenses', 'expensesTable', 'expenseSummary', 'expenseDashboard']),
  ...pick(expenseOptionResolvers.Query, ['expenseOptions', 'expenseOptionsTable', 'expenseEntitySources']),
  ...pick(employeeExpenseResolvers.Query, ['employeeExpensesTable', 'employeeExpenseSummary']),
  ...pick(founderResolvers.Query, ['founderDashboard']),
  ...pick(podCalculatorResolvers.Query, ['podCalculators']),
  ...pick(podExpenseResolvers.Query, ['podExpensePodsTable', 'podExpenseSummary']),
  ...pick(referralAdminResolvers.Query, ['referrals', 'referralsTable']),
];

/** Every write behind those screens — none of them is the analyst's. */
const consoleWrites: [string, Field][] = [
  ...pick(financeResolvers.Mutation, [
    'updateFinanceSettings', 'updateFoodTaxDefaults', 'createPaymentReleaseRequest', 'reviewPaymentReleaseRequest',
    'approvePodPaymentRelease', 'setHostDeductions',
  ]),
  ...pick(paymentResolvers.Mutation, ['refundPayment', 'retryPaymentSteps']),
  ...pick(walletResolvers.Mutation, ['reviewWithdrawal', 'updateWithdrawalMinimums']),
  ...pick(coinResolvers.Mutation, ['updateCoinSettings', 'adjustUserCoins']),
  ...pick(giftCardResolvers.Mutation, ['updateGiftCardSettings']),
  ...pick(expenseResolvers.Mutation, ['createExpense', 'updateExpense', 'deleteExpense', 'addExpenseRefund', 'removeExpenseRefund']),
  ...pick(expenseOptionResolvers.Mutation, ['createExpenseOption', 'updateExpenseOption', 'deleteExpenseOption']),
  ...pick(employeeExpenseResolvers.Mutation, ['reviewEmployeeExpense']),
  ...pick(founderResolvers.Mutation, ['saveFounderSetting']),
  ...pick(podCalculatorResolvers.Mutation, ['createPodCalculator', 'updatePodCalculator', 'deletePodCalculator', 'emailPodCalculator']),
  ...pick(podExpenseResolvers.Mutation, ['createPodExpense', 'updatePodExpense', 'deletePodExpense']),
  ...pick(couponResolvers.Mutation, ['createCoupon', 'updateCoupon', 'deleteCoupon']),
  ...pick(referralAdminResolvers.Mutation, ['updateReferralSettings']),
];

/** The code a call fails with, or null when it answered. */
async function outcome(field: Field, ctx: GraphQLContext, args: Record<string, unknown> = {}): Promise<string | null> {
  try {
    await field(undefined, args, ctx);
    return null;
  } catch (err) {
    const code = (err as { extensions?: { code?: string } }).extensions?.code;
    return code ?? 'ERROR';
  }
}

describe('FINANCE_USER — the read-only Finance seat', () => {
  it('signs in to the Finance console, and only that one of the money consoles', () => {
    expect(() => assertPortalLogin('finance', ['FINANCE_USER'])).not.toThrow();
    expect(() => assertPortalLogin('ecomm-portal', ['FINANCE_USER'])).toThrow('You do not have access to this portal');
  });

  it('every listed field exists (a renamed resolver would otherwise pass silently)', () => {
    for (const [name, field] of [...consoleReads, ...consoleWrites]) {
      expect({ name, type: typeof field }).toEqual({ name, type: 'function' });
    }
  });

  it.each(consoleReads)('reads %s, which a plain user is refused', async (name, field) => {
    // The two option lists are read one kind at a time, as the console does.
    const args = name.startsWith('expenseOptions') ? { kind: 'CATEGORY' } : {};
    expect(await outcome(field, ctxFor(['USER']), args)).toBe('FORBIDDEN');
    expect(await outcome(field, analyst(), args)).toBeNull();
  });

  it('reads the real figures, not an empty stand-in', async () => {
    const stored = await getFinanceSettings();
    const read = (await financeResolvers.Query.financeSettings(undefined, {}, analyst())) as { platform_fee_pct: number };
    expect(read.platform_fee_pct).toBe(stored.platform_fee_pct);
  });

  it.each(consoleWrites)('is refused %s', async (_name, field) => {
    expect(await outcome(field, analyst())).toBe('FORBIDDEN');
  });

  it('changes nothing when it tries to write', async () => {
    const before = (await getFinanceSettings()).platform_fee_pct;
    await expect(
      financeResolvers.Mutation.updateFinanceSettings(undefined, { input: { platform_fee_pct: before + 1 } }, analyst())
    ).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    expect((await getFinanceSettings()).platform_fee_pct).toBe(before);
  });
});
