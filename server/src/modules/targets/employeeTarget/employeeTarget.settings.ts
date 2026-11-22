import mongoose, { Schema, type Document } from 'mongoose';
import { REMINDER_BOUNDS, clampSetting, type ReminderWindow } from './employeeTarget.rules';

/**
 * Targets > Settings — when employees are reminded to report on their month.
 *
 * Its own singleton, like the other consoles' policies (coin, reel slider):
 * AppSettings is written by Tech only, and this is the Targets desk's call.
 */
export interface IEmployeeTargetSettings extends Document {
  singleton_key: string;
  reminders_enabled: boolean;
  reminder_days_before_end: number;
  reminder_grace_days: number;
  updated_by: string;
  updated_at: Date;
}

const B = REMINDER_BOUNDS;

const settingsSchema = new Schema<IEmployeeTargetSettings>(
  {
    singleton_key: { type: String, required: true, unique: true },
    reminders_enabled: { type: Boolean, default: true },
    reminder_days_before_end: { type: Number, default: B.daysBeforeEnd.fallback },
    reminder_grace_days: { type: Number, default: B.graceDays.fallback },
    updated_by: { type: String, default: '' },
  },
  { collection: 'employee_target_settings', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const EmployeeTargetSettingsModel =
  (mongoose.models.EmployeeTargetSettings as mongoose.Model<IEmployeeTargetSettings>) ||
  mongoose.model<IEmployeeTargetSettings>('EmployeeTargetSettings', settingsSchema);

const SINGLETON = { singleton_key: 'employee-targets' };

export interface EmployeeTargetSettingsInput {
  reminders_enabled?: boolean | null;
  reminder_days_before_end?: number | null;
  reminder_grace_days?: number | null;
}

const toPublic = (doc: IEmployeeTargetSettings) => ({
  reminders_enabled: doc.reminders_enabled,
  reminder_days_before_end: doc.reminder_days_before_end,
  reminder_grace_days: doc.reminder_grace_days,
  updated_at: doc.updated_at?.toISOString?.() ?? null,
});

export const employeeTargetSettingsService = {
  /** The singleton, created with defaults the first time it is asked for. */
  async get(): Promise<IEmployeeTargetSettings> {
    const existing = await EmployeeTargetSettingsModel.findOne(SINGLETON);
    if (existing) return existing;
    const doc = await EmployeeTargetSettingsModel.findOneAndUpdate(
      SINGLETON,
      { $setOnInsert: SINGLETON },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (!doc) throw new Error('Employee target settings could not be created');
    return doc;
  },

  async pub() {
    return toPublic(await this.get());
  },

  /** The window the reminder sweep and each row's `reminder_active` read. */
  async window(): Promise<ReminderWindow> {
    const doc = await this.get();
    return {
      enabled: doc.reminders_enabled !== false,
      daysBeforeEnd: clampSetting('daysBeforeEnd', doc.reminder_days_before_end, B.daysBeforeEnd.fallback),
      graceDays: clampSetting('graceDays', doc.reminder_grace_days, B.graceDays.fallback),
    };
  },

  async update(input: EmployeeTargetSettingsInput, actorId: string) {
    const doc = await this.get();
    if (typeof input.reminders_enabled === 'boolean') doc.reminders_enabled = input.reminders_enabled;
    doc.reminder_days_before_end = clampSetting('daysBeforeEnd', input.reminder_days_before_end, doc.reminder_days_before_end);
    doc.reminder_grace_days = clampSetting('graceDays', input.reminder_grace_days, doc.reminder_grace_days);
    doc.updated_by = actorId;
    await doc.save();
    return toPublic(doc);
  },
};
