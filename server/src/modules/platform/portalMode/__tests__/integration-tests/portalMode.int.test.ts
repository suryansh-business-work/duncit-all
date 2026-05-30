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
});
