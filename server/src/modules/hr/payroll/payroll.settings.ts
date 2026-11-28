import mongoose, { Schema } from 'mongoose';
import { z } from 'zod';
import { logs } from '@observability/log';
import { parseInput } from '@modules/targets/employeeTarget/employeeTarget.rules';
import { actorSchema, type IHrActor } from '@modules/hr/employee/employee.model';
import { actorOf } from '@modules/hr/employee/employee.events';

/**
 * When salaries are paid (HR > Payroll > Settings). SAME_MONTH pays a month on
 * its own `pay_day`; NEXT_MONTH pays it on that day of the month after. A pay
 * day past the month's end means its last day, so 31 is "the last day".
 */
export const PAY_TIMINGS = ['SAME_MONTH', 'NEXT_MONTH'] as const;
export type PayTiming = (typeof PAY_TIMINGS)[number];

export interface IHrPayrollSettings {
  singleton_key: string;
  /** When on, the scheduler drafts each month's run `draft_lead_days` before its pay day. */
  scheduler_enabled: boolean;
  pay_timing: PayTiming;
  pay_day: number;
  draft_lead_days: number;
  /** How RazorpayX sends a bank payout. */
  payout_mode: 'IMPS' | 'NEFT';
  updated_by: IHrActor | null;
  created_at: Date;
  updated_at: Date;
}

const schema = new Schema<IHrPayrollSettings>(
  {
    singleton_key: { type: String, required: true, unique: true },
    scheduler_enabled: { type: Boolean, default: false },
    pay_timing: { type: String, enum: PAY_TIMINGS, default: 'SAME_MONTH' },
    pay_day: { type: Number, default: 31, min: 1, max: 31 },
    draft_lead_days: { type: Number, default: 5, min: 1, max: 20 },
    payout_mode: { type: String, enum: ['IMPS', 'NEFT'], default: 'IMPS' },
    updated_by: { type: actorSchema, default: null },
  },
  { collection: 'hr_payroll_settings', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const HrPayrollSettingsModel =
  (mongoose.models.HrPayrollSettings as mongoose.Model<IHrPayrollSettings>) ||
  mongoose.model<IHrPayrollSettings>('HrPayrollSettings', schema);

export const PAYROLL_SETTING_BOUNDS = { payDay: { min: 1, max: 31 }, leadDays: { min: 1, max: 20 } } as const;

export const payrollSettingsSchema = z.object({
  scheduler_enabled: z.boolean(),
  pay_timing: z.enum(PAY_TIMINGS),
  pay_day: z
    .number()
    .int()
    .min(PAYROLL_SETTING_BOUNDS.payDay.min, 'Choose a day from 1 to 31')
    .max(PAYROLL_SETTING_BOUNDS.payDay.max, 'Choose a day from 1 to 31'),
  draft_lead_days: z
    .number()
    .int()
    .min(PAYROLL_SETTING_BOUNDS.leadDays.min, 'Draft at least 1 day before pay day')
    .max(PAYROLL_SETTING_BOUNDS.leadDays.max, 'Draft at most 20 days before pay day'),
  payout_mode: z.enum(['IMPS', 'NEFT']),
});

const SINGLETON = { singleton_key: 'payroll' };

export const payrollSettingsService = {
  async get(): Promise<IHrPayrollSettings> {
    const doc = await HrPayrollSettingsModel.findOneAndUpdate(
      SINGLETON,
      { $setOnInsert: SINGLETON },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean<IHrPayrollSettings>();
    if (!doc) throw new Error('Payroll settings could not be created');
    return doc;
  },

  async update(raw: unknown, userId: string): Promise<IHrPayrollSettings> {
    const input = parseInput(payrollSettingsSchema, raw);
    await this.get();
    const doc = await HrPayrollSettingsModel.findOneAndUpdate(
      SINGLETON,
      { $set: { ...input, updated_by: await actorOf({ id: userId }) } },
      { new: true }
    ).lean<IHrPayrollSettings>();
    if (!doc) throw new Error('Payroll settings could not be saved');
    logs.server.info('payroll.settings', 'updated', { userId, scheduler: input.scheduler_enabled, timing: input.pay_timing });
    return doc;
  },
};
