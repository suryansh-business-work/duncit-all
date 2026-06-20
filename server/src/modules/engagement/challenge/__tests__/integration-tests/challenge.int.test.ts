import { challengeService } from '../../challenge.service';
import { ChallengeModel } from '../../challenge.model';
import { CategoryModel } from '@modules/pods/category/category.model';

describe('challengeService', () => {
  it('creates a challenge and resolves category names', async () => {
    const sup = await CategoryModel.create({ name: 'Sports', slug: 'sports', level: 'SUPER' });
    const cat = await CategoryModel.create({ name: 'Cricket', slug: 'cricket', level: 'CATEGORY', parent_id: sup._id });

    const created = await challengeService.create({
      name: 'Weekend Cricket Cup',
      description: 'A friendly weekend tournament',
      super_category_id: String(sup._id),
      category_id: String(cat._id),
    });
    expect(created?.name).toBe('Weekend Cricket Cup');
    expect(created?.super_category_name).toBe('Sports');
    expect(created?.category_name).toBe('Cricket');
    expect(created?.sub_category_name).toBeNull();
  });

  it('requires a name', async () => {
    await expect(challengeService.create({ name: '   ' })).rejects.toThrow(/name/i);
  });

  it('lists + searches + counts via stats', async () => {
    await ChallengeModel.create([
      { name: 'Alpha Run', is_active: true },
      { name: 'Beta Quiz', is_active: false },
    ]);
    const all = await challengeService.list();
    expect(all.length).toBe(2);
    const found = await challengeService.list('alpha');
    expect(found.map((c) => c?.name)).toEqual(['Alpha Run']);
    const stats = await challengeService.stats();
    expect(stats.total).toBe(2);
    expect(stats.active).toBe(1);
  });

  it('updates and deletes a challenge', async () => {
    const c = await ChallengeModel.create({ name: 'Temp' });
    const updated = await challengeService.update(String(c._id), { name: 'Renamed', is_active: false });
    expect(updated?.name).toBe('Renamed');
    expect(updated?.is_active).toBe(false);
    expect(await challengeService.remove(String(c._id))).toBe(true);
    expect(await challengeService.getById(String(c._id))).toBeNull();
    await expect(challengeService.update(String(c._id), { name: 'x' })).rejects.toThrow(/not found/i);
  });
});
