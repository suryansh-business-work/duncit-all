import { categoryService } from '../../category.service';
import { CategoryModel } from '../../category.model';

async function makeSuper(name = 'Dining') {
  return categoryService.create({ name, level: 'SUPER' });
}

describe('categoryService integration', () => {
  it('builds a SUPER -> CATEGORY -> SUB hierarchy', async () => {
    const sup = await makeSuper();
    expect(sup!.level).toBe('SUPER');
    expect(sup!.slug).toBe('dining');

    const cat = await categoryService.create({ name: 'Restaurants', level: 'CATEGORY', parent_id: sup!.id });
    expect(cat!.parent_id).toBe(sup!.id);

    const sub = await categoryService.create({ name: 'Cafe', level: 'SUB', parent_id: cat!.id });
    expect(sub!.parent_id).toBe(cat!.id);
  });

  it('enforces parent-level rules', async () => {
    const sup = await makeSuper();
    await expect(
      categoryService.create({ name: 'Bad', level: 'SUPER', parent_id: sup!.id })
    ).rejects.toThrow(/must not have a parent/i);

    const sub = await categoryService.create({ name: 'X', level: 'CATEGORY', parent_id: sup!.id });
    await expect(
      categoryService.create({ name: 'Y', level: 'CATEGORY', parent_id: sub!.id })
    ).rejects.toThrow(/parent must be a super/i);
  });

  it('prevents duplicate siblings', async () => {
    const sup = await makeSuper();
    await categoryService.create({ name: 'Pizza', level: 'CATEGORY', parent_id: sup!.id });
    await expect(
      categoryService.create({ name: 'Pizza', level: 'CATEGORY', parent_id: sup!.id })
    ).rejects.toThrow(/already exists/i);
  });

  it('lists, fetches and updates (re-slugging on rename)', async () => {
    const sup = await makeSuper('Events');
    const supers = await categoryService.list({ level: 'SUPER' });
    expect(supers).toHaveLength(1);
    expect((await categoryService.getById(sup!.id))?.name).toBe('Events');

    const updated = await categoryService.update(sup!.id, { name: 'Live Events' });
    expect(updated!.slug).toBe('live-events');
  });

  it('cascade-deletes a SUPER with its descendants', async () => {
    const sup = await makeSuper('Wipe');
    const cat = await categoryService.create({ name: 'Child', level: 'CATEGORY', parent_id: sup!.id });
    await categoryService.create({ name: 'Grand', level: 'SUB', parent_id: cat!.id });

    expect(await categoryService.remove(sup!.id)).toBe(true);
    expect(await CategoryModel.countDocuments()).toBe(0);
  });
});
