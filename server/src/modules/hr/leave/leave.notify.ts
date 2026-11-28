import { appDate } from '@utils/app-time';
import { HrEmployeeModel, type IHrEmployee } from '@modules/hr/employee/employee.model';
import { PORTAL_ROLE_REQUIREMENTS } from '@modules/portals/portal.constants';
import { hrLink, notifyHr, roleHolderIds } from '@modules/hr/hr.notify';
import type { IHrLeaveRequest } from './leave.model';

export const LEAVE_REQUESTED_TEMPLATE = 'hr-leave-requested';
export const LEAVE_DECIDED_TEMPLATE = 'hr-leave-decided';
const SOURCE = 'leave.notify';

/** A day key as the admin's date format prints it, read at noon UTC so no zone moves it a day. */
export const dayLabel = (key: string) => appDate(new Date(`${key}T12:00:00.000Z`));

export const datesLabel = (request: Pick<IHrLeaveRequest, 'start_date' | 'end_date'>) =>
  request.start_date === request.end_date ? dayLabel(request.start_date) : `${dayLabel(request.start_date)} – ${dayLabel(request.end_date)}`;

const daysLabel = (days: number) => `${days} ${days === 1 ? 'day' : 'days'}`;

/** Who decides: the manager's account, or HR when the request has no manager. */
async function approverIds(request: IHrLeaveRequest): Promise<string[]> {
  if (request.approver_employee_id) {
    const manager = await HrEmployeeModel.findById(request.approver_employee_id).select('user_id').lean<Pick<IHrEmployee, 'user_id'>>();
    if (manager) return [String(manager.user_id)];
  }
  return roleHolderIds(PORTAL_ROLE_REQUIREMENTS.hr);
}

export async function notifyLeaveRequested(request: IHrLeaveRequest): Promise<void> {
  const toManager = Boolean(request.approver_employee_id);
  const link = toManager ? hrLink('employee', '/leave/team') : hrLink('hr', '/leave');
  await notifyHr(
    {
      userIds: await approverIds(request),
      title: `${request.employee_name} asked for ${request.leave_type_name}`,
      body: `${datesLabel(request)} (${daysLabel(request.days)}). Approve or decline it.`,
      link,
      email: {
        template: LEAVE_REQUESTED_TEMPLATE,
        subject: `Leave request from ${request.employee_name}`,
        vars: {
          employee_name: request.employee_name,
          leave_type: request.leave_type_name,
          dates: datesLabel(request),
          days: String(request.days),
          reason: request.reason ?? '-',
          review_url: link,
        },
      },
    },
    SOURCE
  );
}

export async function notifyLeaveDecided(request: IHrLeaveRequest): Promise<void> {
  const approved = request.status === 'APPROVED';
  const link = hrLink('employee', '/leave');
  const decision = approved ? 'Approved' : 'Declined';
  await notifyHr(
    {
      userIds: [String(request.user_id)],
      title: `Your ${request.leave_type_name} was ${approved ? 'approved' : 'declined'}`,
      body: `${datesLabel(request)} (${daysLabel(request.days)})${request.decision?.note ? `: ${request.decision.note}` : ''}`,
      link,
      email: {
        template: LEAVE_DECIDED_TEMPLATE,
        subject: `Your leave request was ${approved ? 'approved' : 'declined'}`,
        vars: {
          decision,
          leave_type: request.leave_type_name,
          dates: datesLabel(request),
          days: String(request.days),
          note: request.decision?.note ?? '-',
          decided_by: request.decision?.by.name ?? '-',
          leave_url: link,
        },
      },
    },
    SOURCE
  );
}

/** HR cancelling tells the employee; an employee cancelling approved leave tells whoever approved it. */
export async function notifyLeaveCancelled(request: IHrLeaveRequest, was: IHrLeaveRequest['status'], asHr: boolean): Promise<void> {
  if (!asHr && was !== 'APPROVED') return;
  const userIds = asHr ? [String(request.user_id)] : await approverIds(request);
  let link = hrLink('hr', '/leave');
  if (asHr) link = hrLink('employee', '/leave');
  else if (request.approver_employee_id) link = hrLink('employee', '/leave/team');
  await notifyHr(
    {
      userIds,
      title: asHr ? `HR cancelled your ${request.leave_type_name}` : `${request.employee_name} cancelled approved leave`,
      body: `${datesLabel(request)}${request.cancellation?.note ? `: ${request.cancellation.note}` : ''}`,
      link,
    },
    SOURCE
  );
}
