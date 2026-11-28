import type { AuthUser } from '@context';
import { logs } from '@observability/log';
import { parseInput } from '@modules/targets/employeeTarget/employeeTarget.rules';
import { actorOf } from '@modules/hr/employee/employee.events';
import { fail, loadEmployee } from '@modules/hr/employee/employee.store';
import { HrLeaveAdjustmentModel } from './leave.model';
import { leaveTypeService } from './leave.types';
import { leaveAdjustmentSchema } from './leave.rules';

/**
 * HR's hand change to a balance — an opening balance when the console starts
 * tracking someone, an encashment, a correction. Each one is its own
 * append-only row with a reason, so a balance can always be explained.
 */
export async function adjustLeaveBalance(raw: unknown, user: AuthUser) {
  const input = parseInput(leaveAdjustmentSchema, raw);
  const employee = await loadEmployee(input.employee_id);
  if (String(employee.user_id) === user.id) fail('FORBIDDEN', 'You cannot adjust your own leave balance');
  const type = await leaveTypeService.byId(input.leave_type_id);
  if (!type.paid) fail('BAD_USER_INPUT', `${type.name} is unpaid and has no balance to adjust`);
  await HrLeaveAdjustmentModel.create({
    employee_id: employee._id,
    leave_type_id: type._id,
    leave_year: input.leave_year,
    days: input.days,
    note: input.note,
    actor: await actorOf(user),
  });
  logs.server.info('leave.adjust', 'adjusted', { employeeId: input.employee_id, type: type.code, days: input.days, userId: user.id });
  return true;
}
