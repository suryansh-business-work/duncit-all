/**
 * Changes to a working employee: personal details, job moves, exits and
 * rehires. Each change and its worker-history row commit together; the role
 * change that follows an exit or rehire runs after the commit, through the one
 * door every role write uses.
 */
import type { AuthUser } from '@context';
import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { withTransaction } from '@utils/mongoTransaction';
import { parseInput } from '@modules/targets/employeeTarget/employeeTarget.rules';
import { HrEmployeeModel, type IHrActor, type IHrEmployee } from './employee.model';
import { grantEmployeeRole, revokeEmployeeRole } from './employee.account';
import { managersOf } from './employee.mapper';
import { actorOf, diffFlat, flatten, recordEvent, todayKey } from './employee.events';
import { checkManager, fail, loadEmployee, writeAt } from './employee.store';
import {
  canCancelExit,
  canRehire,
  canScheduleExit,
  exitSchema,
  exitStatusFor,
  isEditable,
  jobChangeSchema,
  personalSchema,
  rehireSchema,
  yearsBetween,
  HR_EMPLOYEE_LIMITS,
  type JobInput,
  type PersonalInput,
} from './employee.rules';

export const PERSONAL_FIELDS = [
  'personal.first_name',
  'personal.last_name',
  'personal.gender',
  'personal.date_of_birth',
  'personal.personal_email',
  'personal.phone_number',
  'personal.phone_extension',
  'personal.current_address',
  'personal.permanent_address',
  'personal.emergency_contact',
] as const;

export const JOB_FIELDS = [
  'job.job_title',
  'job.department',
  'job.work_location',
  'job.manager_id',
  'job.employment_type',
  'job.date_of_joining',
  'job.probation_end_date',
  'job.notice_period_days',
  'job.work_email',
] as const;

/** A birth date must be in the past and old enough to employ. */
export function checkBirthDate(personal: PersonalInput, today: string): void {
  if (!personal.date_of_birth) return;
  if (personal.date_of_birth >= today) fail('BAD_USER_INPUT', 'Date of birth must be in the past');
  if (yearsBetween(personal.date_of_birth, today) < HR_EMPLOYEE_LIMITS.minAgeYears) {
    fail('BAD_USER_INPUT', `An employee must be at least ${HR_EMPLOYEE_LIMITS.minAgeYears} years old`);
  }
}

/** The job block as stored, with the manager checked against the reporting line. */
export async function jobBlock(job: JobInput, selfId: IHrEmployee['_id'] | null) {
  return { ...job, manager_id: await checkManager(job.manager_id, selfId) };
}

/** The job fields that moved, with manager ids written as "Name (CODE)" so the history reads. */
export async function jobChanges(before: IHrEmployee, job: Awaited<ReturnType<typeof jobBlock>>) {
  const changes = diffFlat(flatten(before, JOB_FIELDS), flatten({ job }, JOB_FIELDS));
  const managerChange = changes.find((change) => change.field === 'job.manager_id');
  if (!managerChange) return changes;
  const ids = [managerChange.from, managerChange.to].filter((v): v is string => Boolean(v)).map((id) => new Types.ObjectId(id));
  const names = await managersOf(ids.map((manager_id) => ({ job: { manager_id } as IHrEmployee['job'] })));
  const label = (id: string | null) => {
    const ref = id ? names.get(id) : null;
    return ref ? `${ref.name} (${ref.employee_code})` : id;
  };
  managerChange.from = label(managerChange.from);
  managerChange.to = label(managerChange.to);
  return changes;
}

const editableOrFail = (employee: IHrEmployee) => {
  if (!isEditable(employee.status)) fail('BAD_USER_INPUT', 'This employee has left. Rehire them to change their record.');
};

/** Revoke console access for records whose last working day has passed. Shared by exits and the sweep. */
async function closeEmployment(employee: IHrEmployee, actor: IHrActor): Promise<void> {
  await revokeEmployeeRole(String(employee.user_id), String(actor.user_id)).catch((error: unknown) =>
    logs.server.error('employee.lifecycle', 'revoke', { error, msg: 'EMPLOYEE role not revoked after exit', employeeId: String(employee._id) })
  );
}

