import { Types } from 'mongoose';
import type { GraphQLContext } from '@context';
import { FinanceSettingsModel } from '../../finance.model';
import { financeResolvers } from '../../finance.resolver';

/**
 * FinanceSettings.refund_processing_days is declared non-null, and every
 * cancellation message quotes it. The settings query used to leave it out of
 * the object it returned, so any client selecting it got "Cannot return null
 * for non-nullable field FinanceSettings.refund_processing_days" and lost the
 * whole query.
 */
const financeManager = () =>
  ({ user: { id: new Types.ObjectId().toHexString(), roles: ['FINANCE_MANAGER'] } }) as unknown as GraphQLContext;

const read = async () =>
  (await financeResolvers.Query.financeSettings(undefined, {}, financeManager())) as { refund_processing_days: number };
const update = (input: Record<string, unknown>) =>
  financeResolvers.Mutation.updateFinanceSettings(undefined, { input }, financeManager()) as Promise<{
    refund_processing_days: number;
    platform_fee_pct: number;
  }>;
const stored = async () => (await FinanceSettingsModel.findOne({ singleton_key: 'finance' }).lean())?.refund_processing_days;

describe('FinanceSettings.refund_processing_days', () => {
  it('reads the saved value from a complete settings record', async () => {
    await FinanceSettingsModel.create({ singleton_key: 'finance', refund_processing_days: 14 });
    expect((await read()).refund_processing_days).toBe(14);
  });

  it('reads the shipped 7 days from a record written before the field existed', async () => {
    await FinanceSettingsModel.collection.insertOne({ singleton_key: 'finance', updated_at: new Date() });
    expect((await read()).refund_processing_days).toBe(7);
  });

  it('reads the shipped 7 days, not null, from a record that stored null', async () => {
    await FinanceSettingsModel.collection.insertOne({
      singleton_key: 'finance',
      refund_processing_days: null,
      updated_at: new Date(),
    });
    expect((await read()).refund_processing_days).toBe(7);
  });

  it('saves a new refund window from Finance', async () => {
    await FinanceSettingsModel.create({ singleton_key: 'finance' });
    expect((await update({ refund_processing_days: 10 })).refund_processing_days).toBe(10);
    expect(await stored()).toBe(10);
  });

  it.each([0, 61, 2.5, -3])('refuses %p days and keeps what was saved', async (days) => {
    await FinanceSettingsModel.create({ singleton_key: 'finance', refund_processing_days: 9 });
    await expect(update({ refund_processing_days: days })).rejects.toMatchObject({
      extensions: { code: 'BAD_USER_INPUT' },
    });
    expect(await stored()).toBe(9);
  });

  it('treats an explicit null in the patch as "not changing it" instead of blanking the field', async () => {
    await FinanceSettingsModel.create({ singleton_key: 'finance', refund_processing_days: 9, platform_fee_pct: 5 });
    const saved = await update({ refund_processing_days: null, platform_fee_pct: 6 });
    expect(saved).toMatchObject({ refund_processing_days: 9, platform_fee_pct: 6 });
    expect(await stored()).toBe(9);
  });
});
