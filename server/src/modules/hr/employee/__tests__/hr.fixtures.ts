/**
 * Shared setup for the HR employee suites: real accounts in the test database,
 * signed-in contexts, and a complete hire input that each test changes only
 * where it matters.
 */
import { makeContext } from '@test/harness';
import { UserModel } from '@modules/access/user/user.model';
import { UserRoleModel } from '@modules/access/user/relations';
import { hrEmployeeResolvers } from '../employee.resolver';

export const Q = hrEmployeeResolvers.Query as Record<string, (...a: any[]) => any>;
export const M = hrEmployeeResolvers.Mutation as Record<string, (...a: any[]) => any>;

export type Ctx = ReturnType<typeof makeContext>;

/**
 * Role writes (replaceUserRoles) run inside `session.withTransaction`, which
 * the standalone test mongod cannot host. As in the user-roles suite, the
 * session stays real and its withTransaction simply runs the work, so every
 * write still carries the session.
 */
export function stubRoleTransactions(): void {
  beforeEach(() => {
    const realStart = UserModel.db.startSession.bind(UserModel.db);
    jest.spyOn(UserModel.db, 'startSession').mockImplementation((async (opts?: any) => {
      const session = await realStart(opts);
      (session as any).withTransaction = async (fn: (s: unknown) => Promise<unknown>) => {
        await fn(session);
      };
      return session;
    }) as any);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });
}

let seq = 0;

/** A real account holding `roles`, and a context signed in as it. */
export async function person(first: string, roles: string[], status = 'ACTIVE') {
  seq += 1;
  const email = `hr${seq}@x.com`;
  const user = await UserModel.create({
    auth: { email },
    profile: { first_name: first, last_name: 'Iyer' },
    metadata: { role_keys: roles, status },
  });
  await UserRoleModel.insertMany(roles.map((role) => ({ user_id: user._id, role, scope: { city: null, zone: null } })));
  return makeContext({ id: String(user._id), email, roles });
}

export const rolesOf = async (userId: string) =>
  ((await UserModel.findById(userId).select('metadata.role_keys').lean<any>())?.metadata?.role_keys ?? []) as string[];

export const JOB = {
  job_title: 'Community Manager',
  department: 'Growth',
  work_location: 'Bengaluru',
  manager_id: null,
  employment_type: 'FULL_TIME',
  date_of_joining: '2026-01-05',
  probation_end_date: '2026-04-05',
  notice_period_days: 30,
  work_email: 'meera@duncit.test',
};

export const PERSONAL = {
  first_name: 'Meera',
  last_name: 'Nair',
  gender: 'FEMALE',
  date_of_birth: '1995-06-15',
  personal_email: 'meera.personal@x.com',
  phone_number: '9876543210',
  phone_extension: '+91',
  current_address: 'Indiranagar, Bengaluru',
  permanent_address: null,
  emergency_contact: { name: 'Ravi Nair', relation: 'Brother', phone_number: '9876500000', phone_extension: '+91' },
};

export const PAY = {
  currency: 'INR',
  effective_from: '2026-01-05',
  reason: 'HIRE',
  note: null,
  components: [
    { label: 'Basic', type: 'EARNING', monthly_amount: 40000 },
    { label: 'HRA', type: 'EARNING', monthly_amount: 16000 },
    { label: 'Target incentive', type: 'EARNING', monthly_amount: 10000, target_linked: true },
    { label: 'Employee PF', type: 'DEDUCTION', monthly_amount: 1800 },
    { label: 'Employer PF', type: 'EMPLOYER_CONTRIBUTION', monthly_amount: 1800 },
  ],
};

/** Hire `account` (an existing context) with the defaults above, overridden by `over`. */
export function hireInput(account: Ctx | null, over: Record<string, unknown> = {}) {
  return {
    account_user_id: account ? account.user!.id : null,
    personal: PERSONAL,
    job: JOB,
    compensation: PAY,
    ...over,
  };
}

export const hire = (hr: Ctx, account: Ctx | null, over: Record<string, unknown> = {}) =>
  M.hireHrEmployee({}, { input: hireInput(account, over) }, hr);
