import { websiteNavService } from '../../websiteNav.service';
import { WebsiteNavItemModel } from '../../websiteNav.model';

describe('websiteNavService integration', () => {
  it('seeds defaults once and never re-seeds over edits', async () => {
    await websiteNavService.seedDefaults();
    const seeded = await WebsiteNavItemModel.countDocuments();
    expect(seeded).toBeGreaterThan(0);

    await WebsiteNavItemModel.deleteMany({ site: { $ne: 'MAIN' } });
    await websiteNavService.seedDefaults();
    // No re-seed: satellite rows stay deleted.
    expect(await WebsiteNavItemModel.countDocuments({ site: 'ADS' })).toBe(0);
  });

  it('publicList returns only active items for the requested site, ordered', async () => {
    await websiteNavService.create({ site: 'MAIN', area: 'FOOTER', group_label: 'About', label: 'B', url: '/b', sort_order: 1 });
    await websiteNavService.create({ site: 'MAIN', area: 'FOOTER', group_label: 'About', label: 'A', url: '/a', sort_order: 0 });
    await websiteNavService.create({ site: 'MAIN', area: 'FOOTER', group_label: 'About', label: 'Hidden', url: '/h', sort_order: 2, is_active: false });
    await websiteNavService.create({ site: 'ADS', area: 'FOOTER', group_label: 'X', label: 'Other site', url: '/x' });

    const main = await websiteNavService.publicList('MAIN');
    expect(main.map((i) => i.label)).toEqual(['A', 'B']);
    expect(main.every((i) => i.site === 'MAIN' && i.is_active)).toBe(true);
  });

  it('serves the websiteNavTable page with search, filter, sort and paging', async () => {
    await websiteNavService.create({ site: 'MAIN', area: 'HEADER', group_label: 'About', label: 'Careers', url: '/careers', sort_order: 1 });
    await websiteNavService.create({ site: 'MAIN', area: 'HEADER', group_label: 'About', label: 'Our story', url: '/about', sort_order: 0 });
    await websiteNavService.create({ site: 'ADS', area: 'FOOTER', group_label: 'Duncit', label: 'Support', url: '/help', is_active: false });

    // Plain envelope with the default sort (site/area/group/sort_order, like the admin list).
    const all = await websiteNavService.table();
    expect(all.total).toBe(3);
    expect(all.rows.map((i) => i.label)).toEqual(['Support', 'Our story', 'Careers']);
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Search spans label, group_label and url.
    const searched = await websiteNavService.table({ search: 'careers' });
    expect(searched.rows.map((i) => i.label)).toEqual(['Careers']);
    expect(searched.total).toBe(1);

    // Enum + boolean filters narrow (the site tabs become an enum filter).
    const mainOnly = await websiteNavService.table({
      filters: [{ field: 'site', op: 'eq', value: 'MAIN' }],
    });
    expect(mainOnly.total).toBe(2);
    const active = await websiteNavService.table({ filters: [{ field: 'is_active', op: 'is_true' }] });
    expect(active.total).toBe(2);

    // Allowlisted sort + paging keep total and report the clamps back.
    const byLabel = await websiteNavService.table({ sort_by: 'label', sort_dir: 'desc' });
    expect(byLabel.rows.map((i) => i.label)).toEqual(['Support', 'Our story', 'Careers']);

    const page2 = await websiteNavService.table({ sort_by: 'label', sort_dir: 'asc', page: 2, page_size: 1 });
    expect(page2.rows.map((i) => i.label)).toEqual(['Our story']);
    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
  });

  it('updates and deletes items', async () => {
    const item = await websiteNavService.create({ site: 'EARNWITH', area: 'HEADER', label: 'Ways', url: '/ways' });
    const updated = await websiteNavService.update(item.id, {
      site: 'EARNWITH', area: 'HEADER', group_label: 'Earn', label: 'Ways to earn', url: '/ways-to-earn', sort_order: 3, is_active: false,
    });
    expect(updated).toMatchObject({ label: 'Ways to earn', group_label: 'Earn', sort_order: 3, is_active: false });

    expect(await websiteNavService.remove(item.id)).toBe(true);
    await expect(
      websiteNavService.update('64b000000000000000000000', { site: 'MAIN', area: 'HEADER', label: 'x', url: '/x' })
    ).rejects.toThrow(/not found/i);
    await expect(websiteNavService.update('bad', { site: 'MAIN', area: 'HEADER', label: 'x', url: '/x' })).rejects.toThrow(/invalid/i);
  });
});
