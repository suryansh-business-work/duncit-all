import { Types } from 'mongoose';
import { serviceOfferedService } from '../../serviceOffered.service';

const sup = new Types.ObjectId().toString();
const cat = new Types.ObjectId().toString();
const sub = new Types.ObjectId().toString();

describe('serviceOfferedService integration', () => {
  it('bulk-creates titles under a hierarchy and dedupes', async () => {
    const created = await serviceOfferedService.createMany(
      { super_category_id: sup, category_id: cat, sub_category_id: sub, titles: ['Catering', 'Decor', 'Catering', '  '] },
      'tester'
    );
    expect(created).toHaveLength(2); // Catering + Decor (blank + dup dropped)

    // Re-adding an existing title is idempotent (unique index swallowed).
    const again = await serviceOfferedService.createMany(
      { super_category_id: sup, category_id: cat, sub_category_id: sub, titles: ['Catering', 'Lighting'] },
      'tester'
    );
    expect(again).toHaveLength(1); // only Lighting is new
  });

  it('requires super category and at least one title', async () => {
    await expect(serviceOfferedService.createMany({ super_category_id: '', titles: ['x'] })).rejects.toThrow(/super category/i);
    await expect(serviceOfferedService.createMany({ super_category_id: sup, titles: [] })).rejects.toThrow(/at least one/i);
  });

  it('filters by hierarchy', async () => {
    await serviceOfferedService.createMany({ super_category_id: sup, category_id: cat, sub_category_id: sub, titles: ['Sound'] });
    const bySub = await serviceOfferedService.list({ super_category_id: sup, category_id: cat, sub_category_id: sub });
    expect(bySub.length).toBeGreaterThanOrEqual(1);
    const otherSup = await serviceOfferedService.list({ super_category_id: new Types.ObjectId().toString() });
    expect(otherSup).toHaveLength(0);
  });

  it('updates and deletes', async () => {
    const [svc] = await serviceOfferedService.createMany({ super_category_id: sup, titles: ['Temp'] });
    const updated = await serviceOfferedService.update(svc!.id, { title: 'Renamed', is_active: false });
    expect(updated!.title).toBe('Renamed');
    expect(updated!.is_active).toBe(false);
    expect(await serviceOfferedService.remove(svc!.id)).toBe(true);
    await expect(serviceOfferedService.remove(svc!.id)).rejects.toThrow(/not found/i);
  });
});
