import { logs } from '@observability/log';
import { isDuplicateKeyError } from '@utils/mongo-error';
import { parseInput } from '@modules/targets/employeeTarget/employeeTarget.rules';
import { actorOf } from '@modules/hr/employee/employee.events';
import { fail, objectId } from '@modules/hr/employee/employee.store';
import { HrLeaveTypeModel, type IHrLeaveType } from './leave.model';
import { leaveTypeSchema } from './leave.rules';

export const toLeaveType = (doc: IHrLeaveType) => ({
  id: String(doc._id),
  name: doc.name,
  code: doc.code,
  paid: doc.paid,
  annual_quota: doc.annual_quota,
  accrual: doc.accrual,
  carry_forward_max: doc.carry_forward_max,
  allow_half_day: doc.allow_half_day,
  active: doc.active,
  updated_at: doc.updated_at?.toISOString?.() ?? null,
});

/**
 * The leave types HR offers. A type is never deleted — requests and balances
 * point at it — so retiring one means switching it off: it leaves the apply
 * form, and its history stays readable.
 */
export const leaveTypeService = {
  async list(includeInactive: boolean): Promise<IHrLeaveType[]> {
    return HrLeaveTypeModel.find(includeInactive ? {} : { active: true })
      .sort({ active: -1, paid: -1, name: 1 })
      .lean<IHrLeaveType[]>();
  },

  async byId(id: string): Promise<IHrLeaveType> {
    const doc = await HrLeaveTypeModel.findById(objectId(id, 'leave type')).lean<IHrLeaveType>();
    return doc ?? fail('BAD_USER_INPUT', 'That leave type does not exist');
  },

  async save(id: string | null, raw: unknown, userId: string) {
    const input = parseInput(leaveTypeSchema, raw);
    const updated_by = await actorOf({ id: userId });
    try {
      const doc = id
        ? await HrLeaveTypeModel.findByIdAndUpdate(objectId(id, 'leave type'), { $set: { ...input, updated_by } }, { new: true }).lean<IHrLeaveType>()
        : (await HrLeaveTypeModel.create({ ...input, updated_by })).toObject<IHrLeaveType>();
      if (!doc) return fail('NOT_FOUND', 'Leave type not found');
      logs.server.info('leave.types', 'saved', { userId, code: input.code, created: !id });
      return toLeaveType(doc);
    } catch (error) {
      if (isDuplicateKeyError(error)) return fail('CONFLICT', `The code ${input.code} is already used by another leave type`);
      throw error;
    }
  },
};
