import { logs } from '@observability/log';
import { appFormat } from '@utils/app-time';
import { PORTAL_ROLE_REQUIREMENTS } from '@modules/portals/portal.constants';
import { hrLink, notifyHr, roleHolderIds } from '@modules/hr/hr.notify';
import { dayLabel } from '@modules/hr/leave/leave.notify';
import { HrPayrollLineModel, type IPayrollLine, type IPayrollRun } from './payroll.model';
import { PAYROLL_RELEASE_ROLES } from './payroll.history';
import { PAYOUT_CURRENCY } from './payroll.rules';

export const PAYROLL_AWAITING_RELEASE_TEMPLATE = 'hr-payroll-awaiting-release';
export const PAYSLIP_READY_TEMPLATE = 'hr-payslip-ready';
export const SALARY_PAID_TEMPLATE = 'hr-salary-paid';
const SOURCE = 'payroll.notify';
/** How many payslip notices go out at once when a run is released. */
const BATCH = 10;

export const monthLabel = (month: string) => appFormat(new Date(`${month}-15T12:00:00.000Z`), 'MMMM yyyy');

/** An amount in its own currency's format; nothing assumes rupees. */
export function moneyLabel(paise: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(paise / 100);
  } catch {
    return `${currency} ${(paise / 100).toFixed(2)}`;
  }
}

const hrIds = () => roleHolderIds(PORTAL_ROLE_REQUIREMENTS.hr);
const financeIds = () => roleHolderIds(PAYROLL_RELEASE_ROLES.filter((role) => role !== 'SUPER_ADMIN'));
/** Run totals are shown in the currency payroll pays in: a line in any other currency is held, never paid. */
const runCurrency = PAYOUT_CURRENCY;

export async function notifyRunDrafted(run: IPayrollRun): Promise<void> {
  await notifyHr(
    {
      userIds: await hrIds(),
      title: `Payroll for ${monthLabel(run.month)} is ready to review`,
      body: `${run.totals.employees} employees, ${moneyLabel(run.totals.net_paise, runCurrency)} net. Approve it before ${dayLabel(run.scheduled_pay_date)}.`,
      link: hrLink('hr', `/payroll/${String(run._id)}`),
    },
    SOURCE
  );
}

export async function notifyRunApproved(run: IPayrollRun): Promise<void> {
  const link = hrLink('finance', `/payroll/${String(run._id)}`);
  await notifyHr(
    {
      userIds: await financeIds(),
      title: `Payroll for ${monthLabel(run.month)} is waiting for release`,
      body: `Approved by ${run.approved?.by.name ?? 'HR'}: ${run.totals.employees} employees, ${moneyLabel(run.totals.net_paise, runCurrency)} net.`,
      link,
      email: {
        template: PAYROLL_AWAITING_RELEASE_TEMPLATE,
        subject: `Payroll for ${monthLabel(run.month)} is waiting for release`,
        vars: {
          month: monthLabel(run.month),
          employees: String(run.totals.employees),
          net_total: moneyLabel(run.totals.net_paise, runCurrency),
          approved_by: run.approved?.by.name ?? '-',
          pay_date: dayLabel(run.scheduled_pay_date),
          release_url: link,
        },
      },
    },
    SOURCE
  );
}

/** HR hears when a run comes back — from Finance, or from a colleague. The person who sent it back is not told. */
export async function notifyRunReturned(run: IPayrollRun, actorId: string): Promise<void> {
  await notifyHr(
    {
      userIds: (await hrIds()).filter((id) => id !== actorId),
      title: `Payroll for ${monthLabel(run.month)} was sent back to draft`,
      body: `${run.returned?.by.name ?? 'Someone'}: ${run.returned?.note ?? ''}`,
      link: hrLink('hr', `/payroll/${String(run._id)}`),
    },
    SOURCE
  );
}

function payslipNotice(line: IPayrollLine, run: IPayrollRun) {
  const link = hrLink('employee', `/payslips/${String(line._id)}`);
  const payOn = run.pay_on ? dayLabel(run.pay_on) : '-';
  return notifyHr(
    {
      userIds: [String(line.user_id)],
      title: `Your payslip for ${monthLabel(line.month)} is ready`,
      body: `Net pay ${moneyLabel(line.net_paise, line.currency)}${line.hold ? ', on hold' : `, paid on ${payOn}`}.`,
      link,
      email: {
        template: PAYSLIP_READY_TEMPLATE,
        subject: `Your payslip for ${monthLabel(line.month)}`,
        vars: { month: monthLabel(line.month), net_pay: moneyLabel(line.net_paise, line.currency), pay_on: payOn, payslip_url: link },
      },
    },
    SOURCE
  );
}

export async function notifyPayslipsReady(run: IPayrollRun): Promise<void> {
  try {
    const lines = await HrPayrollLineModel.find({ run_id: run._id, published: true }).lean<IPayrollLine[]>();
    for (let i = 0; i < lines.length; i += BATCH) {
      await Promise.all(lines.slice(i, i + BATCH).map((line) => payslipNotice(line, run)));
    }
  } catch (error) {
    logs.server.warn(SOURCE, 'payslips', { error, runId: String(run._id) });
  }
}

export async function notifySalaryPaid(line: IPayrollLine, reference: string): Promise<void> {
  const link = hrLink('employee', `/payslips/${String(line._id)}`);
  await notifyHr(
    {
      userIds: [String(line.user_id)],
      title: `Your ${monthLabel(line.month)} salary is paid`,
      body: `${moneyLabel(line.net_paise, line.currency)} sent to the account ending ${line.bank?.account_last4 ?? '----'}.`,
      link,
      email: {
        template: SALARY_PAID_TEMPLATE,
        subject: `Your ${monthLabel(line.month)} salary is paid`,
        vars: { month: monthLabel(line.month), amount: moneyLabel(line.net_paise, line.currency), reference: reference || '-', payslip_url: link },
      },
    },
    SOURCE
  );
}

export async function notifyPayoutFailed(line: IPayrollLine, reason: string): Promise<void> {
  const [finance, hr] = await Promise.all([financeIds(), hrIds()]);
  await notifyHr(
    {
      userIds: [...finance, ...hr],
      title: `Salary payout failed for ${line.employee.name}`,
      body: `${monthLabel(line.month)}: ${reason || 'Razorpay did not complete the payout.'} Retry it from the payroll run.`,
      link: hrLink('finance', `/payroll/${String(line.run_id)}`),
    },
    SOURCE
  );
}
