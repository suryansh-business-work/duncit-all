import { GraphQLError } from 'graphql';
import { Types, type ClientSession } from 'mongoose';
import { HrEmployeeModel, type IHrEmployee } from './employee.model';
import { hrSettingsService } from '@modules/hr/settings/hrSettings.service';

/** How far up a reporting line is walked before it is called a loop. */
const MAX_CHAIN = 50;
const CODE_ATTEMPTS = 5;

export function fail(code: string, message: string): never {
  throw new GraphQLError(message, { extensions: { code } });
}

export function objectId(id: string, what = 'employee'): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) fail('BAD_USER_INPUT', `Invalid ${what} id`);
  return new Types.ObjectId(id);
}

export async function loadEmployee(id: string): Promise<IHrEmployee> {
  const doc = await HrEmployeeModel.findById(objectId(id)).lean<IHrEmployee>();
  if (!doc) fail('NOT_FOUND', 'Employee not found');
  return doc;
}

export const conflict = (): never =>
  fail('CONFLICT', 'This employee record was changed by someone else. Reload it and try again.');

/** Apply `update` only if the record is still at `revision`; CONFLICT otherwise. */
export async function writeAt(
  doc: Pick<IHrEmployee, '_id'>,
  revision: number,
  update: Record<string, unknown>,
  session?: ClientSession
): Promise<IHrEmployee> {
  const updated = await HrEmployeeModel.findOneAndUpdate(
    { _id: doc._id, revision },
    { $set: update, $inc: { revision: 1 } },
    { new: true, session }
  ).lean<IHrEmployee>();
  return updated ?? conflict();
}

/**
 * A reporting manager must be a current employee, never the person themselves,
 * and never someone who already reports — directly or not — to them: that
 * would make the org chart a circle.
 */
export async function checkManager(managerId: string | null, selfId: Types.ObjectId | null): Promise<Types.ObjectId | null> {
  if (!managerId) return null;
  const id = objectId(managerId, 'manager');
  if (selfId?.equals(id)) fail('BAD_USER_INPUT', 'An employee cannot report to themselves');
  const manager = await HrEmployeeModel.findById(id).select('status job.manager_id').lean<IHrEmployee>();
  if (!manager) fail('BAD_USER_INPUT', 'Choose an existing employee as the manager');
  if (manager.status === 'EXITED') fail('BAD_USER_INPUT', 'The chosen manager has left. Choose a current employee.');
  if (!selfId) return id;
  let cursor = manager.job.manager_id;
  for (let depth = 0; cursor && depth < MAX_CHAIN; depth += 1) {
    if (cursor.equals(selfId)) fail('BAD_USER_INPUT', 'That manager already reports to this employee');
    const next = await HrEmployeeModel.findById(cursor).select('job.manager_id').lean<IHrEmployee>();
    cursor = next?.job.manager_id ?? null;
  }
  return id;
}

/**
 * The code a hire gets: the one HR typed, refused when taken, or the next
 * automatic code — skipping any number HR already handed out by hand.
 */
export async function claimEmployeeCode(requested: string | null): Promise<string> {
  if (requested) {
    if (await HrEmployeeModel.exists({ employee_code: requested })) fail('CONFLICT', `Employee code ${requested} is already in use`);
    return requested;
  }
  for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt += 1) {
    const code = await hrSettingsService.nextEmployeeCode();
    if (!(await HrEmployeeModel.exists({ employee_code: code }))) return code;
  }
  return fail('CONFLICT', 'Could not find a free employee code. Type one in, or change the prefix in HR settings.');
}
