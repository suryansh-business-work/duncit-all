/**
 * The Employee console's half: the signed-in person's own HR record.
 *
 * Every read and write is addressed by the session's user id — never an id
 * from the client — so nobody can reach another person's record by asking.
 * An employee may change their own contact details and emergency contact;
 * their name, job, pay and bank details change only through HR (a bank
 * account an employee could switch themselves is how payroll fraud starts).
 */
import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { withTransaction } from '@utils/mongoTransaction';
import { parseInput } from '@modules/targets/employeeTarget/employeeTarget.rules';
import { HrEmployeeModel, type IHrEmployee } from './employee.model';
import { compensationView } from './employee.compensation';
import { actorOf, diffFlat, flatten, recordEvent, todayKey } from './employee.events';
import { managersOf, toEmployee } from './employee.mapper';
import { fail, writeAt } from './employee.store';
import { contactSchema } from './employee.rules';

const CONTACT_FIELDS = [
  'personal.personal_email',
  'personal.phone_number',
  'personal.phone_extension',
  'personal.current_address',
  'personal.permanent_address',
  'personal.emergency_contact',
] as const;

async function ownRecord(userId: string): Promise<IHrEmployee | null> {
  return HrEmployeeModel.findOne({ user_id: new Types.ObjectId(userId) }).lean<IHrEmployee>();
}

async function view(doc: IHrEmployee) {
  const [managers, pay] = await Promise.all([managersOf([doc]), compensationView(doc._id)]);
  return { employee: toEmployee(doc, managers), current_compensation: pay.current };
}

export const selfService = {
  /** Null when HR has not put this account on record yet — the console says so instead of failing. */
  async profile(userId: string) {
    const doc = await ownRecord(userId);
    return doc ? view(doc) : null;
  },

  async updateContact(userId: string, raw: unknown, expectedRevision: number) {
    const doc = await ownRecord(userId);
    if (!doc) return fail('NOT_FOUND', 'HR has not added your employee record yet');
    if (doc.status === 'EXITED') return fail('BAD_USER_INPUT', 'Your employment has ended, so your record is read-only');
    const contact = parseInput(contactSchema, raw);
    const personal = { ...doc.personal, ...contact };
    const changes = diffFlat(flatten(doc, CONTACT_FIELDS), flatten({ personal }, CONTACT_FIELDS));
    if (changes.length === 0) return view(doc);
    const actor = await actorOf({ id: userId });
    const saved = await withTransaction(async (session) => {
      const updated = await writeAt(doc, expectedRevision, { personal, updated_by: actor }, session);
      await recordEvent({ employeeId: doc._id, kind: 'CONTACT_UPDATED', effectiveDate: todayKey(), actor, changes, session });
      return updated;
    });
    logs.server.info('employee.self', 'contact-updated', { userId, fields: changes.map((c) => c.field) });
    return view(saved);
  },
};
