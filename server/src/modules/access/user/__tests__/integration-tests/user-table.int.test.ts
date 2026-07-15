import { Types } from 'mongoose';
import { userService } from '../../user.service';
import { UserModel } from '../../user.model';
import { UserContactActionModel } from '../../userContactAction.model';

/** Insert a user directly with the nested storage shape (bypasses signup). */
async function seedUser(over: {
  first: string;
  last?: string;
  email: string;
  phone?: string;
  city?: string;
  roles?: string[];
  status?: string;
  created: string;
}) {
  const _id = new Types.ObjectId();
  await UserModel.collection.insertOne({
    _id,
    auth: { email: over.email, phone: { number: over.phone ?? '' } },
    profile: { first_name: over.first, last_name: over.last ?? '', city: over.city ?? null },
    metadata: {
      status: over.status ?? 'ACTIVE',
      role_keys: over.roles ?? ['USER'],
      created_at: new Date(over.created),
      updated_at: new Date(over.created),
    },
  } as never);
  return String(_id);
}

describe('userService.partnersTable integration', () => {
  it('lists only partner-role holders and narrows by the role filter', async () => {
    await seedUser({ first: 'Hosty', last: 'H', email: 'hosty@duncit.com', phone: '9990001111', city: 'Pune', roles: ['USER', 'HOST'], created: '2026-01-05' });
    await seedUser({ first: 'Venya', last: 'V', email: 'venya@duncit.com', phone: '9990001112', city: 'Pune', roles: ['USER', 'VENUE_OWNER'], created: '2026-01-06' });
    await seedUser({ first: 'Plain', last: 'P', email: 'plain@duncit.com', phone: '9990001113', city: 'Pune', roles: ['USER'], created: '2026-01-07' });

    const partners = await userService.partnersTable();
    expect(partners.total).toBe(2);
    expect(partners.rows.map((u) => u!.first_name).sort()).toEqual(['Hosty', 'Venya']);

    const hostsOnly = await userService.partnersTable({
      filters: [{ field: 'role', op: 'eq', value: 'HOST' }],
    });
    expect(hostsOnly.rows.map((u) => u!.first_name)).toEqual(['Hosty']);
  });
});

describe('userService.table (usersTable) integration', () => {
  it('serves the users table page with search, filters, sort and paging', async () => {
    await seedUser({ first: 'Alice', last: 'Anders', email: 'alice@duncit.com', phone: '9990000001', city: 'Delhi', created: '2026-01-01' });
    await seedUser({ first: 'Bob', last: 'Baker', email: 'bob@duncit.com', phone: '9990000002', city: 'Mumbai', roles: ['CITY_ADMIN'], created: '2026-02-01' });
    await seedUser({ first: 'Cara', last: 'Iyer', email: 'cara@duncit.com', phone: '9990000003', city: 'Delhi', status: 'SUSPENDED', created: '2026-03-01' });

    // Plain envelope: default sort is newest first (metadata.created_at desc).
    const all = await userService.table();
    expect(all.total).toBe(3);
    expect(all.rows.map((u) => u!.first_name)).toEqual(['Cara', 'Bob', 'Alice']);
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Search spans name, email and phone.
    const byName = await userService.table({ search: 'alice' });
    expect(byName.rows.map((u) => u!.first_name)).toEqual(['Alice']);
    expect(byName.total).toBe(1);
    const byPhone = await userService.table({ search: '9990000002' });
    expect(byPhone.rows.map((u) => u!.first_name)).toEqual(['Bob']);
    const byEmail = await userService.table({ search: 'cara@duncit.com' });
    expect(byEmail.rows.map((u) => u!.first_name)).toEqual(['Cara']);

    // Role / status / city filters map to the nested db paths.
    const admins = await userService.table({
      filters: [{ field: 'role', op: 'eq', value: 'CITY_ADMIN' }],
    });
    expect(admins.rows.map((u) => u!.first_name)).toEqual(['Bob']);
    const suspended = await userService.table({
      filters: [{ field: 'status', op: 'eq', value: 'SUSPENDED' }],
    });
    expect(suspended.rows.map((u) => u!.first_name)).toEqual(['Cara']);
    const delhi = await userService.table({
      filters: [{ field: 'city', op: 'eq', value: 'Delhi' }],
    });
    expect(delhi.total).toBe(2);

    // Allowlisted sort, both directions.
    const asc = await userService.table({ sort_by: 'first_name', sort_dir: 'asc' });
    expect(asc.rows.map((u) => u!.first_name)).toEqual(['Alice', 'Bob', 'Cara']);

    // Paging keeps total and reports the clamped page/page_size back.
    const page2 = await userService.table({ sort_by: 'first_name', sort_dir: 'asc', page: 2, page_size: 1 });
    expect(page2.rows.map((u) => u!.first_name)).toEqual(['Bob']);
    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
  });
});

describe('userService.contactActionsTable (userContactActionsTable) integration', () => {
  it('pages one user’s call/email log and never leaks another user’s rows', async () => {
    const userA = await seedUser({ first: 'Aditi', email: 'aditi@duncit.com', created: '2026-01-05' });
    const userB = await seedUser({ first: 'Bhavesh', email: 'bhavesh@duncit.com', created: '2026-01-06' });

    const insertAction = (over: Record<string, unknown>) =>
      UserContactActionModel.collection.insertOne({
        type: 'CALL',
        target: '',
        subject: '',
        notes: '',
        status: 'LOGGED',
        duration_seconds: 0,
        ...over,
      } as never);
    await insertAction({ user_id: new Types.ObjectId(userA), target: '+911111', notes: 'left voicemail', created_at: new Date('2026-02-01') });
    await insertAction({ user_id: new Types.ObjectId(userA), type: 'EMAIL', target: 'aditi@duncit.com', subject: 'Invoice follow-up', status: 'SENT', created_at: new Date('2026-02-02') });
    await insertAction({ user_id: new Types.ObjectId(userB), target: '+922222', notes: 'other user call', created_at: new Date('2026-02-03') });

    // The user_id baseFilter scopes the page — B's row is never visible for A.
    const forA = await userService.contactActionsTable(userA);
    expect(forA.total).toBe(2);
    expect(forA.rows.map((r) => r.target)).toEqual(['aditi@duncit.com', '+911111']); // newest first
    expect(forA.rows.every((r) => r.user_id === userA)).toBe(true);
    const forB = await userService.contactActionsTable(userB);
    expect(forB.total).toBe(1);
    expect(forB.rows[0].target).toBe('+922222');

    // A client filter cannot widen the scope past the baseFilter ($and-merged).
    const widened = await userService.contactActionsTable(userA, {
      filters: [{ field: 'status', op: 'ne', value: 'NOPE' }],
    });
    expect(widened.total).toBe(2);
    expect(widened.rows.every((r) => r.user_id === userA)).toBe(true);

    // Search spans target, subject and notes.
    const search = await userService.contactActionsTable(userA, { search: 'invoice' });
    expect(search.rows.map((r) => r.subject)).toEqual(['Invoice follow-up']);

    // Enum filter + allowlisted sort + paging.
    const calls = await userService.contactActionsTable(userA, {
      filters: [{ field: 'type', op: 'eq', value: 'CALL' }],
    });
    expect(calls.rows.map((r) => r.target)).toEqual(['+911111']);
    const page2 = await userService.contactActionsTable(userA, {
      sort_by: 'created_at',
      sort_dir: 'asc',
      page: 2,
      page_size: 1,
    });
    expect(page2.rows.map((r) => r.target)).toEqual(['aditi@duncit.com']);
    expect(page2.total).toBe(2);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
  });
});
