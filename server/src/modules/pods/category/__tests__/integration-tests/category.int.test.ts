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

  it('stores + normalises the CATEGORY icon layout and rejects it on other levels', async () => {
    const sup = await makeSuper('Games');
    const cat = await categoryService.create({
      name: 'Board',
      level: 'CATEGORY',
      parent_id: sup!.id,
      // width over the 200 cap is clamped; a missing position defaults to TOP.
      icon_layout_mweb: { position: 'LEFT', width: 300, height: 15 },
      icon_layout_native: { width: 24, height: 24 },
    });
    expect(cat!.icon_layout_mweb).toEqual({ position: 'LEFT', width: 200, height: 15 });
    expect(cat!.icon_layout_native).toEqual({ position: 'TOP', width: 24, height: 24 });

    // The layout is a CATEGORY-only concern — SUPER/SUB reject it.
    await expect(
      categoryService.create({
        name: 'NoLayout',
        level: 'SUB',
        parent_id: cat!.id,
        icon_layout_mweb: { position: 'TOP', width: 40, height: 40 },
      })
    ).rejects.toThrow(/only be configured on a category/i);

    // Update clears one surface (null) and changes the other.
    const updated = await categoryService.update(cat!.id, {
      icon_layout_mweb: null,
      icon_layout_native: { position: 'BOTTOM', width: 50, height: 50 },
    });
    expect(updated!.icon_layout_mweb).toBeNull();
    expect(updated!.icon_layout_native).toEqual({ position: 'BOTTOM', width: 50, height: 50 });
  });

  it('cascade-deletes a SUPER with its descendants', async () => {
    const sup = await makeSuper('Wipe');
    const cat = await categoryService.create({ name: 'Child', level: 'CATEGORY', parent_id: sup!.id });
    await categoryService.create({ name: 'Grand', level: 'SUB', parent_id: cat!.id });

    expect(await categoryService.remove(sup!.id)).toBe(true);
    expect(await CategoryModel.countDocuments()).toBe(0);
  });
});
