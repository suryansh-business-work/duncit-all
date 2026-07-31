import { Types } from 'mongoose';
import { audienceService } from '../../audience.service';
import { UserModel } from '@modules/access/user/user.model';
import { UserInterestModel } from '@modules/access/user/relations/userInterest.model';
import { CategoryModel } from '@modules/pods/category/category.model';
import {
  ExpoPushTokenModel,
  PushSubscriptionModel,
} from '@modules/engagement/notification/notification.model';

let seq = 0;

/** Birthdate of somebody who turned `age` a month ago (safely inside the band). */
function dobAged(age: number) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - age);
  d.setMonth(d.getMonth() - 1);
  return d;
}

async function seedUser(over: Record<string, any> = {}) {
  seq += 1;
  const { profile, auth, metadata, communication, ...rest } = over;
  return UserModel.create({
    auth: { email: `aud${seq}@x.com`, is_email_verified: false, ...auth },
    profile: { first_name: 'Ana', last_name: `Row${seq}`, city: 'Pune', ...profile },
    metadata: { status: 'ACTIVE', role_keys: ['USER'], ...metadata },
    communication: { whatsapp: { number: '', extension: '', verified_at: null, ...communication?.whatsapp } },
    ...rest,
  });
}

const rowsOf = async (filters?: any[]) => {
  const page = await audienceService.table(filters ? { filters } : null);
  return page.rows;
};
const namesOf = async (filters?: any[]) => (await rowsOf(filters)).map((r) => r.full_name).sort((a, b) => a.localeCompare(b));

