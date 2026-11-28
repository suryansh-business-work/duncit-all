import { PORTAL_ROLE_REQUIREMENTS } from '@modules/portals/portal.constants';
import { maskedTail } from '@modules/hr/employee/employee.rules';
import { hrLink, notifyHr, roleHolderIds } from '@modules/hr/hr.notify';
import type { IHrBankChangeRequest } from './bankRequest.model';

export const BANK_CHANGE_DECIDED_TEMPLATE = 'hr-bank-change-decided';
const SOURCE = 'bankRequest.notify';

/** HR hears in the console; the employee who asked is never among the reviewers told. */
export async function notifyBankRequested(request: IHrBankChangeRequest): Promise<void> {
  const reviewers = (await roleHolderIds(PORTAL_ROLE_REQUIREMENTS.hr)).filter((id) => id !== String(request.user_id));
  await notifyHr(
    {
      userIds: reviewers,
      title: `${request.employee_name} asked to change their salary account`,
      body: `New account ${maskedTail(request.account_last4)} (${request.ifsc}). Check the proof and approve or decline it.`,
      link: hrLink('hr', '/bank-requests'),
    },
    SOURCE
  );
}

export async function notifyBankRequestDecided(request: IHrBankChangeRequest): Promise<void> {
  const approved = request.status === 'APPROVED';
  const link = hrLink('employee', '/bank-account');
  await notifyHr(
    {
      userIds: [String(request.user_id)],
      title: approved ? 'Your salary account was changed' : 'Your salary account change was declined',
      body: `${maskedTail(request.account_last4)} (${request.ifsc})${request.decision?.note ? `: ${request.decision.note}` : ''}`,
      link,
      email: {
        template: BANK_CHANGE_DECIDED_TEMPLATE,
        subject: approved ? 'Your salary account was changed' : 'Your salary account change was declined',
        vars: {
          decision: approved ? 'Approved' : 'Declined',
          account: maskedTail(request.account_last4),
          ifsc: request.ifsc,
          note: request.decision?.note ?? '-',
          bank_url: link,
        },
      },
    },
    SOURCE
  );
}
