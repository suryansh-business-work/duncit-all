/**
 * Deciding on a leave request. The reporting manager decides; HR decides when
 * there is no manager and may always step in. Nobody decides their own
 * request, whatever roles they hold — the check is on the account, server-side.
 */
import { Types } from 'mongoose';
import type { AuthUser } from '@context';
import { logs } from '@observability/log';
import { parseInput } from '@modules/targets/employeeTarget/employeeTarget.rules';
import { HrEmployeeModel, type IHrEmployee } from '@modules/hr/employee/employee.model';
import { actorOf } from '@modules/hr/employee/employee.events';
import { fail, objectId } from '@modules/hr/employee/employee.store';
import { HR_ROLES } from '@modules/hr/hr.roles';
import { HrLeaveDayClaimModel, HrLeaveRequestModel, type IHrLeaveRequest } from './leave.model';
import { assertBalance, assertMonthsOpen } from './leave.request';
import { leaveTypeService } from './leave.types';
import { notifyLeaveDecided } from './leave.notify';
import { leaveDecisionSchema } from './leave.rules';

/** The caller's own HR record, when they have one and are still employed. */
export async function callerRecord(userId: string): Promise<IHrEmployee | null> {
  const doc = await HrEmployeeModel.findOne({ user_id: new Types.ObjectId(userId) }).lean<IHrEmployee>();
  return doc && doc.status !== 'EXITED' ? doc : null;
}

export const isHrUser = (user: Pick<AuthUser, 'roles'>) => user.roles.some((role) => HR_ROLES.includes(role));

/**
 * Whether the caller may decide this request, and in which seat: as the
 * employee's current reporting manager, or as HR. FORBIDDEN otherwise.
 */
export async function deciderSeat(request: Pick<IHrLeaveRequest, 'employee_id' | 'user_id'>, user: AuthUser): Promise<'MANAGER' | 'HR'> {
  if (String(request.user_id) === user.id) fail('FORBIDDEN', 'You cannot decide your own leave request');
  const [caller, employee] = await Promise.all([
    callerRecord(user.id),
    HrEmployeeModel.findById(request.employee_id).select('job.manager_id').lean<Pick<IHrEmployee, 'job'>>(),
  ]);
  if (caller && employee?.job.manager_id?.equals(caller._id)) return 'MANAGER';
  if (isHrUser(user)) return 'HR';
  return fail('FORBIDDEN', 'Only the reporting manager or HR can decide this request');
}

export const leaveDecisionService = {
  async decide(id: string, raw: unknown, user: AuthUser): Promise<IHrLeaveRequest> {
    const input = parseInput(leaveDecisionSchema, raw);
    const doc = await HrLeaveRequestModel.findById(objectId(id, 'leave request')).lean<IHrLeaveRequest>();
    if (!doc) return fail('NOT_FOUND', 'Leave request not found');
    if (doc.status !== 'PENDING') fail('BAD_REQUEST', 'This request has already been decided');
    const seat = await deciderSeat(doc, user);
    const dates = doc.day_breakdown.map((d) => d.date);
    if (input.approve && doc.leave_type_paid) {
      // Already counted as pending, so this only fails if HR lowered the balance since it was asked.
      const employee = await HrEmployeeModel.findById(doc.employee_id).lean<IHrEmployee>();
      if (!employee) return fail('NOT_FOUND', 'Employee not found');
      await assertBalance(employee, await leaveTypeService.byId(String(doc.leave_type_id)), new Map(), dates);
    }
    if (input.approve && !doc.leave_type_paid) await assertMonthsOpen(dates);
    const status = input.approve ? 'APPROVED' : 'REJECTED';
    const updated = await HrLeaveRequestModel.findOneAndUpdate(
      { _id: doc._id, status: 'PENDING' },
      { $set: { status, decision: { by: await actorOf(user), at: new Date(), note: input.note, as_hr: seat === 'HR' } } },
      { new: true }
    ).lean<IHrLeaveRequest>();
    if (!updated) return fail('CONFLICT', 'This request was decided by someone else a moment ago. Reload it.');
    if (status === 'REJECTED') await HrLeaveDayClaimModel.deleteMany({ request_id: doc._id });
    logs.server.info('leave.decision', 'decided', { requestId: id, status, seat, userId: user.id });
    await notifyLeaveDecided(updated);
    return updated;
  },
};
