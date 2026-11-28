/**
 * Hire: the one business process that creates an HR record.
 *
 * Order matters. Everything that can refuse — the input, the manager, the
 * code, an account already on record — is checked before anything is written.
 * Only then is a brand-new account opened (as a plain member), the record,
 * its first pay revision and its HIRED row committed together, and finally
 * the EMPLOYEE role granted. A repeated press of Hire (same client request
 * id) returns the first record instead of writing a second.
 */
import { Types } from 'mongoose';
import type { AuthUser } from '@context';
import { logs } from '@observability/log';
import { isDuplicateKeyError } from '@utils/mongo-error';
import { withTransaction } from '@utils/mongoTransaction';
import { parseInput } from '@modules/targets/employeeTarget/employeeTarget.rules';
import { HrEmployeeModel, type IHrEmployee } from './employee.model';
import { createAccount, existingAccount, grantEmployeeRole } from './employee.account';
import { insertCompensation } from './employee.compensation';
import { bankBlock } from './employee.bank';
import { actorOf, recordEvent, todayKey } from './employee.events';
import { checkBirthDate, jobBlock } from './employee.lifecycle';
import { claimEmployeeCode, fail } from './employee.store';
import { hireSchema, type HireInput } from './employee.rules';

async function byRequest(userId: string, requestId: string | null): Promise<IHrEmployee | null> {
  if (!requestId) return null;
  return HrEmployeeModel.findOne({ 'created_by.user_id': new Types.ObjectId(userId), client_request_id: requestId }).lean<IHrEmployee>();
}

async function alreadyOnRecord(userId: string): Promise<void> {
  const existing = await HrEmployeeModel.findOne({ user_id: new Types.ObjectId(userId) }).select('employee_code status').lean<IHrEmployee>();
  if (!existing) return;
  const hint = existing.status === 'EXITED' ? ' Open their record and use Rehire.' : '';
  fail('CONFLICT', `This account already has an HR record (${existing.employee_code}).${hint}`);
}

/** The account to hire into: an existing one checked, or a new one opened as a plain member. */
async function resolveAccount(input: HireInput, actorId: string): Promise<string> {
  if (input.account_user_id) {
    const account = await existingAccount(input.account_user_id);
    return String(account._id);
  }
  const fresh = input.new_account;
  if (!fresh) return fail('BAD_USER_INPUT', 'Pick an existing account or enter a new account email');
  const account = await createAccount(
    { ...fresh, first_name: input.personal.first_name, last_name: input.personal.last_name },
    actorId
  );
  return String(account._id);
}

export async function hireEmployee(raw: unknown, user: AuthUser): Promise<IHrEmployee> {
  const input = parseInput(hireSchema, raw);
  const prior = await byRequest(user.id, input.client_request_id);
  if (prior) {
    // A retry after a failed role grant finishes the job instead of failing again.
    if (prior.status !== 'EXITED') await grantEmployeeRole(String(prior.user_id), user.id);
    return prior;
  }
  checkBirthDate(input.personal, todayKey());
  if (input.account_user_id) await alreadyOnRecord(input.account_user_id);
  const job = await jobBlock(input.job, null);
  if (input.compensation && input.compensation.effective_from < input.job.date_of_joining) {
    fail('BAD_USER_INPUT', 'Pay cannot start before the joining date');
  }
  const employeeCode = await claimEmployeeCode(input.employee_code);
  const actor = await actorOf(user);
  const userId = await resolveAccount(input, user.id);

  let created: IHrEmployee;
  try {
    created = await withTransaction(async (session) => {
      const [doc] = await HrEmployeeModel.create(
        [
          {
            user_id: new Types.ObjectId(userId),
            employee_code: employeeCode,
            status: 'ACTIVE',
            personal: input.personal,
            job,
            // No previous block to keep from, so the parsed input is the whole story.
            bank: input.bank ? bankBlock(input.bank, input.bank, null) : {},
            client_request_id: input.client_request_id,
            created_by: actor,
          },
        ],
        { session }
      );
      if (input.compensation) {
        await insertCompensation(doc._id, { ...input.compensation, reason: 'HIRE' }, actor, session);
      }
      await recordEvent({
        employeeId: doc._id,
        kind: 'HIRED',
        effectiveDate: input.job.date_of_joining,
        actor,
        changes: [
          { field: 'employee_code', from: null, to: employeeCode },
          { field: 'job.job_title', from: null, to: input.job.job_title },
        ],
        session,
      });
      return doc.toObject() as IHrEmployee;
    });
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    const twin = await byRequest(user.id, input.client_request_id);
    if (twin) return twin;
    return fail('CONFLICT', 'This account or employee code was just put on record by someone else. Reload and check the directory.');
  }
  await grantEmployeeRole(userId, user.id);
  logs.server.info('employee.hire', 'hired', { employeeId: String(created._id), userId: user.id, code: employeeCode });
  return created;
}
