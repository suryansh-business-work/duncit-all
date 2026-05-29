import { crmService } from '../../crm.service';

describe('crmService integration', () => {
  it('seeds default services and lists them', async () => {
    expect(await crmService.listServices()).toEqual([]);

    await crmService.seedServiceDefaults();
    const services = await crmService.listServices();
    expect(services.length).toBeGreaterThan(0);
  });

  it('returns the CRM lead config', async () => {
    const config = await crmService.config();
    expect(config).toBeDefined();
  });

  it('lists dynamic fields (empty initially)', async () => {
    expect(await crmService.listDynamicFields()).toEqual([]);
  });
});
