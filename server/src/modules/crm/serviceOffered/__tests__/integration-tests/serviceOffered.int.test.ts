import { Types } from 'mongoose';
import { serviceOfferedService } from '../../serviceOffered.service';
import { ServiceOfferedModel } from '../../serviceOffered.model';

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

  it('defaults a new row to venue and host only, and lets each lead type be picked on its own', async () => {
    const [legacyDefault] = await serviceOfferedService.createMany({ super_category_id: sup, titles: ['Catering'] });
    expect(legacyDefault).toMatchObject({
      applies_to_venue: true,
      applies_to_host: true,
      applies_to_ecomm: false,
      applies_to_creator: false,
      applies_to_community: false,
    });

    const [creatorOnly] = await serviceOfferedService.createMany({
      super_category_id: sup,
      applies_to_venue: false,
      applies_to_host: false,
      applies_to_creator: true,
      titles: ['Sponsored reels'],
    });
    expect(creatorOnly).toMatchObject({
      applies_to_venue: false,
      applies_to_host: false,
      applies_to_ecomm: false,
      applies_to_creator: true,
      applies_to_community: false,
    });

    const [communityOnly] = await serviceOfferedService.createMany({
      super_category_id: sup,
      applies_to_venue: false,
      applies_to_host: null,
      applies_to_community: true,
      titles: ['Meetup hosting'],
    });
    // A null flag reads as not sent: host keeps its legacy ON default.
    expect(communityOnly).toMatchObject({ applies_to_venue: false, applies_to_host: true, applies_to_community: true });
  });

  it('refuses a service that applies to no lead type, naming all five', async () => {
    await expect(
      serviceOfferedService.createMany({
        super_category_id: sup,
        applies_to_venue: false,
        applies_to_host: false,
        applies_to_ecomm: false,
        applies_to_creator: false,
        applies_to_community: false,
        titles: ['Orphan'],
      })
    ).rejects.toMatchObject({
      message: 'Pick at least one lead type: Venue, Host, Ecomm, Creator or Community',
      extensions: { code: 'BAD_USER_INPUT' },
    });
    expect(await ServiceOfferedModel.countDocuments()).toBe(0);
  });

  it('filters the lead-form picker by each lead type, reading legacy rows by their defaults', async () => {
    await serviceOfferedService.createMany({ super_category_id: sup, titles: ['Both legacy kinds'] });
    await serviceOfferedService.createMany({
      super_category_id: sup,
      applies_to_venue: false,
      applies_to_host: false,
      applies_to_creator: true,
      titles: ['Creator only'],
    });
    await serviceOfferedService.createMany({
      super_category_id: sup,
      applies_to_venue: false,
      applies_to_host: false,
      applies_to_creator: true,
      applies_to_community: true,
      titles: ['Creator and community'],
    });
    // A row written before any flag existed.
    await ServiceOfferedModel.collection.insertOne({
      title: 'Pre-flag row',
      slug: 'pre-flag-row',
      super_category_id: new Types.ObjectId(sup),
      category_id: null,
      sub_category_id: null,
      is_active: true,
      sort_order: 0,
    });

    const titles = async (filter: Parameters<typeof serviceOfferedService.list>[0]) =>
      (await serviceOfferedService.list(filter)).map((s) => s!.title).sort((a, b) => a.localeCompare(b));

    expect(await titles({ applies_to_creator: true })).toEqual(['Creator and community', 'Creator only']);
    expect(await titles({ applies_to_community: true })).toEqual(['Creator and community']);
    expect(await titles({ applies_to_venue: true })).toEqual(['Both legacy kinds', 'Pre-flag row']);
    expect(await titles({ applies_to_host: true, applies_to_creator: true })).toEqual([]);
    // Only `true` constrains: asking for "not creator" is the same as not asking.
    expect(await titles({ applies_to_creator: false })).toHaveLength(4);

    const legacy = (await serviceOfferedService.list({ search: 'pre-flag' }))[0];
    expect(legacy).toMatchObject({
      applies_to_venue: true,
      applies_to_host: true,
      applies_to_ecomm: false,
      applies_to_creator: false,
      applies_to_community: false,
    });
  });

  it('updates the creator and community flags, refusing a change that leaves no lead type', async () => {
    const [svc] = await serviceOfferedService.createMany({ super_category_id: sup, titles: ['Photography'] });

    const opened = await serviceOfferedService.update(svc!.id, { applies_to_creator: true, applies_to_community: true });
    expect(opened).toMatchObject({ applies_to_venue: true, applies_to_host: true, applies_to_creator: true, applies_to_community: true });

    // Venue and host off is fine while creator / community are on.
    const narrowed = await serviceOfferedService.update(svc!.id, { applies_to_venue: false, applies_to_host: false, applies_to_creator: false });
    expect(narrowed).toMatchObject({ applies_to_venue: false, applies_to_host: false, applies_to_creator: false, applies_to_community: true });

    await expect(serviceOfferedService.update(svc!.id, { applies_to_community: false })).rejects.toMatchObject({
      message: 'Pick at least one lead type: Venue, Host, Ecomm, Creator or Community',
      extensions: { code: 'BAD_USER_INPUT' },
    });
    const stored = await ServiceOfferedModel.findById(svc!.id).lean();
    expect(stored).toMatchObject({ applies_to_community: true, applies_to_venue: false });

    // Null flags are "not sent": nothing changes.
    const same = await serviceOfferedService.update(svc!.id, { applies_to_venue: null, applies_to_community: null, sort_order: 4 });
    expect(same).toMatchObject({ applies_to_venue: false, applies_to_community: true, sort_order: 4 });
  });

  it('lets a legacy row without flags gain a creator flag without losing venue and host', async () => {
    const { insertedId } = await ServiceOfferedModel.collection.insertOne({
      title: 'Old row',
      slug: 'old-row',
      super_category_id: new Types.ObjectId(sup),
      category_id: null,
      sub_category_id: null,
    });

    const updated = await serviceOfferedService.update(String(insertedId), { applies_to_creator: true });

    expect(updated).toMatchObject({ applies_to_venue: true, applies_to_host: true, applies_to_creator: true, applies_to_community: false });
  });

  it('filters and sorts the services table by the creator and community flags', async () => {
    const supC = new Types.ObjectId().toString();
    await serviceOfferedService.createMany({ super_category_id: supC, titles: ['Venue thing'] });
    await serviceOfferedService.createMany({
      super_category_id: supC,
      applies_to_venue: false,
      applies_to_host: false,
      applies_to_creator: true,
      titles: ['Creator thing'],
    });
    await serviceOfferedService.createMany({
      super_category_id: supC,
      applies_to_venue: false,
      applies_to_host: false,
      applies_to_community: true,
      titles: ['Community thing'],
    });

    const creator = await serviceOfferedService.table({ filters: [{ field: 'applies_to_creator', op: 'is_true' }] });
    expect(creator.rows.map((s) => s!.title)).toEqual(['Creator thing']);
    const community = await serviceOfferedService.table({ filters: [{ field: 'applies_to_community', op: 'is_true' }] });
    expect(community.rows.map((s) => s!.title)).toEqual(['Community thing']);
    const notCommunity = await serviceOfferedService.table({ filters: [{ field: 'applies_to_community', op: 'is_false' }] });
    expect(notCommunity.rows.map((s) => s!.title).sort((a, b) => a.localeCompare(b))).toEqual(['Creator thing', 'Venue thing']);

    const byCommunity = await serviceOfferedService.table({ sort_by: 'applies_to_community', sort_dir: 'desc' });
    expect(byCommunity.rows[0]!.title).toBe('Community thing');
    const byCreator = await serviceOfferedService.table({ sort_by: 'applies_to_creator', sort_dir: 'desc' });
    expect(byCreator.rows[0]!.title).toBe('Creator thing');
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
