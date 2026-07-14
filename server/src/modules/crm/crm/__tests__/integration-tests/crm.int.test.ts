import { Types } from 'mongoose';
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

describe('crmService lead tables (shared table engine)', () => {
  it('serves the hostLeadsTable page with search, filters, sort and paging', async () => {
    await crmService.createHostLead({
      host_name: 'Asha Events',
      city: 'Delhi',
      lead_status: 'New',
      priority: 'High',
      next_follow_up_date: '2026-01-01T00:00:00.000Z',
      contacts: [{ name: 'Asha', mobile_number: '9811111111', email: 'asha@example.com' }],
    });
    await crmService.createHostLead({
      host_name: 'Bran Meetups',
      city: 'Mumbai',
      lead_status: 'Contacted',
      priority: 'Low',
      next_follow_up_date: '2026-02-01T00:00:00.000Z',
      contacts: [{ name: 'Bran', mobile_number: '9822222222' }],
    });
    await crmService.createHostLead({
      host_name: 'Chai Circles',
      city: 'Delhi',
      lead_status: 'New',
      priority: 'Medium',
      next_follow_up_date: '2026-03-01T00:00:00.000Z',
    });

    // Plain envelope: default sort (next follow-up asc) + clamp defaults.
    const all = await crmService.hostLeadsTable();
    expect(all.total).toBe(3);
    expect(all.rows.map((r) => r!.host_name)).toEqual(['Asha Events', 'Bran Meetups', 'Chai Circles']);
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Search spans host_name / city / contact phone / contact email (CrmLeadFilter semantics).
    expect((await crmService.hostLeadsTable({ search: 'chai' })).rows.map((r) => r!.host_name)).toEqual(['Chai Circles']);
    expect((await crmService.hostLeadsTable({ search: 'mumbai' })).rows.map((r) => r!.host_name)).toEqual(['Bran Meetups']);
    expect((await crmService.hostLeadsTable({ search: '9811111111' })).rows.map((r) => r!.host_name)).toEqual(['Asha Events']);
    expect((await crmService.hostLeadsTable({ search: 'asha@example.com' })).rows.map((r) => r!.host_name)).toEqual(['Asha Events']);

    // Enum + string filters AND-combine.
    const delhiNew = await crmService.hostLeadsTable({
      filters: [
        { field: 'lead_status', op: 'eq', value: 'New' },
        { field: 'city', op: 'eq', value: 'Delhi' },
      ],
    });
    expect(delhiNew.rows.map((r) => r!.host_name)).toEqual(['Asha Events', 'Chai Circles']);

    // Allowlisted sort, both directions.
    const desc = await crmService.hostLeadsTable({ sort_by: 'host_name', sort_dir: 'desc' });
    expect(desc.rows.map((r) => r!.host_name)).toEqual(['Chai Circles', 'Bran Meetups', 'Asha Events']);

    // Paging keeps total and reports the clamped page/page_size back.
    const page2 = await crmService.hostLeadsTable({ page: 2, page_size: 1 });
    expect(page2.rows.map((r) => r!.host_name)).toEqual(['Bran Meetups']);
    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
  });

  it('serves the venueLeadsTable page with search, super-category filter, sort and paging', async () => {
    const supId = new Types.ObjectId().toString();
    await crmService.createVenueLead({
      venue_name: 'Arena One',
      city: 'Delhi',
      full_address: '1 Stadium Road',
      priority: 'High',
      super_category_id: supId,
      contacts: [{ name: 'Owner', mobile_number: '9833333333' }],
    });
    await crmService.createVenueLead({
      venue_name: 'Banquet Two',
      city: 'Pune',
      full_address: '2 Banquet Lane',
      priority: 'Low',
    });

    const all = await crmService.venueLeadsTable();
    expect(all.total).toBe(2);

    expect((await crmService.venueLeadsTable({ search: 'banquet' })).rows.map((r) => r!.venue_name)).toEqual(['Banquet Two']);

    // super_category_id filter matches the legacy CrmLeadFilter semantics.
    const bySuper = await crmService.venueLeadsTable({
      filters: [{ field: 'super_category_id', op: 'eq', value: supId }],
    });
    expect(bySuper.rows.map((r) => r!.venue_name)).toEqual(['Arena One']);

    const desc = await crmService.venueLeadsTable({ sort_by: 'venue_name', sort_dir: 'desc' });
    expect(desc.rows.map((r) => r!.venue_name)).toEqual(['Banquet Two', 'Arena One']);

    const page2 = await crmService.venueLeadsTable({ page: 2, page_size: 1, sort_by: 'venue_name', sort_dir: 'asc' });
    expect(page2.rows.map((r) => r!.venue_name)).toEqual(['Banquet Two']);
    expect(page2.total).toBe(2);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
  });

  it('serves the ecommLeadsTable page with brand search, status filter, sort and paging', async () => {
    await crmService.createEcommLead({
      seller_name: 'Alpha Traders',
      brand_name: 'Alpine',
      city: 'Delhi',
      lead_status: 'New',
    });
    await crmService.createEcommLead({
      seller_name: 'Beta Goods',
      brand_name: 'Bloom',
      city: 'Pune',
      lead_status: 'Contacted',
    });

    // brand_name is an extra ecomm-only search field.
    expect((await crmService.ecommLeadsTable({ search: 'bloom' })).rows.map((r) => r!.seller_name)).toEqual(['Beta Goods']);

    const contacted = await crmService.ecommLeadsTable({
      filters: [{ field: 'lead_status', op: 'eq', value: 'Contacted' }],
    });
    expect(contacted.rows.map((r) => r!.seller_name)).toEqual(['Beta Goods']);

    const desc = await crmService.ecommLeadsTable({ sort_by: 'brand_name', sort_dir: 'desc' });
    expect(desc.rows.map((r) => r!.seller_name)).toEqual(['Beta Goods', 'Alpha Traders']);

    const page2 = await crmService.ecommLeadsTable({ page: 2, page_size: 1, sort_by: 'seller_name', sort_dir: 'asc' });
    expect(page2.rows.map((r) => r!.seller_name)).toEqual(['Beta Goods']);
    expect(page2.total).toBe(2);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
  });
});
