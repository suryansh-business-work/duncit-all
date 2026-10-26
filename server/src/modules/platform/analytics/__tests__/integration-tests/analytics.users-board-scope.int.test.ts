import { Types } from 'mongoose';
import { makeContext } from '@test/harness';
import { UserModel } from '@modules/access/user/user.model';
import { ActiveUserPingModel } from '../../activeUser.model';
import { entityAnalyticsResolvers } from '../../entity/entityAnalytics.resolver';

/**
 * The Users page — also Admin's Users Dashboard — against a real database: a
 * City Admin counts only the members of their own city, a Super Admin counts
 * the platform, and a City Admin with no city is refused rather than shown
 * every city (rbac `readScope`, as the dashboard totals do).
 */

const { entityAnalytics } = entityAnalyticsResolvers.Query;

type Board = { kpis: Array<{ key: string; value: number }> };

const reader = (roles: string[], extra: { assigned_city?: string } = {}) =>
  makeContext({ id: new Types.ObjectId().toHexString(), roles: ['USER', ...roles], ...extra });

const read = async (ctx: ReturnType<typeof makeContext>) => {
  const board = (await entityAnalytics(null, { entity: 'USERS', days: 30 }, ctx)) as Board;
  return new Map(board.kpis.map((tile) => [tile.key, tile.value]));
};

const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

/** A member of `city`, seen by the app yesterday on their own device. */
async function member(city: string, tag: string) {
  const user = await UserModel.create({ auth: { email: `${tag}@example.com` }, profile: { first_name: 'Member', city } });
  await ActiveUserPingModel.create({ device_id: `device-${tag}`, user_id: user._id, date_ymd: yesterday, hits: 1 });
  return user;
}

beforeEach(async () => {
  await member('Pune', 'pune-1');
  await member('Pune', 'pune-2');
  await member('Delhi', 'delhi-1');
  // A signed-out visitor belongs to no city.
  await ActiveUserPingModel.create({ device_id: 'device-visitor', user_id: null, date_ymd: yesterday, hits: 1 });
});

describe('Users board place scope', () => {
  it('counts only the City Admin city — members, active members and their devices', async () => {
    const tiles = await read(reader(['CITY_ADMIN'], { assigned_city: 'Pune' }));
    expect(tiles.get('users_total')).toBe(2);
    expect(tiles.get('active_users')).toBe(2);
    expect(tiles.get('active_devices')).toBe(2);
  });

  it('still counts the whole platform for a Super Admin, signed-out devices included', async () => {
    const tiles = await read(reader(['SUPER_ADMIN']));
    expect(tiles.get('users_total')).toBe(3);
    expect(tiles.get('active_users')).toBe(3);
    expect(tiles.get('active_devices')).toBe(4);
  });

  it('counts nothing for a city with no members', async () => {
    const tiles = await read(reader(['CITY_ADMIN'], { assigned_city: 'Jaipur' }));
    expect(tiles.get('users_total')).toBe(0);
    expect(tiles.get('active_users')).toBe(0);
  });

  it('refuses a City Admin with no city instead of showing every city', async () => {
    await expect(read(reader(['CITY_ADMIN']))).rejects.toMatchObject({
      message: 'Out of city scope',
      extensions: { code: 'FORBIDDEN' },
    });
  });
});
