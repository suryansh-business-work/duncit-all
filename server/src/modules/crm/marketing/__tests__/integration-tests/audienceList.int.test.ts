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
