import { managedOptionService } from '../../managedOption.service';

describe('managedOptionService integration', () => {
  it('creates, lists and toggles options within a group', async () => {
    const created = await managedOptionService.create({ name: 'Parking', group: 'AMENITY' });
    expect(created!.name).toBe('Parking');
    expect(created!.is_active).toBe(true);

    await expect(managedOptionService.create({ name: 'Parking', group: 'AMENITY' })).rejects.toThrow(
      /already exists/i
    );

    const off = await managedOptionService.update(created!.id, { is_active: false });
    expect(off!.is_active).toBe(false);
    expect(await managedOptionService.list('AMENITY')).toHaveLength(0);
    expect(await managedOptionService.list('AMENITY', true)).toHaveLength(1);
  });

  it('serves the crmManagedOptionsTable page with search, filters, sort and paging', async () => {
    await managedOptionService.create({ name: 'Parking', group: 'AMENITY', sort_order: 2 });
    await managedOptionService.create({ name: 'Wifi', group: 'AMENITY', sort_order: 1 });
    await managedOptionService.create({ name: 'Projector', group: 'AMENITY', sort_order: 3, is_active: false });

    // Default sort sort_order asc then name asc + clamp defaults.
    const all = await managedOptionService.table('AMENITY');
    expect(all.total).toBe(3);
    expect(all.rows.map((o) => o!.name)).toEqual(['Wifi', 'Parking', 'Projector']);
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Search matches name.
    const search = await managedOptionService.table('AMENITY', { search: 'wifi' });
    expect(search.rows.map((o) => o!.name)).toEqual(['Wifi']);
    expect(search.total).toBe(1);

    // Boolean filter narrows.
    const active = await managedOptionService.table('AMENITY', {
      filters: [{ field: 'is_active', op: 'is_true' }],
    });
    expect(active.rows.map((o) => o!.name)).toEqual(['Wifi', 'Parking']);

    // Allowlisted sort override + paging.
    const desc = await managedOptionService.table('AMENITY', { sort_by: 'name', sort_dir: 'desc' });
    expect(desc.rows.map((o) => o!.name)).toEqual(['Wifi', 'Projector', 'Parking']);
    const page2 = await managedOptionService.table('AMENITY', { page: 2, page_size: 1 });
    expect(page2.rows.map((o) => o!.name)).toEqual(['Parking']);
    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
  });

  it('never leaks another group into the table (group baseFilter scope)', async () => {
    await managedOptionService.create({ name: 'Stage Lighting', group: 'AMENITY' });
    await managedOptionService.create({ name: 'Weddings', group: 'EVENT_SUITABILITY' });

    const amenities = await managedOptionService.table('AMENITY');
    expect(amenities.total).toBe(1);
    expect(amenities.rows.map((o) => o!.name)).toEqual(['Stage Lighting']);

    // Even a search matching the other group's row returns nothing across groups.
    const crossSearch = await managedOptionService.table('AMENITY', { search: 'weddings' });
    expect(crossSearch.total).toBe(0);
    expect(crossSearch.rows).toEqual([]);
  });
});