describe('audienceService.table', () => {
  it('returns a slim row: derived age, no birthdate, no payout config, no postal address', async () => {
    await seedUser({
      profile: { first_name: 'Ravi', last_name: 'K', dob: dobAged(30), city: 'Pune', state: 'MH', locale: 'en-IN' },
      auth: { email: 'ravi@x.com', is_email_verified: true },
      finance: { host_commission_pct: 42 },
    });

    const [row] = await rowsOf();
    expect(row.full_name).toBe('Ravi K');
    expect(row.age).toBe(30);
    expect(row.email).toBe('ravi@x.com');
    expect(row.email_verified).toBe(true);
    expect(row.city).toBe('Pune');
    expect(row.roles).toEqual(['USER']);
    expect(row.push_platforms).toEqual([]);
    expect(row).not.toHaveProperty('dob');
    expect(row).not.toHaveProperty('finance');
    expect(row).not.toHaveProperty('address');
  });

  it('reports a null age for an account that never supplied a birthdate', async () => {
    await seedUser({ profile: { first_name: 'NoDob', last_name: 'X' } });
    expect((await rowsOf())[0].age).toBeNull();
  });

  // A campaign must never reach a closed account. usersTable does not do this.
  it('always excludes soft-deleted accounts', async () => {
    await seedUser({ profile: { first_name: 'Live', last_name: 'One' } });
    await seedUser({ profile: { first_name: 'Gone', last_name: 'Two' }, metadata: { deleted_at: new Date() } });
    expect(await namesOf()).toEqual(['Live One']);
  });

  describe('age filter', () => {
    beforeEach(async () => {
      await seedUser({ profile: { first_name: 'Young', last_name: 'A', dob: dobAged(19) } });
      await seedUser({ profile: { first_name: 'Mid', last_name: 'B', dob: dobAged(30) } });
      await seedUser({ profile: { first_name: 'Older', last_name: 'C', dob: dobAged(55) } });
      await seedUser({ profile: { first_name: 'Unknown', last_name: 'D' } });
    });

    it('filters a between range inclusively at both ends', async () => {
      expect(await namesOf([{ field: 'age', op: 'between', values: ['19', '30'] }])).toEqual([
        'Mid B',
        'Young A',
      ]);
    });

    it('filters a minimum age with gte', async () => {
      expect(await namesOf([{ field: 'age', op: 'gte', value: '30' }])).toEqual(['Mid B', 'Older C']);
    });

    it('filters a maximum age with lte', async () => {
      expect(await namesOf([{ field: 'age', op: 'lte', value: '30' }])).toEqual(['Mid B', 'Young A']);
    });

    it('filters one exact age with eq', async () => {
      expect(await namesOf([{ field: 'age', op: 'eq', value: '30' }])).toEqual(['Mid B']);
    });

    it('drops an unusable age filter rather than returning nothing', async () => {
      expect(await namesOf([{ field: 'age', op: 'contains', value: '30' }])).toHaveLength(4);
      expect(await namesOf([{ field: 'age', op: 'gte', value: 'abc' }])).toHaveLength(4);
      expect(await namesOf([{ field: 'age', op: 'between', values: ['', ''] }])).toHaveLength(4);
      expect(await namesOf([{ field: 'age', op: 'between' }])).toHaveLength(4);
      expect(await namesOf([{ field: 'age', op: 'gte' }])).toHaveLength(4);
      expect(await namesOf([{ field: 'age', op: 'gte', value: '-5' }])).toHaveLength(4);
    });
  });

  describe('whatsapp filter', () => {
    beforeEach(async () => {
      await seedUser({ profile: { first_name: 'Wa', last_name: 'Yes' }, communication: { whatsapp: { verified_at: new Date() } } });
      await seedUser({ profile: { first_name: 'Wa', last_name: 'No' } });
    });

    it('matches only verified WhatsApp numbers', async () => {
      expect(await namesOf([{ field: 'whatsapp', op: 'is_true' }])).toEqual(['Wa Yes']);
    });

    it('matches only unverified ones', async () => {
      expect(await namesOf([{ field: 'whatsapp', op: 'is_false' }])).toEqual(['Wa No']);
    });

    it('ignores an op it cannot express', async () => {
      expect(await namesOf([{ field: 'whatsapp', op: 'eq', value: 'x' }])).toHaveLength(2);
    });
  });

  describe('push reachability', () => {
    let android: any;
    let ios: any;
    let web: any;

    beforeEach(async () => {
      android = await seedUser({ profile: { first_name: 'Push', last_name: 'Android' } });
      ios = await seedUser({ profile: { first_name: 'Push', last_name: 'Ios' } });
      web = await seedUser({ profile: { first_name: 'Push', last_name: 'Web' } });
      await seedUser({ profile: { first_name: 'Push', last_name: 'None' } });
      await ExpoPushTokenModel.create({ user_id: android._id, token: `t-a-${seq}`, platform: 'android' });
      // Two devices on one account must not duplicate the person.
      await ExpoPushTokenModel.create({ user_id: android._id, token: `t-a2-${seq}`, platform: 'android' });
      await ExpoPushTokenModel.create({ user_id: ios._id, token: `t-i-${seq}`, platform: 'ios' });
      await PushSubscriptionModel.create({ user_id: web._id, endpoint: `e-${seq}`, p256dh: 'p', auth: 'a' });
    });

    it('filters by each platform', async () => {
      expect(await namesOf([{ field: 'push_platform', op: 'eq', value: 'ANDROID' }])).toEqual(['Push Android']);
      expect(await namesOf([{ field: 'push_platform', op: 'eq', value: 'IOS' }])).toEqual(['Push Ios']);
      expect(await namesOf([{ field: 'push_platform', op: 'eq', value: 'WEB' }])).toEqual(['Push Web']);
    });

    it('filters reachable-on-anything and reachable-on-nothing', async () => {
      expect(await namesOf([{ field: 'push_platform', op: 'eq', value: 'ANY' }])).toEqual([
        'Push Android',
        'Push Ios',
        'Push Web',
      ]);
      expect(await namesOf([{ field: 'push_platform', op: 'eq', value: 'NONE' }])).toEqual(['Push None']);
    });

    it('ignores an unknown platform and a missing value', async () => {
      expect(await namesOf([{ field: 'push_platform', op: 'eq', value: 'BLACKBERRY' }])).toHaveLength(4);
      expect(await namesOf([{ field: 'push_platform', op: 'eq' }])).toHaveLength(4);
    });

    it('reports the platforms per row, deduped across a users devices', async () => {
      const rows = await rowsOf();
      const byName = new Map(rows.map((r) => [r.full_name, r.push_platforms]));
      expect(byName.get('Push Android')).toEqual(['ANDROID']);
      expect(byName.get('Push Web')).toEqual(['WEB']);
      expect(byName.get('Push None')).toEqual([]);
    });

    // One person, phone + browser. Android and iOS are not disjoint sets.
    it('lists every platform a person is reachable on, sorted', async () => {
      const multi = await seedUser({ profile: { first_name: 'Multi', last_name: 'Device' } });
      await ExpoPushTokenModel.create({ user_id: multi._id, token: `t-m-${seq}`, platform: 'ios' });
      await PushSubscriptionModel.create({ user_id: multi._id, endpoint: `e-m-${seq}`, p256dh: 'p', auth: 'a' });

      const rows = await rowsOf();
      expect(rows.find((r) => r.full_name === 'Multi Device')?.push_platforms).toEqual(['IOS', 'WEB']);
      // …and they match on either platform filter.
      expect(await namesOf([{ field: 'push_platform', op: 'eq', value: 'IOS' }])).toContain('Multi Device');
      expect(await namesOf([{ field: 'push_platform', op: 'eq', value: 'WEB' }])).toContain('Multi Device');
    });

    it('labels a token stored without a platform rather than dropping it', async () => {
      const ghost = await seedUser({ profile: { first_name: 'Push', last_name: 'Ghost' } });
      await ExpoPushTokenModel.create({ user_id: ghost._id, token: `t-g-${seq}` });
      const rows = await rowsOf();
      expect(rows.find((r) => r.full_name === 'Push Ghost')?.push_platforms).toEqual(['UNKNOWN']);
    });
  });

  describe('interest filter', () => {
    it('matches anyone following any of the chosen categories', async () => {
      const music = await CategoryModel.create({ name: 'Music', slug: 'music-a', level: 'SUPER', parent_id: null });
      const sport = await CategoryModel.create({ name: 'Sport', slug: 'sport-a', level: 'SUPER', parent_id: null });
      const fan = await seedUser({ profile: { first_name: 'Fan', last_name: 'One' } });
      await seedUser({ profile: { first_name: 'Nofan', last_name: 'Two' } });
      await UserInterestModel.create({ user_id: fan._id, interest_category_id: music._id });

      expect(await namesOf([{ field: 'interest_category', op: 'in', values: [String(music._id), String(sport._id)] }])).toEqual(['Fan One']);
      expect(await namesOf([{ field: 'interest_category', op: 'eq', value: String(music._id) }])).toEqual(['Fan One']);
    });

    it('drops the filter when no usable category id was given', async () => {
      await seedUser({ profile: { first_name: 'Any', last_name: 'One' } });
      expect(await namesOf([{ field: 'interest_category', op: 'in', values: ['not-an-id'] }])).toHaveLength(1);
      expect(await namesOf([{ field: 'interest_category', op: 'in', values: [] }])).toHaveLength(1);
      expect(await namesOf([{ field: 'interest_category', op: 'in' }])).toHaveLength(1);
      expect(await namesOf([{ field: 'interest_category', op: 'eq' }])).toHaveLength(1);
    });

    // Push and interest both narrow by _id — the second must not overwrite the
    // first, or a two-axis segment silently widens to a one-axis one.
    it('intersects with the push filter instead of replacing it', async () => {
      const music = await CategoryModel.create({ name: 'Music', slug: 'music-b', level: 'SUPER', parent_id: null });
      const both = await seedUser({ profile: { first_name: 'Both', last_name: 'Axes' } });
      const interestOnly = await seedUser({ profile: { first_name: 'Interest', last_name: 'Only' } });
      const pushOnly = await seedUser({ profile: { first_name: 'Push', last_name: 'Only' } });
      await UserInterestModel.create({ user_id: both._id, interest_category_id: music._id });
      await UserInterestModel.create({ user_id: interestOnly._id, interest_category_id: music._id });
      await ExpoPushTokenModel.create({ user_id: both._id, token: `t-b-${seq}`, platform: 'android' });
      await ExpoPushTokenModel.create({ user_id: pushOnly._id, token: `t-p-${seq}`, platform: 'android' });

      expect(
        await namesOf([
          { field: 'push_platform', op: 'eq', value: 'ANDROID' },
          { field: 'interest_category', op: 'eq', value: String(music._id) },
        ]),
      ).toEqual(['Both Axes']);
    });
  });

  it('passes plain field filters and search through to the shared engine', async () => {
    await seedUser({ profile: { first_name: 'Pune', last_name: 'Person', city: 'Pune' } });
    await seedUser({ profile: { first_name: 'Delhi', last_name: 'Person', city: 'Delhi' }, metadata: { status: 'SUSPENDED' } });

    expect(await namesOf([{ field: 'city', op: 'eq', value: 'Delhi' }])).toEqual(['Delhi Person']);
    expect(await namesOf([{ field: 'status', op: 'eq', value: 'SUSPENDED' }])).toEqual(['Delhi Person']);
    const searched = await audienceService.table({ search: 'Pune' });
    expect(searched.rows.map((r) => r.full_name)).toEqual(['Pune Person']);
  });

  it('combines a translated filter with a plain one', async () => {
    await seedUser({ profile: { first_name: 'Match', last_name: 'Me', city: 'Pune', dob: dobAged(25) } });
    await seedUser({ profile: { first_name: 'Wrong', last_name: 'City', city: 'Delhi', dob: dobAged(25) } });
    await seedUser({ profile: { first_name: 'Wrong', last_name: 'Age', city: 'Pune', dob: dobAged(60) } });

    expect(
      await namesOf([
        { field: 'city', op: 'eq', value: 'Pune' },
        { field: 'age', op: 'between', values: ['20', '30'] },
      ]),
    ).toEqual(['Match Me']);
  });

  it('paginates with the shared clamps', async () => {
    await Promise.all([1, 2, 3].map((n) => seedUser({ profile: { first_name: 'P', last_name: `Page${n}` } })));
    const page = await audienceService.table({ page: 1, page_size: 2 });
    expect(page.rows).toHaveLength(2);
    expect(page.total).toBe(3);
    expect(page.page_size).toBe(2);
  });
});

