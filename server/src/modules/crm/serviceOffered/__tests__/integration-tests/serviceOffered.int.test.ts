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

  it('serves the crmServicesOfferedTable page with search, filters, sort and paging', async () => {
    const supA = new Types.ObjectId().toString();
    const supB = new Types.ObjectId().toString();
    await serviceOfferedService.createMany({ super_category_id: supA, titles: ['Catering', 'Decor'] });
    await serviceOfferedService.createMany({
      super_category_id: supB,
      applies_to_venue: false,
      applies_to_ecomm: true,
      titles: ['Shipping'],
    });

    // Default sort sort_order asc then title asc + clamp defaults.
    const all = await serviceOfferedService.table();
    expect(all.total).toBeGreaterThanOrEqual(3);
    const titles = all.rows.map((s) => s!.title);
    expect(titles.indexOf('Catering')).toBeLessThan(titles.indexOf('Decor'));
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Search spans title and slug.
    const search = await serviceOfferedService.table({ search: 'shipping' });
    expect(search.rows.map((s) => s!.title)).toEqual(['Shipping']);
    expect(search.total).toBe(1);

    // Hierarchy id filter (string -> ObjectId cast) + boolean filter narrow.
    const bySuper = await serviceOfferedService.table({
      filters: [{ field: 'super_category_id', op: 'eq', value: supA }],
    });
    expect(bySuper.rows.map((s) => s!.title)).toEqual(['Catering', 'Decor']);
    const ecomm = await serviceOfferedService.table({
      filters: [{ field: 'applies_to_ecomm', op: 'is_true' }],
    });
    expect(ecomm.rows.map((s) => s!.title)).toEqual(['Shipping']);

    // Allowlisted sort override + paging within the supA scope.
    const desc = await serviceOfferedService.table({
      sort_by: 'title',
      sort_dir: 'desc',
      filters: [{ field: 'super_category_id', op: 'eq', value: supA }],
    });
    expect(desc.rows.map((s) => s!.title)).toEqual(['Decor', 'Catering']);
    const page2 = await serviceOfferedService.table({
      page: 2,
      page_size: 1,
      filters: [{ field: 'super_category_id', op: 'eq', value: supA }],
    });
    expect(page2.rows.map((s) => s!.title)).toEqual(['Decor']);
    expect(page2.total).toBe(2);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
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
