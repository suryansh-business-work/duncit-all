import { Types, type ClientSession } from 'mongoose';
import type { AuthUser } from '@context';
import { logs } from '@observability/log';
import { userDisplayOf } from '@modules/access/user/user.display';
import { HR_ROLES } from '@modules/hr/hr.roles';
import type { PayoutActor } from '@modules/finance/payout/payout.audit';
import { HrPayrollEventModel, type IPayrollActor, type PayrollEventAction } from './payroll.model';

/**
 * Who may do what with payroll. HR prepares and approves; only Super Admins
 * and Finance Managers release money, as they already do for every other
 * payout — and never the same person who approved the run.
 */
export const PAYROLL_RELEASE_ROLES: readonly string[] = ['SUPER_ADMIN', 'FINANCE_MANAGER'];

/** Reading runs: HR, and Finance who release them. */
export const PAYROLL_READ_ROLES: readonly string[] = [...new Set([...HR_ROLES, ...PAYROLL_RELEASE_ROLES])];

/** The scheduler, which has no account. */
export const SCHEDULER_ACTOR: IPayrollActor = { user_id: null, name: 'Payroll scheduler' };

export async function payrollActor(user: Pick<AuthUser, 'id'>): Promise<IPayrollActor> {
  const display = await userDisplayOf(user.id);
  return { user_id: new Types.ObjectId(user.id), name: display.name };
}

/** The same person as the money-out audit trail names them, with their most specific Finance role. */
export function payoutActorOf(actor: IPayrollActor, user?: Pick<AuthUser, 'roles'>): PayoutActor {
  const role = PAYROLL_RELEASE_ROLES.find((r) => user?.roles.includes(r)) ?? (actor.user_id ? 'HR' : 'SYSTEM');
  return { id: actor.user_id ? String(actor.user_id) : null, name: actor.name, role };
}

export interface RunEventInput {
  runId: Types.ObjectId;
  action: PayrollEventAction;
  actor: IPayrollActor;
  lineId?: Types.ObjectId | null;
  note?: string | null;
  detail?: Record<string, unknown>;
  session?: ClientSession;
}

/**
 * Append one row to a run's history. Inside a transaction the row commits with
 * the change it describes; outside one, a failed write is logged and never
 * undoes a change that already happened.
 */
export async function recordRunEvent(input: RunEventInput): Promise<void> {
  const doc = {
    run_id: input.runId,
    line_id: input.lineId ?? null,
    action: input.action,
    actor: input.actor,
    note: input.note ?? null,
    detail: input.detail ?? {},
  };
  if (input.session) {
    await HrPayrollEventModel.create([doc], { session: input.session });
    return;
  }
  try {
    await HrPayrollEventModel.create(doc);
  } catch (error) {
    logs.server.error('payroll.history', 'record', { error, action: input.action, runId: String(input.runId) });
  }
}