describe('audienceService.filterOptions', () => {
  it('has no interests when nobody follows anything', async () => {
    await seedUser();
    expect(await audienceService.filterOptions()).toEqual({ interests: [], roles: ['USER'] });
  });

  it('lists only categories somebody actually follows, by name', async () => {
    const rock = await CategoryModel.create({ name: 'Rock', slug: 'rock-o', level: 'SUPER', parent_id: null });
    const jazz = await CategoryModel.create({ name: 'Jazz', slug: 'jazz-o', level: 'SUPER', parent_id: null });
    await CategoryModel.create({ name: 'Unloved', slug: 'unloved-o', level: 'SUPER', parent_id: null });
    const u = await seedUser();
    await UserInterestModel.create({ user_id: u._id, interest_category_id: rock._id });
    await UserInterestModel.create({ user_id: new Types.ObjectId(), interest_category_id: jazz._id });

    expect((await audienceService.filterOptions()).interests).toEqual([
      { id: String(jazz._id), name: 'Jazz' },
      { id: String(rock._id), name: 'Rock' },
    ]);
  });

  // Offering a role nobody holds is a filter that can only return nothing.
  it('lists only role keys somebody in the audience actually holds, sorted', async () => {
    await seedUser({ metadata: { role_keys: ['USER', 'HOST'] } });
    await seedUser({ metadata: { role_keys: ['USER'] } });
    await seedUser({ metadata: { role_keys: ['ADS_MANAGER'], deleted_at: new Date() } });

    expect((await audienceService.filterOptions()).roles).toEqual(['HOST', 'USER']);
  });
});
