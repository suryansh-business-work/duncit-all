import mongoose, { Schema, type Types } from 'mongoose';
import { logs } from '@observability/log';
import { isDuplicateKeyError } from '@utils/mongo-error';
import { parseInput } from '@modules/targets/employeeTarget/employeeTarget.rules';
import { actorSchema, type IHrActor } from '@modules/hr/employee/employee.model';
import { actorOf, todayKey } from '@modules/hr/employee/employee.events';
import { fail, objectId } from '@modules/hr/employee/employee.store';
import { holidaySchema, leaveSettingsSchema, leaveYearOf, type WorkingDayRules } from './leave.rules';

// --- Settings ----------------------------------------------------------------

export interface IHrLeaveSettings {
  singleton_key: string;
  /** 0 = Sunday … 6 = Saturday. */
  weekly_off_days: number[];
  /** 1 = a January–December leave year, 4 = April–March. */
  leave_year_start_month: number;
  /** How many days back an employee may ask for leave they already took (sick leave). */
  backdate_days: number;
  /**
   * The first leave year this console tracks. Balances never carry forward
   * from a year before it — those years' leave was never recorded here, so HR
   * sets opening balances with an adjustment instead.
   */
  tracking_start_year: number;
  updated_by: IHrActor | null;
  created_at: Date;
  updated_at: Date;
}

const DEFAULT_START_MONTH = 1;

const settingsSchema = new Schema<IHrLeaveSettings>(
  {
    singleton_key: { type: String, required: true, unique: true },
    weekly_off_days: { type: [Number], default: () => [0, 6] },
    leave_year_start_month: { type: Number, default: DEFAULT_START_MONTH, min: 1, max: 12 },
    backdate_days: { type: Number, default: 7, min: 0 },
    tracking_start_year: { type: Number, required: true },
    updated_by: { type: actorSchema, default: null },
  },
  { collection: 'hr_leave_settings', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const HrLeaveSettingsModel =
  (mongoose.models.HrLeaveSettings as mongoose.Model<IHrLeaveSettings>) ||
  mongoose.model<IHrLeaveSettings>('HrLeaveSettings', settingsSchema);

const SINGLETON = { singleton_key: 'leave' };

// --- Holidays ----------------------------------------------------------------

export interface IHrHoliday {
  _id: Types.ObjectId;
  date: string;
  name: string;
  updated_by: IHrActor;
  created_at: Date;
  updated_at: Date;
}

const holidayModelSchema = new Schema<IHrHoliday>(
  {
    date: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    updated_by: { type: actorSchema, required: true },
  },
  { collection: 'hr_holidays', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);
// One holiday per date: two names on one day would count the day off once anyway.
holidayModelSchema.index({ date: 1 }, { unique: true });

export const HrHolidayModel =
  (mongoose.models.HrHoliday as mongoose.Model<IHrHoliday>) || mongoose.model<IHrHoliday>('HrHoliday', holidayModelSchema);

export const toHoliday = (doc: IHrHoliday) => ({ id: String(doc._id), date: doc.date, name: doc.name });

/**
 * HR > Leave settings and the holiday list: the two things that decide which
 * dates are working days, and so what a leave request costs and what a payroll
 * month deducts.
 */
export const leaveSettingsService = {
  async get(): Promise<IHrLeaveSettings> {
    const doc = await HrLeaveSettingsModel.findOneAndUpdate(
      SINGLETON,
      { $setOnInsert: { ...SINGLETON, tracking_start_year: leaveYearOf(todayKey(), DEFAULT_START_MONTH) } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean<IHrLeaveSettings>();
    if (!doc) throw new Error('Leave settings could not be created');
    return doc;
  },

  async pub() {
    const doc = await this.get();
    return {
      weekly_off_days: doc.weekly_off_days,
      leave_year_start_month: doc.leave_year_start_month,
      backdate_days: doc.backdate_days,
      tracking_start_year: doc.tracking_start_year,
      current_leave_year: leaveYearOf(todayKey(), doc.leave_year_start_month),
      updated_at: doc.updated_at?.toISOString?.() ?? null,
    };
  },

  async update(raw: unknown, userId: string) {
    const input = parseInput(leaveSettingsSchema, raw);
    await this.get();
    await HrLeaveSettingsModel.updateOne(SINGLETON, { $set: { ...input, updated_by: await actorOf({ id: userId }) } });
    logs.server.info('leave.settings', 'updated', { userId, fields: Object.keys(input) });
    return this.pub();
  },

  /** Weekly offs and the holidays between two dates — what makes a date a working day. */
  async workingDayRules(from: string, to: string): Promise<WorkingDayRules> {
    const [settings, holidays] = await Promise.all([
      this.get(),
      HrHolidayModel.find({ date: { $gte: from, $lte: to } }).select('date').lean<Pick<IHrHoliday, 'date'>[]>(),
    ]);
    return { weeklyOffs: new Set(settings.weekly_off_days), holidays: new Set(holidays.map((h) => h.date)) };
  },

  async holidays(from: string, to: string) {
    const docs = await HrHolidayModel.find({ date: { $gte: from, $lte: to } }).sort({ date: 1 }).lean<IHrHoliday[]>();
    return docs.map(toHoliday);
  },

  /**
   * Add or rename a holiday. A holiday changes what existing leave requests
   * cost only for requests made after it; requests already made keep the days
   * they were approved for, so a balance never moves under someone's feet.
   */
  async saveHoliday(id: string | null, raw: unknown, userId: string) {
    const input = parseInput(holidaySchema, raw);
    const updated_by = await actorOf({ id: userId });
    try {
      const doc = id
        ? await HrHolidayModel.findByIdAndUpdate(objectId(id, 'holiday'), { $set: { ...input, updated_by } }, { new: true }).lean<IHrHoliday>()
        : (await HrHolidayModel.create({ ...input, updated_by })).toObject<IHrHoliday>();
      if (!doc) return fail('NOT_FOUND', 'Holiday not found');
      logs.server.info('leave.settings', 'holiday-saved', { userId, date: input.date });
      return toHoliday(doc);
    } catch (error) {
      if (isDuplicateKeyError(error)) return fail('CONFLICT', `There is already a holiday on ${input.date}`);
      throw error;
    }
  },

  async removeHoliday(id: string, userId: string): Promise<boolean> {
    const doc = await HrHolidayModel.findByIdAndDelete(objectId(id, 'holiday')).lean<IHrHoliday>();
    if (!doc) return fail('NOT_FOUND', 'Holiday not found');
    logs.server.info('leave.settings', 'holiday-removed', { userId, date: doc.date });
    return true;
  },
};
