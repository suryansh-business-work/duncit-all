import { audienceListService } from '../../audienceList.service';
import { AudienceListModel } from '../../audienceList.model';
import { UserModel } from '@modules/access/user/user.model';

let seq = 0;

async function seedUser(city: string) {
  seq += 1;
  return UserModel.create({
    auth: { email: `list${seq}@x.com` },
    profile: { first_name: 'Ana', last_name: `L${seq}`, city },
    metadata: { status: 'ACTIVE', role_keys: ['USER'] },
  });
}

const puneOnly = [{ field: 'city', op: 'eq', value: 'Pune' }];

describe('audienceListService', () => {
  it('saves the criteria and reports how many people match them right now', async () => {
    await seedUser('Pune');
    await seedUser('Pune');
    await seedUser('Delhi');

    const created = await audienceListService.create({
      name: '  Pune regulars  ',
      description: '  Everyone browsing Pune  ',
      owner: '  Asha  ',
      filters: puneOnly,
      search: '',
    });

    expect(created.name).toBe('Pune regulars');
    expect(created.description).toBe('Everyone browsing Pune');
    expect(created.owner).toBe('Asha');
    expect(created.member_count).toBe(2);
    expect(created.filters).toEqual([{ field: 'city', op: 'eq', value: 'Pune', values: [] }]);
    expect(created.owner_user_id).toBeNull();
  });

  it('links the owner to a real account when one was picked', async () => {
    const staff = await seedUser('Pune');
    const list = await audienceListService.create({
      name: 'Owned',
      owner: 'Asha',
      owner_user_id: String(staff._id),
    });
    expect(list.owner_user_id).toBe(String(staff._id));

    const reread = await audienceListService.get(list.id);
    expect(reread?.owner_user_id).toBe(String(staff._id));
  });

  // The whole point of storing criteria instead of people: a signup that
  // matches tomorrow is in the list tomorrow, with no rebuild.
  it('recounts on every read, so a new matching signup joins the list', async () => {
    await seedUser('Pune');
    const created = await audienceListService.create({ name: 'Pune', owner: 'Asha', filters: puneOnly });
    expect(created.member_count).toBe(1);

    await seedUser('Pune');
    expect((await audienceListService.get(created.id))?.member_count).toBe(2);
  });

  it('counts an unfiltered list as everybody', async () => {
    await seedUser('Pune');
    await seedUser('Delhi');
    const all = await audienceListService.create({ name: 'Everyone', owner: 'Asha' });
    expect(all.member_count).toBe(2);
    expect(all.filters).toEqual([]);
    expect(all.description).toBe('');
    expect(all.search).toBe('');
  });

  it('applies a saved search alongside the saved filters', async () => {
    await seedUser('Pune');
    const list = await audienceListService.create({
      name: 'Named',
      owner: 'Asha',
      filters: puneOnly,
      search: 'Ana',
    });
    expect(list.member_count).toBe(1);

    const missing = await audienceListService.create({
      name: 'Nobody',
      owner: 'Asha',
      filters: puneOnly,
      search: 'Zebediah',
    });
    expect(missing.member_count).toBe(0);
  });

  it('stores a multi-value criterion', async () => {
    await seedUser('Pune');
    await seedUser('Delhi');
    const list = await audienceListService.create({
      name: 'Two cities',
      owner: 'Asha',
      filters: [{ field: 'city', op: 'in', values: ['Pune', 'Delhi'] }],
    });
    expect(list.member_count).toBe(2);
    expect(list.filters[0].values).toEqual(['Pune', 'Delhi']);
  });

  it('records who created it, ignoring a missing or malformed id', async () => {
    const creator = await seedUser('Pune');
    const owned = await audienceListService.create(
      { name: 'Owned', owner: 'Asha' },
      String(creator._id),
    );
    expect(String((await AudienceListModel.findById(owned.id))?.created_by)).toBe(String(creator._id));

    const bad = await audienceListService.create({ name: 'X', owner: 'Asha' }, 'not-an-id');
    expect((await AudienceListModel.findById(bad.id))?.created_by).toBeNull();

    const anon = await audienceListService.create({ name: 'Y', owner: 'Asha' }, null);
    expect((await AudienceListModel.findById(anon.id))?.created_by).toBeNull();
  });

  it('rejects a list with no name or no owner', async () => {
    await expect(audienceListService.create({ name: '  ', owner: 'Asha' })).rejects.toThrow(
      /name is required/i,
    );
    await expect(audienceListService.create({ name: 'X', owner: '  ' })).rejects.toThrow(
      /owner is required/i,
    );
  });

  // A list must be assignable only to somebody who can open the portal to act
  // on it — the same role set the login gate uses, plus SUPER_ADMIN.
  describe('ownerOptions', () => {
    const seedStaff = (roles: string[], first: string, over: Record<string, any> = {}) => {
      seq += 1;
      return UserModel.create({
        auth: { email: `${first.toLowerCase()}${seq}@duncit.com` },
        profile: { first_name: first, last_name: 'Staff' },
        metadata: { status: 'ACTIVE', role_keys: roles, ...over },
      });
    };

    it('offers marketing managers and admins, and nobody else', async () => {
      await seedStaff(['MARKETING_MANAGER'], 'Marketer');
      await seedStaff(['SUPER_ADMIN'], 'Admin');
      await seedStaff(['USER'], 'Member');
      await seedStaff(['FINANCE_MANAGER'], 'Accountant');

      const owners = await audienceListService.ownerOptions();
      expect(owners.map((o) => o.name).sort((a, b) => a.localeCompare(b))).toEqual([
        'Admin Staff',
        'Marketer Staff',
      ]);
      expect(owners.find((o) => o.name === 'Admin Staff')?.is_admin).toBe(true);
      expect(owners.find((o) => o.name === 'Marketer Staff')?.is_admin).toBe(false);
      expect(owners.every((o) => o.email.endsWith('@duncit.com'))).toBe(true);
    });

    it('leaves out closed accounts', async () => {
      await seedStaff(['MARKETING_MANAGER'], 'Gone', { deleted_at: new Date() });
      expect(await audienceListService.ownerOptions()).toEqual([]);
    });

    it('copes with an account that signed up by phone and has no email', async () => {
      seq += 1;
      await UserModel.create({
        auth: { phone: { number: '900000' + seq, extension: '+91' } },
        profile: { first_name: 'Phoney', last_name: 'Manager' },
        metadata: { status: 'ACTIVE', role_keys: ['MARKETING_MANAGER'] },
      });
      expect((await audienceListService.ownerOptions())[0]).toMatchObject({
        name: 'Phoney Manager',
        email: '',
      });
    });

    it('names an account that has no surname yet', async () => {
      seq += 1;
      await UserModel.create({
        auth: { email: `solo${seq}@duncit.com` },
        profile: { first_name: 'Solo' },
        metadata: { status: 'ACTIVE', role_keys: ['MARKETING_MANAGER'] },
      });
      expect((await audienceListService.ownerOptions())[0].name).toBe('Solo');
    });
  });

  describe('table', () => {
    it('pages, searches and counts each row', async () => {
      await seedUser('Pune');
      await audienceListService.create({ name: 'Pune regulars', owner: 'Asha', filters: puneOnly });
      await audienceListService.create({ name: 'Delhi crowd', owner: 'Ravi', filters: [] });

      const all = await audienceListService.table(null);
      expect(all.total).toBe(2);
      expect(all.rows.map((r) => r.name).sort((a, b) => a.localeCompare(b))).toEqual([
        'Delhi crowd',
        'Pune regulars',
      ]);
      expect(all.rows.find((r) => r.name === 'Pune regulars')?.member_count).toBe(1);

      const searched = await audienceListService.table({ search: 'Ravi' });
      expect(searched.rows.map((r) => r.name)).toEqual(['Delhi crowd']);

      const paged = await audienceListService.table({ page: 1, page_size: 1 });
      expect(paged.rows).toHaveLength(1);
      expect(paged.total).toBe(2);
    });
  });

  describe('get', () => {
    it('is null for an unknown or malformed id', async () => {
      expect(await audienceListService.get('not-an-id')).toBeNull();
      expect(await audienceListService.get('64b7f9c2e1a2b3c4d5e6f7a8')).toBeNull();
    });
  });

  // A list stores criteria, not people, so taking somebody out cannot be a row
  // delete: the criteria re-run on every read and would put a matching person
  // straight back. Every case below is really that one rule.
  describe('removeMember', () => {
    it('holds out somebody the criteria still match', async () => {
      const stays = await seedUser('Pune');
      const goes = await seedUser('Pune');
      const list = await audienceListService.create({ name: 'Pune', owner: 'Asha', filters: puneOnly });
      expect(list.member_count).toBe(2);

      const after = await audienceListService.removeMember(list.id, String(goes._id));
      expect(after.member_count).toBe(1);
      expect(after.excluded_member_count).toBe(1);

      // The read that matters: re-running the criteria must not bring them back.
      const rows = await audienceListService.membersTable(list.id, null);
      expect(rows.rows.map((r: any) => r.id)).toEqual([String(stays._id)]);
      expect(await audienceListService.memberIds(list.id)).toHaveLength(1);
      expect(await audienceListService.matchesUser(list.id, String(goes._id))).toBe(false);
      expect(await audienceListService.matchesUser(list.id, String(stays._id))).toBe(true);
    });

    it('takes out somebody who was only ever there by hand', async () => {
      const picked = await seedUser('Delhi');
      const list = await audienceListService.create({ name: 'Pune', owner: 'Asha', filters: puneOnly });
      await audienceListService.addMembers(list.id, [String(picked._id)]);
      expect((await audienceListService.get(list.id))?.member_count).toBe(1);

      const after = await audienceListService.removeMember(list.id, String(picked._id));
      expect(after.member_count).toBe(0);
      expect(after.manual_member_count).toBe(0);
      expect((await audienceListService.membersTable(list.id, null)).total).toBe(0);
    });

    it('holds somebody out of a list that has no criteria at all', async () => {
      const stays = await seedUser('Pune');
      const goes = await seedUser('Delhi');
      const all = await audienceListService.create({ name: 'Everyone', owner: 'Asha' });
      expect(all.member_count).toBe(2);

      await audienceListService.removeMember(all.id, String(goes._id));
      const rows = await audienceListService.membersTable(all.id, null);
      expect(rows.rows.map((r: any) => r.id)).toEqual([String(stays._id)]);
    });

    // The picker offers a removed person again, so adding them back has to lift
    // the removal — otherwise the list accepts the add and still holds nobody.
    it('lets somebody removed be added back', async () => {
      const person = await seedUser('Pune');
      const list = await audienceListService.create({ name: 'Pune', owner: 'Asha', filters: puneOnly });
      await audienceListService.removeMember(list.id, String(person._id));
      expect((await audienceListService.get(list.id))?.member_count).toBe(0);

      const back = await audienceListService.addMembers(list.id, [String(person._id)]);
      expect(back.member_count).toBe(1);
      expect(back.excluded_member_count).toBe(0);
      expect(await audienceListService.matchesUser(list.id, String(person._id))).toBe(true);
    });

    it('is a quiet success for somebody the list never held', async () => {
      const outsider = await seedUser('Delhi');
      const list = await audienceListService.create({ name: 'Pune', owner: 'Asha', filters: puneOnly });
      const after = await audienceListService.removeMember(list.id, String(outsider._id));
      expect(after.member_count).toBe(0);
    });

    it('removing the same person twice does not stack up', async () => {
      const person = await seedUser('Pune');
      const list = await audienceListService.create({ name: 'Pune', owner: 'Asha', filters: puneOnly });
      await audienceListService.removeMember(list.id, String(person._id));
      const twice = await audienceListService.removeMember(list.id, String(person._id));
      expect(twice.excluded_member_count).toBe(1);
    });

    it('reports a missing list and a malformed person rather than writing', async () => {
      const list = await audienceListService.create({ name: 'Pune', owner: 'Asha' });
      await expect(audienceListService.removeMember('not-an-id', 'x')).rejects.toThrow(/not found/i);
      await expect(
        audienceListService.removeMember('64b7f9c2e1a2b3c4d5e6f7a8', '64b7f9c2e1a2b3c4d5e6f7a9')
      ).rejects.toThrow(/not found/i);
      await expect(audienceListService.removeMember(list.id, 'not-an-id')).rejects.toThrow(
        /not a person/i
      );
    });
  });

  // What the "+ Add user" picker reads. Offering somebody already in the list
  // is the thing this query exists to stop.
  describe('candidatesTable', () => {
    it('leaves out whoever the list already holds, by criteria or by hand', async () => {
      const matches = await seedUser('Pune');
      const handPicked = await seedUser('Delhi');
      const outsider = await seedUser('Mumbai');
      const list = await audienceListService.create({ name: 'Pune', owner: 'Asha', filters: puneOnly });
      await audienceListService.addMembers(list.id, [String(handPicked._id)]);

      const offered = await audienceListService.candidatesTable(list.id, null);
      expect(offered.rows.map((r: any) => r.id)).toEqual([String(outsider._id)]);
      expect(offered.total).toBe(1);
      expect(offered.rows.map((r: any) => r.id)).not.toContain(String(matches._id));
    });

    it('offers a removed person again, so a mistake can be undone', async () => {
      const person = await seedUser('Pune');
      const list = await audienceListService.create({ name: 'Pune', owner: 'Asha', filters: puneOnly });
      expect((await audienceListService.candidatesTable(list.id, null)).total).toBe(0);

      await audienceListService.removeMember(list.id, String(person._id));
      const offered = await audienceListService.candidatesTable(list.id, null);
      expect(offered.rows.map((r: any) => r.id)).toEqual([String(person._id)]);
    });

    it('never offers a closed account', async () => {
      const gone = await seedUser('Mumbai');
      await UserModel.updateOne({ _id: gone._id }, { $set: { 'metadata.deleted_at': new Date() } });
      const list = await audienceListService.create({ name: 'Pune', owner: 'Asha', filters: puneOnly });
      expect((await audienceListService.candidatesTable(list.id, null)).total).toBe(0);
    });

    // A list with no criteria is already everybody, so there is nobody left to
    // add — an empty picker there is the correct answer, not a bug.
    it('offers nobody for a list that holds everyone', async () => {
      await seedUser('Pune');
      const all = await audienceListService.create({ name: 'Everyone', owner: 'Asha' });
      expect((await audienceListService.candidatesTable(all.id, null)).total).toBe(0);
    });

    it('searches and pages the people it offers', async () => {
      await seedUser('Mumbai');
      await seedUser('Mumbai');
      const list = await audienceListService.create({ name: 'Pune', owner: 'Asha', filters: puneOnly });

      expect((await audienceListService.candidatesTable(list.id, { search: 'Ana' })).total).toBe(2);
      expect((await audienceListService.candidatesTable(list.id, { search: 'Zebediah' })).total).toBe(0);
      const paged = await audienceListService.candidatesTable(list.id, { page: 1, page_size: 1 });
      expect(paged.rows).toHaveLength(1);
      expect(paged.total).toBe(2);
    });

    it('reports a missing or malformed list id', async () => {
      await expect(audienceListService.candidatesTable('not-an-id', null)).rejects.toThrow(
        /not found/i
      );
    });
  });

  describe('remove', () => {
    it('deletes a list', async () => {
      const list = await audienceListService.create({ name: 'Bye', owner: 'Asha' });
      expect(await audienceListService.remove(list.id)).toBe(true);
      expect(await audienceListService.get(list.id)).toBeNull();
    });

    it('reports a missing or malformed id rather than silently succeeding', async () => {
      await expect(audienceListService.remove('not-an-id')).rejects.toThrow(/not found/i);
      await expect(audienceListService.remove('64b7f9c2e1a2b3c4d5e6f7a8')).rejects.toThrow(/not found/i);
    });
  });
});
