/**
 * Monthly employee targets against a real database: the Targets console
 * assigns one target per employee per month (a double-pressed Assign writes
 * once), the employee reads and reports on ONLY their own, an admin reviews,
 * and every write that lost a race says so instead of overwriting.
 */
import { makeContext } from '@test/harness';
import { UserModel } from '@modules/access/user/user.model';
import { EmployeeTargetModel } from '../../employeeTarget.model';
import { employeeTargetResolvers } from '../../employeeTarget.resolver';

const Q = employeeTargetResolvers.Query as Record<string, (...a: any[]) => any>;
const M = employeeTargetResolvers.Mutation as Record<string, (...a: any[]) => any>;

type Ctx = ReturnType<typeof makeContext>;

let seq = 0;
async function person(first: string, roles: string[], status = 'ACTIVE') {
  seq += 1;
  const email = `target${seq}@x.com`;
  const user = await UserModel.create({
    auth: { email },
    profile: { first_name: first, last_name: 'Rao' },
    metadata: { role_keys: roles, status },
  });
  return makeContext({ id: String(user._id), email, roles });
}

const GOALS = [{ title: 'Onboard venues', description: 'Bengaluru east', target_value: 40, unit: 'venues' }];

const assign = (admin: Ctx, employee: Ctx, over: Record<string, unknown> = {}) =>
  M.assignEmployeeTarget({}, { input: { employee_id: employee.user!.id, month: '2026-11', goals: GOALS, ...over } }, admin);

const submit = (employee: Ctx, id: string, revision: number, over: Record<string, unknown> = {}) =>
  M.submitEmployeeTarget(
    {},
    {
      id,
      input: {
        completion_percent: 80,
        achievements: [{ title: 'Signed 32 venues', details: 'Indiranagar and HSR' }],
        updates: 'Two more in legal review',
        expected_revision: revision,
        ...over,
      },
    },
    employee
  );

beforeAll(async () => {
  await EmployeeTargetModel.syncIndexes();
});

describe('assigning', () => {
  it('stores the goals against an active employee, attributed to the admin', async () => {
    const admin = await person('Asha', ['TARGETS_MANAGER']);
    const priya = await person('Priya', ['EMPLOYEE']);
    const row = await assign(admin, priya, { notes: '  Focus on east  ' });
    expect(row).toMatchObject({
      employee: { user_id: priya.user!.id, name: 'Priya Rao', email: priya.user!.email },
      month: '2026-11',
      goals: GOALS,
      goal_count: 1,
      notes: 'Focus on east',
      status: 'ASSIGNED',
      submission: null,
      review: null,
      revision: 0,
      assigned_by: { user_id: admin.user!.id, name: 'Asha Rao' },
    });
  });

  it('refuses a second target for the same employee and month, but allows it again after a delete', async () => {
    const admin = await person('Asha', ['TARGETS_MANAGER']);
    const priya = await person('Priya', ['EMPLOYEE']);
    const first = await assign(admin, priya);
    await expect(assign(admin, priya)).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });
    await expect(assign(admin, priya, { month: '2026-12' })).resolves.toMatchObject({ month: '2026-12' });

    await M.deleteEmployeeTarget({}, { id: first.id }, admin);
    await expect(assign(admin, priya)).resolves.toMatchObject({ month: '2026-11', status: 'ASSIGNED' });
    const stored = await EmployeeTargetModel.findById(first.id).lean();
    expect(stored).toMatchObject({ live: false, deleted_by: expect.anything() });
  });

  it('turns repeated presses of one Assign into one record, even when they race', async () => {
    const admin = await person('Asha', ['TARGETS_MANAGER']);
    const priya = await person('Priya', ['EMPLOYEE']);
    const raced = await Promise.all([1, 2, 3].map(() => assign(admin, priya, { client_request_id: 'press-1' })));
    expect(new Set(raced.map((r) => r.id)).size).toBe(1);
    expect(await EmployeeTargetModel.countDocuments()).toBe(1);
  });

  it('only assigns to active employees, and validates the goals', async () => {
    const admin = await person('Asha', ['TARGETS_MANAGER']);
    const member = await person('Mo', ['USER']);
    const leaver = await person('Lee', ['EMPLOYEE'], 'INACTIVE');
    const priya = await person('Priya', ['EMPLOYEE']);
    const bad = { extensions: { code: 'BAD_USER_INPUT' } };
    await expect(assign(admin, member)).rejects.toMatchObject({ ...bad, message: 'Choose an active employee' });
    await expect(assign(admin, leaver)).rejects.toMatchObject(bad);
    await expect(assign(admin, priya, { goals: [] })).rejects.toMatchObject(bad);
    await expect(assign(admin, priya, { month: '2026-13' })).rejects.toMatchObject(bad);
    expect(await EmployeeTargetModel.countDocuments()).toBe(0);
  });

  it('offers only active employees to the picker, searchable by name or email', async () => {
    const admin = await person('Asha', ['TARGETS_MANAGER']);
    const priya = await person('Priya', ['EMPLOYEE']);
    await person('Lee', ['EMPLOYEE'], 'INACTIVE');
    await person('Mo', ['USER']);
    const all = await Q.targetAssignableEmployees({}, {}, admin);
    expect(all).toEqual([{ id: priya.user!.id, name: 'Priya Rao', email: priya.user!.email, photo: null }]);
    expect(await Q.targetAssignableEmployees({}, { search: 'pri' }, admin)).toHaveLength(1);
    expect(await Q.targetAssignableEmployees({}, { search: 'nobody' }, admin)).toEqual([]);
  });
});

