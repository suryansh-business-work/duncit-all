import { logs } from '@observability/log';
import { parseInput } from '@modules/targets/employeeTarget/employeeTarget.rules';
import { formatEmployeeCode } from '@modules/hr/employee/employee.rules';
import { HrSettingsModel, type IHrSettings } from './hrSettings.model';
import { hrSettingsSchema } from './hrSettings.rules';

const SINGLETON = { singleton_key: 'hr' };

/** What the console reads — everything but the internal counter. */
export const toPublicSettings = (doc: IHrSettings) => ({
  employee_code_prefix: doc.employee_code_prefix,
  employee_code_digits: doc.employee_code_digits,
  next_employee_code: formatEmployeeCode(doc.employee_code_prefix, doc.employee_code_seq + 1, doc.employee_code_digits),
  default_currency: doc.default_currency,
  default_notice_period_days: doc.default_notice_period_days,
  default_probation_months: doc.default_probation_months,
  departments: doc.departments,
  work_locations: doc.work_locations,
  salary_template: doc.salary_template,
  updated_at: doc.updated_at?.toISOString?.() ?? null,
});

export const hrSettingsService = {
  /** The singleton, created with defaults the first time anything asks for it. */
  async get(): Promise<IHrSettings> {
    const doc = await HrSettingsModel.findOneAndUpdate(
      SINGLETON,
      { $setOnInsert: SINGLETON },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean<IHrSettings>();
    if (!doc) throw new Error('HR settings could not be created');
    return doc;
  },

  async pub() {
    return toPublicSettings(await this.get());
  },

  async update(raw: unknown, actorId: string) {
    const input = parseInput(hrSettingsSchema, raw);
    await this.get();
    const set = Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
    const doc = await HrSettingsModel.findOneAndUpdate(
      SINGLETON,
      { $set: { ...set, updated_by: actorId } },
      { new: true }
    ).lean<IHrSettings>();
    if (!doc) throw new Error('HR settings could not be saved');
    logs.server.info('hrSettings.service', 'updated', { userId: actorId, fields: Object.keys(set) });
    return toPublicSettings(doc);
  },

  /**
   * The next automatic employee code. The counter moves by an atomic $inc, so
   * two hires at once never get the same number; the caller still checks the
   * code is free, because HR may have typed that code by hand earlier.
   */
  async nextEmployeeCode(): Promise<string> {
    await this.get();
    const doc = await HrSettingsModel.findOneAndUpdate(SINGLETON, { $inc: { employee_code_seq: 1 } }, { new: true }).lean<IHrSettings>();
    if (!doc) throw new Error('HR settings could not be read');
    return formatEmployeeCode(doc.employee_code_prefix, doc.employee_code_seq, doc.employee_code_digits);
  },
};
