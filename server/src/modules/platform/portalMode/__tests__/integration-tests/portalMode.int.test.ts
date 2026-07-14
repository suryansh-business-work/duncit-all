import { portalModeService } from '../../portalMode.service';
import { PortalModeModel } from '../../portalMode.model';

describe('portalModeService integration', () => {
  it('seeds one row per registry entry and lists them', async () => {
    const list = await portalModeService.list();
    expect(list.length).toBeGreaterThan(10);
    expect(list.every((p) => p.mode === 'LIVE')).toBe(true);
    // Idempotent — a second seed does not duplicate.
    await portalModeService.seedDefaults();
    expect(await PortalModeModel.countDocuments({ key: 'tech' })).toBe(1);
  });

  it('switching to MAINTENANCE then DEVELOPMENT is mutually exclusive (single enum)', async () => {
    await portalModeService.setMode('crm', 'MAINTENANCE', 'fixing', null);
    expect((await portalModeService.getPublic('crm')).mode).toBe('MAINTENANCE');
    await portalModeService.setMode('crm', 'DEVELOPMENT', null, null);
    const after = await portalModeService.getPublic('crm');
    expect(after.mode).toBe('DEVELOPMENT');
  });

  it('getPublic fails open to LIVE for an unseeded key', async () => {
    expect((await portalModeService.getPublic('ghost')).mode).toBe('LIVE');
  });

  it('serves the portalModesTable page with search, filters, sort and paging', async () => {
    await portalModeService.setMode('crm', 'MAINTENANCE', 'fixing', null);

    // Seeds the registry (like list) and reports the clamp defaults back.
    const all = await portalModeService.table();
    expect(all.total).toBeGreaterThan(10);
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Search spans name and key.
    const crm = await portalModeService.table({ search: 'crm' });
    expect(crm.rows.map((r) => r.key)).toEqual(['crm']);

    // Enum filter narrows to the one maintenance portal.
    const maintenance = await portalModeService.table({
      filters: [{ field: 'mode', op: 'eq', value: 'MAINTENANCE' }],
    });
    expect(maintenance.rows.map((r) => r.key)).toEqual(['crm']);
    const portalsOnly = await portalModeService.table({
      filters: [{ field: 'kind', op: 'eq', value: 'WEBSITE' }],
    });
    expect(portalsOnly.rows.every((r) => r.kind === 'WEBSITE')).toBe(true);
    expect(portalsOnly.total).toBeGreaterThan(0);
    expect(portalsOnly.total).toBeLessThan(all.total);

    // Allowlisted sort: desc is the exact reverse of asc (names are unique).
    const asc = await portalModeService.table({ sort_by: 'name', sort_dir: 'asc', page_size: 100 });
    const desc = await portalModeService.table({ sort_by: 'name', sort_dir: 'desc', page_size: 100 });
    expect(desc.rows.map((r) => r.id)).toEqual([...asc.rows].reverse().map((r) => r.id));

    // Paging keeps total and reports the clamped page/page_size back.
    const page2 = await portalModeService.table({ page: 2, page_size: 5 });
    expect(page2.rows).toHaveLength(5);
    expect(page2.total).toBe(all.total);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(5);
  });
});