describe('the employee’s side', () => {
  it('lists and opens only the caller’s own targets', async () => {
    const admin = await person('Asha', ['TARGETS_MANAGER']);
    const priya = await person('Priya', ['EMPLOYEE']);
    const ravi = await person('Ravi', ['EMPLOYEE']);
    const mine = await assign(admin, priya);
    const theirs = await assign(admin, ravi);

    const page = await Q.myEmployeeTargetsTable({}, {}, priya);
    expect(page.rows.map((r: { id: string }) => r.id)).toEqual([mine.id]);
    expect(page.total).toBe(1);
    await expect(Q.myEmployeeTarget({}, { id: theirs.id }, priya)).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
    await expect(submit(priya, theirs.id, 0)).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
    expect((await EmployeeTargetModel.findById(theirs.id).lean())!.status).toBe('ASSIGNED');
  });

  it('records a report, lets the employee correct it, and counts the submissions', async () => {
    const admin = await person('Asha', ['TARGETS_MANAGER']);
    const priya = await person('Priya', ['EMPLOYEE']);
    const target = await assign(admin, priya);

    const first = await submit(priya, target.id, 0);
    expect(first).toMatchObject({
      status: 'SUBMITTED',
      revision: 1,
      submission: {
        completion_percent: 80,
        achievements: [{ title: 'Signed 32 venues', details: 'Indiranagar and HSR' }],
        updates: 'Two more in legal review',
        submission_count: 1,
      },
    });
    const second = await submit(priya, target.id, 1, { completion_percent: 100 });
    expect(second.submission).toMatchObject({ completion_percent: 100, submission_count: 2 });
    await expect(submit(priya, target.id, 0)).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });
  });

  it('refuses an out-of-range percent and an empty achievement list, writing nothing', async () => {
    const admin = await person('Asha', ['TARGETS_MANAGER']);
    const priya = await person('Priya', ['EMPLOYEE']);
    const target = await assign(admin, priya);
    const bad = { extensions: { code: 'BAD_USER_INPUT' } };
    await expect(submit(priya, target.id, 0, { completion_percent: 120 })).rejects.toMatchObject(bad);
    await expect(submit(priya, target.id, 0, { achievements: [] })).rejects.toMatchObject(bad);
    expect((await EmployeeTargetModel.findById(target.id).lean())!.submission).toBeNull();
  });
});