export const lifecycleService = {
  async updatePersonal(id: string, raw: unknown, expectedRevision: number, user: AuthUser) {
    const employee = await loadEmployee(id);
    const personal = parseInput(personalSchema, raw);
    checkBirthDate(personal, todayKey());
    const actor = await actorOf(user);
    const changes = diffFlat(flatten(employee, PERSONAL_FIELDS), flatten({ personal }, PERSONAL_FIELDS));
    if (changes.length === 0) return employee;
    return withTransaction(async (session) => {
      const saved = await writeAt(employee, expectedRevision, { personal, updated_by: actor }, session);
      await recordEvent({ employeeId: employee._id, kind: 'PERSONAL_UPDATED', effectiveDate: todayKey(), actor, changes, session });
      return saved;
    });
  },

  /** A job move: effective today or earlier. A future-dated move would read as already true. */
  async changeJob(id: string, raw: unknown, user: AuthUser) {
    const employee = await loadEmployee(id);
    editableOrFail(employee);
    const input = parseInput(jobChangeSchema, raw);
    if (input.effective_date > todayKey()) fail('BAD_USER_INPUT', 'A job change takes effect today or earlier. Record it on its effective day.');
    const job = await jobBlock(input.job, employee._id);
    const changes = await jobChanges(employee, job);
    if (changes.length === 0) fail('BAD_USER_INPUT', 'Nothing in the job changed');
    const actor = await actorOf(user);
    const saved = await withTransaction(async (session) => {
      const doc = await writeAt(employee, input.expected_revision, { job, updated_by: actor }, session);
      await recordEvent({
        employeeId: employee._id,
        kind: 'JOB_CHANGED',
        effectiveDate: input.effective_date,
        actor,
        changes: [{ field: 'reason', from: null, to: input.reason }, ...changes],
        note: input.note,
        session,
      });
      return doc;
    });
    logs.server.info('employee.lifecycle', 'job-changed', { employeeId: id, userId: user.id, reason: input.reason });
    return saved;
  },

  async scheduleExit(id: string, raw: unknown, user: AuthUser) {
    const employee = await loadEmployee(id);
    if (!canScheduleExit(employee.status)) fail('BAD_USER_INPUT', 'This employee has already left');
    const input = parseInput(exitSchema, raw);
    if (input.last_working_day < employee.job.date_of_joining) fail('BAD_USER_INPUT', 'The last working day cannot be before the joining date');
    if (await HrEmployeeModel.exists({ 'job.manager_id': employee._id, status: { $ne: 'EXITED' } })) {
      fail('BAD_USER_INPUT', 'Move this person’s direct reports to another manager before recording the exit');
    }
    const actor = await actorOf(user);
    const status = exitStatusFor(input.last_working_day, todayKey());
    const exit = {
      exit_type: input.exit_type,
      resignation_date: input.resignation_date,
      last_working_day: input.last_working_day,
      reason: input.reason,
      eligible_for_rehire: input.eligible_for_rehire,
      recorded_by: actor,
      recorded_at: new Date(),
    };
    const saved = await withTransaction(async (session) => {
      const doc = await writeAt(employee, input.expected_revision, { status, exit, updated_by: actor }, session);
      await recordEvent({
        employeeId: employee._id,
        kind: status === 'EXITED' ? 'EXITED' : 'EXIT_SCHEDULED',
        effectiveDate: input.last_working_day,
        actor,
        note: input.reason,
        changes: [
          { field: 'exit.exit_type', from: null, to: input.exit_type },
          { field: 'exit.last_working_day', from: null, to: input.last_working_day },
        ],
        session,
      });
      return doc;
    });
    if (status === 'EXITED') await closeEmployment(saved, actor);
    logs.server.info('employee.lifecycle', 'exit', { employeeId: id, userId: user.id, status });
    return saved;
  },

  async cancelExit(id: string, expectedRevision: number, user: AuthUser) {
    const employee = await loadEmployee(id);
    if (!canCancelExit(employee.status)) fail('BAD_USER_INPUT', 'Only an exit still in its notice period can be cancelled');
    const actor = await actorOf(user);
    return withTransaction(async (session) => {
      const doc = await writeAt(employee, expectedRevision, { status: 'ACTIVE', exit: null, updated_by: actor }, session);
      await recordEvent({ employeeId: employee._id, kind: 'EXIT_CANCELLED', effectiveDate: todayKey(), actor, session });
      return doc;
    });
  },

  /** The same record reopened: new joining date and job, history kept, console access back. */
  async rehire(id: string, raw: unknown, user: AuthUser) {
    const employee = await loadEmployee(id);
    if (!canRehire(employee.status)) fail('BAD_USER_INPUT', 'Only someone who has left can be rehired');
    const input = parseInput(rehireSchema, raw);
    if (employee.exit && input.job.date_of_joining <= employee.exit.last_working_day) {
      fail('BAD_USER_INPUT', 'The new joining date must be after the last working day');
    }
    const job = await jobBlock(input.job, employee._id);
    const rehireChanges = await jobChanges(employee, job);
    const actor = await actorOf(user);
    const saved = await withTransaction(async (session) => {
      const doc = await writeAt(employee, input.expected_revision, { status: 'ACTIVE', exit: null, job, updated_by: actor }, session);
      await recordEvent({
        employeeId: employee._id,
        kind: 'REHIRED',
        effectiveDate: input.job.date_of_joining,
        actor,
        note: input.note,
        changes: rehireChanges,
        session,
      });
      return doc;
    });
    await grantEmployeeRole(String(saved.user_id), user.id);
    return saved;
  },

  /** Give a current employee back the Employee console when their role was removed elsewhere. */
  async restoreAccess(id: string, user: AuthUser) {
    const employee = await loadEmployee(id);
    editableOrFail(employee);
    await grantEmployeeRole(String(employee.user_id), user.id);
    return employee;
  },

  /**
   * The daily close: everyone whose notice ended before today becomes EXITED
   * and loses the Employee console. Conditional on status, so a run racing a
   * cancel never exits someone who was kept on.
   */
  async closeEndedNotices(now: Date = new Date()): Promise<number> {
    const today = todayKey(now);
    const due = await HrEmployeeModel.find({ status: 'ON_NOTICE', 'exit.last_working_day': { $lt: today } }).lean<IHrEmployee[]>();
    let closed = 0;
    for (const employee of due) {
      const doc = await HrEmployeeModel.findOneAndUpdate(
        { _id: employee._id, status: 'ON_NOTICE' },
        { $set: { status: 'EXITED' }, $inc: { revision: 1 } },
        { new: true }
      ).lean<IHrEmployee>();
      if (!doc) continue;
      const actor = doc.exit?.recorded_by ?? doc.created_by;
      await recordEvent({ employeeId: doc._id, kind: 'EXITED', effectiveDate: doc.exit?.last_working_day ?? today, actor, note: 'Notice period ended' });
      await closeEmployment(doc, actor);
      closed += 1;
    }
    if (closed) logs.server.info('employee.lifecycle', 'notices-closed', { closed });
    return closed;
  },
};
