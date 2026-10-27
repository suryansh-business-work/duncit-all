import { Types } from 'mongoose';
import { makeContext } from '@test/harness';
import { UserModel } from '../../user.model';
import { userResolvers } from '../../user.resolver';

/**
 * Admin > Users (`usersTable`) is narrowed to the place a city or zonal admin
 * is responsible for, through the resolver and a real database: the rows, the
 * total and the client's own filters all stay inside it, and an admin with no
 * place assigned is refused rather than shown everybody.
 */

const { usersTable } = userResolvers.Query;

interface Page {
  rows: Array<{ email: string; city: string | null }>;
  total: number;
}

const read = (ctx: ReturnType<typeof makeContext>, query: Record<string, unknown> = {}) =>
  usersTable(null, { query: { page_size: 50, ...query } }, ctx) as Promise<Page>;

async function member(email: string, city: string, zone = '') {
  await UserModel.create({ auth: { email }, profile: { first_name: 'Member', city, zone } });
}

const cityAdmin = (assigned_city: string | null) =>
  makeContext({ id: new Types.ObjectId().toHexString(), roles: ['USER', 'CITY_ADMIN'], assigned_city });

beforeEach(async () => {
  await member('pune-1@example.com', 'Pune', 'Pune West');
  await member('pune-2@example.com', 'Pune', 'Pune East');
  await member('delhi-1@example.com', 'Delhi', 'Delhi North');
});

const emails = (page: Page) => page.rows.map((row) => row.email).sort((a, b) => a.localeCompare(b));

describe('usersTable read scope', () => {
  it('shows a CITY_ADMIN only the members of their city, and counts only them', async () => {
    const page = await read(cityAdmin('Pune'));
    expect(emails(page)).toEqual(['pune-1@example.com', 'pune-2@example.com']);
    expect(page.total).toBe(2);
  });

  it('keeps a client filter for another city inside the admin city rather than widening it', async () => {
    const page = await read(cityAdmin('Pune'), {
      filters: [{ field: 'city', op: 'eq', value: 'Delhi' }],
    });
    expect(page.rows).toEqual([]);
    expect(page.total).toBe(0);
  });

  it('refuses a CITY_ADMIN with no city assigned instead of showing every city', async () => {
    await expect(read(cityAdmin(null))).rejects.toMatchObject({
      message: 'Out of city scope',
      extensions: { code: 'FORBIDDEN' },
    });
  });

  it('shows a ZONAL_ADMIN only their zones and refuses one with none', async () => {
    const zonal = (zones: string[]) =>
      makeContext({ id: new Types.ObjectId().toHexString(), roles: ['USER', 'ZONAL_ADMIN'], assigned_zones: zones });
    expect(emails(await read(zonal(['Pune East', 'Delhi North'])))).toEqual(['delhi-1@example.com', 'pune-2@example.com']);
    await expect(read(zonal([]))).rejects.toMatchObject({ message: 'Out of zone scope' });
  });

  it('leaves SUPER_ADMIN and SUPPORT_USER with the whole directory', async () => {
    for (const roles of [['USER', 'SUPER_ADMIN'], ['USER', 'SUPPORT_USER']]) {
      const page = await read(makeContext({ id: new Types.ObjectId().toHexString(), roles }));
      expect(page.total).toBe(3);
    }
  });
});

describe('the other directory reads keep the same scope', () => {
  const { users, partnersTable, user } = userResolvers.Query;

  const usersOf = async (ctx: ReturnType<typeof makeContext>, filter: Record<string, unknown> = {}) =>
    ((await users(null, { filter }, ctx)) as Array<{ email: string }>).map((row) => row.email).sort((a, b) => a.localeCompare(b));

  async function partner(email: string, city: string) {
    const doc = await UserModel.create({
      auth: { email },
      profile: { first_name: 'Partner', city },
      metadata: { role_keys: ['USER', 'HOST'] },
    });
    return doc._id.toHexString();
  }

  it('users lists a CITY_ADMIN only their city, even when the filter names another', async () => {
    expect(await usersOf(cityAdmin('Pune'))).toEqual(['pune-1@example.com', 'pune-2@example.com']);
    expect(await usersOf(cityAdmin('Pune'), { city: 'Delhi' })).toEqual([]);
    expect(await usersOf(makeContext({ id: new Types.ObjectId().toHexString(), roles: ['USER', 'MARKETING_MANAGER'] }))).toHaveLength(3);
  });

  it('partnersTable shows a CITY_ADMIN only the partners of their city', async () => {
    await partner('host-pune@example.com', 'Pune');
    await partner('host-delhi@example.com', 'Delhi');
    const page = (await partnersTable(null, { query: { page_size: 50 } }, cityAdmin('Pune'))) as Page;
    expect(emails(page)).toEqual(['host-pune@example.com']);
    expect(page.total).toBe(1);

    const onboarding = makeContext({ id: new Types.ObjectId().toHexString(), roles: ['USER', 'ONBOARDING_MANAGER'] });
    expect(((await partnersTable(null, { query: { page_size: 50 } }, onboarding)) as Page).total).toBe(2);
  });

  it('user(id) reads a member of the admin city and refuses one of another city', async () => {
    const pune = await partner('read-pune@example.com', 'Pune');
    const delhi = await partner('read-delhi@example.com', 'Delhi');
    expect(await user(null, { user_id: pune }, cityAdmin('Pune'))).toMatchObject({ email: 'read-pune@example.com' });
    await expect(user(null, { user_id: delhi }, cityAdmin('Pune'))).rejects.toMatchObject({
      message: 'Out of city scope',
      extensions: { code: 'FORBIDDEN' },
    });
    const support = makeContext({ id: new Types.ObjectId().toHexString(), roles: ['USER', 'SUPPORT_USER'] });
    expect(await user(null, { user_id: delhi }, support)).toMatchObject({ email: 'read-delhi@example.com' });
  });
});
