import { Types } from 'mongoose';
import { buildContext } from '@context';
import { makeContext, signToken } from '@test/harness';
import { UserModel } from '../../user.model';
import { userResolvers } from '../../user.resolver';
import { flushUserActivity, trackUserActivity } from '../../user.activity';

/**
 * Admin > Users "Last Activity" and "Platforms Used", against a real database:
 * what a signed-in request stores, that storing it is not a profile edit, and
 * how the users table and the staff-only fields read it back.
 */

const CREATED = new Date('2026-01-01T00:00:00.000Z');

async function member(email: string, activity?: { last_at: Date; platforms: string[] }) {
  const _id = new Types.ObjectId();
  await UserModel.collection.insertOne({
    _id,
    auth: { email },
    profile: { first_name: email.split('@')[0] },
    metadata: { status: 'ACTIVE', role_keys: ['USER'], created_at: CREATED, updated_at: CREATED },
    ...(activity ? { activity } : {}),
  } as never);
  return _id.toHexString();
}

interface StoredUser {
  activity?: { last_at?: Date; platforms?: string[] };
  metadata: { updated_at: Date };
}

async function stored(id: string): Promise<StoredUser> {
  const doc = await UserModel.collection.findOne<StoredUser>({ _id: new Types.ObjectId(id) });
  if (!doc) throw new Error(`account ${id} is missing`);
  return doc;
}

const superAdmin = () => makeContext({ roles: ['USER', 'SUPER_ADMIN'] });

describe('trackUserActivity against the database', () => {
  it('stores the time and the platform without touching the profile timestamps', async () => {
    const id = await member('asha@example.com');
    trackUserActivity(id, 'IOS', new Date('2026-11-22T05:05:00.000Z'));
    await flushUserActivity();

    const doc = await stored(id);
    expect(doc.activity).toEqual({ last_at: new Date('2026-11-22T05:05:00.000Z'), platforms: ['IOS'] });
    // Using the app is not editing the account.
    expect(doc.metadata.updated_at).toEqual(CREATED);
  });

  it('adds each new platform once and never moves the time backwards', async () => {
    const id = await member('bilal@example.com');
    trackUserActivity(id, 'WEB', new Date('2026-11-22T09:00:00.000Z'));
    // A slower process landing an older request afterwards must not win.
    trackUserActivity(id, 'ANDROID', new Date('2026-11-22T08:00:00.000Z'));
    await flushUserActivity();
    trackUserActivity(id, null, new Date('2026-11-22T07:00:00.000Z'));
    await flushUserActivity();

    const doc = await stored(id);
    expect(doc.activity?.last_at).toEqual(new Date('2026-11-22T09:00:00.000Z'));
    expect([...(doc.activity?.platforms ?? [])].sort((a, b) => a.localeCompare(b))).toEqual(['ANDROID', 'WEB']);
  });
});

describe('buildContext records the signed-in caller', () => {
  const response = { on: jest.fn(), writableFinished: false } as never;

  it('stamps an authenticated native request with the platform the app declares', async () => {
    const id = await member('chitra@example.com');
    const req = {
      headers: {
        authorization: `Bearer ${signToken({ id, roles: ['USER'] })}`,
        'x-duncit-surface': 'NATIVE',
        'x-duncit-platform': 'ANDROID',
      },
    } as never;

    const ctx = await buildContext({ req, res: response });
    await flushUserActivity();

    expect(ctx.user?.id).toBe(id);
    const doc = await stored(id);
    expect(doc.activity?.platforms).toEqual(['ANDROID']);
    expect(doc.activity?.last_at).toBeInstanceOf(Date);
  });

  it('records nothing for a signed-out request', async () => {
    const id = await member('dev@example.com');
    await buildContext({ req: { headers: { 'x-duncit-surface': 'MWEB' } } as never, res: response });
    await flushUserActivity();
    expect((await stored(id)).activity).toBeUndefined();
  });
});

describe('the users table reads activity', () => {
  let recent: string;
  let older: string;
  let never: string;

  beforeEach(async () => {
    recent = await member('recent@example.com', { last_at: new Date('2026-11-22T05:00:00.000Z'), platforms: ['IOS', 'WEB'] });
    older = await member('older@example.com', { last_at: new Date('2026-10-01T05:00:00.000Z'), platforms: ['ANDROID'] });
    never = await member('never@example.com');
  });

  const ids = (page: { rows: Array<{ user_id: string } | null> }) => page.rows.map((row) => row?.user_id);
  const read = (query: Record<string, unknown>) =>
    userResolvers.Query.usersTable(null, { query: { page_size: 50, ...query } }, superAdmin()) as Promise<{
      rows: Array<{ user_id: string } | null>;
      total: number;
    }>;

  it('sorts by Last Activity both ways, an account never seen last when newest comes first', async () => {
    expect(ids(await read({ sort_by: 'last_activity_at', sort_dir: 'desc' }))).toEqual([recent, older, never]);
    expect(ids(await read({ sort_by: 'last_activity_at', sort_dir: 'asc' }))).toEqual([never, older, recent]);
  });

  it('filters by a date range on Last Activity', async () => {
    const page = await read({
      filters: [{ field: 'last_activity_at', op: 'gte', value: '2026-11-01T00:00:00.000Z' }],
    });
    expect(ids(page)).toEqual([recent]);
  });

  it('filters by any of the picked platforms', async () => {
    const page = await read({ filters: [{ field: 'platforms_used', op: 'in', values: ['ANDROID', 'WEB'] }] });
    expect([...ids(page)].sort()).toEqual([recent, older].sort());
    expect(page.total).toBe(2);
  });

  it('serves both fields to staff, batched per page, in display order', async () => {
    const ctx = superAdmin();
    const { last_activity_at, platforms_used } = userResolvers.User;
    expect(await last_activity_at({ user_id: recent }, {}, ctx)).toBe('2026-11-22T05:00:00.000Z');
    expect(await platforms_used({ user_id: recent }, {}, ctx)).toEqual(['IOS', 'WEB']);
    expect(await last_activity_at({ user_id: never }, {}, ctx)).toBeNull();
    expect(await platforms_used({ user_id: never }, {}, ctx)).toEqual([]);
  });

  it('answers an account that no longer exists as never seen', async () => {
    const ctx = superAdmin();
    const gone = new Types.ObjectId().toHexString();
    expect(await userResolvers.User.last_activity_at({ user_id: gone }, {}, ctx)).toBeNull();
    expect(await userResolvers.User.platforms_used({ user_id: 'not-an-id' }, {}, ctx)).toEqual([]);
  });

  it('refuses both fields to anyone who is not staff', async () => {
    const plainMember = makeContext({ id: recent, roles: ['USER'] });
    await expect(userResolvers.User.last_activity_at({ user_id: recent }, {}, plainMember)).rejects.toMatchObject({
      extensions: { code: 'FORBIDDEN' },
    });
    await expect(userResolvers.User.platforms_used({ user_id: recent }, {}, plainMember)).rejects.toMatchObject({
      extensions: { code: 'FORBIDDEN' },
    });
  });
});