describe('review', () => {
  it('reviews only a submitted report, locks it, and can hand it back', async () => {
    const admin = await person('Asha', ['TARGETS_MANAGER']);
    const priya = await person('Priya', ['EMPLOYEE']);
    const target = await assign(admin, priya);
    const review = (revision: number) =>
      M.reviewEmployeeTarget({}, { id: target.id, input: { comment: 'Great month', expected_revision: revision } }, admin);

    await expect(review(0)).rejects.toMatchObject({ extensions: { code: 'BAD_REQUEST' } });
    await submit(priya, target.id, 0);
    const reviewed = await review(1);
    expect(reviewed).toMatchObject({
      status: 'REVIEWED',
      review: { comment: 'Great month', reviewed_by: { user_id: admin.user!.id } },
    });
    await expect(submit(priya, reviewed.id, reviewed.revision)).rejects.toMatchObject({ extensions: { code: 'BAD_REQUEST' } });

    const reopened = await M.reopenEmployeeTarget({}, { id: target.id, expected_revision: reviewed.revision }, admin);
    expect(reopened).toMatchObject({ status: 'SUBMITTED', review: null });
    await expect(submit(priya, target.id, reopened.revision)).resolves.toMatchObject({ status: 'SUBMITTED' });
  });

  it('lets goals change only before the employee reports, and refuses a stale edit', async () => {
    const admin = await person('Asha', ['TARGETS_MANAGER']);
    const priya = await person('Priya', ['EMPLOYEE']);
    const target = await assign(admin, priya);
    const edit = (revision: number) =>
      M.updateEmployeeTarget({}, { id: target.id, input: { goals: [{ title: 'New goal' }], expected_revision: revision } }, admin);

    const edited = await edit(0);
    expect(edited).toMatchObject({ goals: [{ title: 'New goal', description: '', target_value: null, unit: '' }], revision: 1 });
    expect(edited.last_edited_by).toMatchObject({ user_id: admin.user!.id });
    await expect(edit(0)).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });
    await submit(priya, target.id, 1);
    await expect(edit(2)).rejects.toMatchObject({ extensions: { code: 'BAD_REQUEST' } });
  });
});

describe('who may use it', () => {
  it('keeps the console operations to Targets seats and the employee ones to employees', async () => {
    const admin = await person('Asha', ['TARGETS_MANAGER']);
    const priya = await person('Priya', ['EMPLOYEE']);
    const member = await person('Mo', ['USER']);
    const forbidden = { extensions: { code: 'FORBIDDEN' } };
    await expect(assign(priya, priya)).rejects.toMatchObject(forbidden);
    await expect(Q.employeeTargetsTable({}, {}, priya)).rejects.toMatchObject(forbidden);
    await expect(Q.myEmployeeTargetsTable({}, {}, admin)).rejects.toMatchObject(forbidden);
    await expect(Q.myDueEmployeeTargets({}, {}, member)).rejects.toMatchObject(forbidden);
    await expect(Q.employeeTargetsTable({}, {}, makeContext(null))).rejects.toMatchObject({
      extensions: { code: 'UNAUTHENTICATED' },
    });
    await expect(Q.employeeTargetsTable({}, {}, await person('Sam', ['SUPER_ADMIN']))).resolves.toMatchObject({ total: 0 });
  });

  it('clamps the reminder settings to their bounds', async () => {
    const admin = await person('Asha', ['TARGETS_MANAGER']);
    expect(await Q.employeeTargetSettings({}, {}, admin)).toMatchObject({
      reminders_enabled: true,
      reminder_days_before_end: 3,
      reminder_grace_days: 3,
    });
    const saved = await M.updateEmployeeTargetSettings(
      {},
      { input: { reminders_enabled: false, reminder_days_before_end: 40, reminder_grace_days: -2 } },
      admin
    );
    expect(saved).toMatchObject({ reminders_enabled: false, reminder_days_before_end: 15, reminder_grace_days: 0 });
  });
});
