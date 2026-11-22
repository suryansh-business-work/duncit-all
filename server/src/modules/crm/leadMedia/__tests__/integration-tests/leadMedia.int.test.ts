import { Types } from 'mongoose';
import { makeContext } from '@test/harness';
import { crmService } from '@modules/crm/crm/crm.service';
import { prospectLeadService } from '@modules/crm/prospectLead/prospectLead.service';
import { CrmLeadMediaModel, removeLeadMedia } from '../../leadMedia.model';
import { CRM_LEAD_MEDIA_LIMITS, leadMediaService as svc, type LeadMediaInput } from '../../leadMedia.service';
import { leadMediaResolvers } from '../../leadMedia.resolver';

/**
 * Lead Details › Logos & Images: one collection for every lead kind, with
 * per-kind limits, https-only uploads, and cleanup when the lead is deleted.
 */

const img = (over: LeadMediaInput = {}): LeadMediaInput => ({
  kind: 'IMAGE',
  url: 'https://cdn.example.com/photo.jpg',
  name: 'Photo',
  mime_type: 'image/jpeg',
  ...over,
});
const logo = (over: LeadMediaInput = {}): LeadMediaInput => img({ kind: 'LOGO', url: 'https://cdn.example.com/logo.svg', name: 'Logo', mime_type: 'image/svg+xml', ...over });

const venueLead = async () =>
  (await crmService.createVenueLead({ venue_name: 'Smash Arena', city: 'Pune', full_address: '1 Stadium Road', contacts: [] }))!.id;
const badInput = (message: string | RegExp) => ({
  message: typeof message === 'string' ? message : expect.stringMatching(message),
  extensions: { code: 'BAD_USER_INPUT' },
});
const notFound = (message: string) => ({ message, extensions: { code: 'NOT_FOUND' } });

describe('leadMediaService.add and list', () => {
  it('adds validated files and returns the lead’s whole list, logos first then in upload order', async () => {
    const leadId = await venueLead();

    await svc.add('VENUE_LEAD', leadId, [img({ name: 'First' })], 'crm-1');
    const list = await svc.add(
      'VENUE_LEAD',
      leadId,
      [
        img({ name: `  ${'N'.repeat(130)}  `, mime_type: ' IMAGE/WEBP ', size_bytes: 1023.6, width: 640, height: -1 }),
        logo({ mime_type: null, size_bytes: Number.POSITIVE_INFINITY }),
      ],
      null
    );

    expect(list.map((m) => [m.kind, m.sort_order])).toEqual([
      ['LOGO', 2],
      ['IMAGE', 0],
      ['IMAGE', 1],
    ]);
    expect(list[0]).toMatchObject({
      entity_type: 'VENUE_LEAD',
      lead_id: leadId,
      url: 'https://cdn.example.com/logo.svg',
      mime_type: '',
      size_bytes: null,
      uploaded_by: null,
      created_at: expect.any(String),
      updated_at: expect.any(String),
    });
    expect(list[1]).toMatchObject({ name: 'First', uploaded_by: 'crm-1' });
    expect(list[2]).toMatchObject({ name: 'N'.repeat(120), mime_type: 'image/webp', size_bytes: 1024, width: 640, height: null });

    expect(await svc.list('VENUE_LEAD', leadId)).toEqual(list);
  });

  it('stores a nameless upload with a blank name, and reads a bare stored row with blank details', async () => {
    const leadId = await venueLead();
    const [unnamed] = await svc.add('VENUE_LEAD', leadId, [img({ name: null })]);
    expect(unnamed.name).toBe('');

    const otherId = (await crmService.createVenueLead({ venue_name: 'Other', city: 'Pune', full_address: '2 Banquet Lane', contacts: [] }))!.id;
    const _id = new Types.ObjectId();
    await CrmLeadMediaModel.collection.insertOne({
      _id,
      entity_type: 'VENUE_LEAD',
      lead_id: new Types.ObjectId(otherId),
      kind: 'IMAGE',
      url: 'https://cdn.example.com/old.png',
    });

    expect(await svc.list('VENUE_LEAD', otherId)).toEqual([
      {
        id: String(_id),
        entity_type: 'VENUE_LEAD',
        lead_id: otherId,
        kind: 'IMAGE',
        url: 'https://cdn.example.com/old.png',
        name: '',
        mime_type: '',
        size_bytes: null,
        width: null,
        height: null,
        sort_order: 0,
        uploaded_by: null,
        created_at: null,
        updated_at: null,
      },
    ]);
  });

  it('keeps each lead’s media to itself, across kinds of lead too', async () => {
    const venueId = await venueLead();
    const creator = await prospectLeadService.create('CREATOR_LEAD', { creator_name: 'Riya', contacts: [] });

    await svc.add('VENUE_LEAD', venueId, [img()]);
    await svc.add('CREATOR_LEAD', creator!.id, [logo(), img()]);

    expect(await svc.list('VENUE_LEAD', venueId)).toHaveLength(1);
    expect((await svc.list('CREATOR_LEAD', creator!.id)).map((m) => m.kind)).toEqual(['LOGO', 'IMAGE']);
    // The same id under another lead type is a different lead.
    expect(await svc.list('HOST_LEAD', venueId)).toEqual([]);
  });

  it.each([
    [[img({ url: 'http://cdn.example.com/a.png' })], 'Images must be uploaded files served over https'],
    [[img({ url: 'javascript:alert(1)' })], 'Images must be uploaded files served over https'],
    [[img({ url: '' })], 'Images must be uploaded files served over https'],
    [[img({ mime_type: 'image/bmp' })], 'Upload a PNG, JPG, WebP, GIF or SVG image'],
    [[img({ mime_type: 'application/pdf' })], 'Upload a PNG, JPG, WebP, GIF or SVG image'],
    [[img({ kind: 'BANNER' })], 'Pick Logo or Image'],
    [[img(), img({ kind: null })], 'Pick Logo or Image'],
    [[], 'Add at least one image'],
  ])('refuses %p and stores nothing', async (items, message) => {
    const leadId = await venueLead();
    await expect(svc.add('VENUE_LEAD', leadId, items)).rejects.toMatchObject(badInput(message));
    expect(await CrmLeadMediaModel.countDocuments()).toBe(0);
  });

  it('refuses an unknown lead type, a malformed id and a lead that does not exist', async () => {
    const leadId = await venueLead();
    await expect(svc.add('PARTNER_LEAD', leadId, [img()])).rejects.toMatchObject(badInput('Unknown lead type'));
    await expect(svc.list('PARTNER_LEAD', leadId)).rejects.toMatchObject(badInput('Unknown lead type'));
    await expect(svc.add('VENUE_LEAD', 'junk', [img()])).rejects.toMatchObject(notFound('Lead not found'));
    await expect(svc.list('VENUE_LEAD', 'junk')).rejects.toMatchObject(notFound('Lead not found'));
    await expect(svc.add('VENUE_LEAD', new Types.ObjectId().toHexString(), [img()])).rejects.toMatchObject(
      notFound('Lead not found')
    );
    // A venue id is not a host lead.
    await expect(svc.add('HOST_LEAD', leadId, [img()])).rejects.toMatchObject(notFound('Lead not found'));
    expect(await CrmLeadMediaModel.countDocuments()).toBe(0);
  });

  it(`holds at most ${CRM_LEAD_MEDIA_LIMITS.LOGO} logos and ${CRM_LEAD_MEDIA_LIMITS.IMAGE} images per lead`, async () => {
    const leadId = await venueLead();
    const many = (make: typeof img, n: number) => Array.from({ length: n }, (_, i) => make({ name: `#${i}` }));

    await svc.add('VENUE_LEAD', leadId, many(logo, 9));
    await expect(svc.add('VENUE_LEAD', leadId, many(logo, 2))).rejects.toMatchObject(badInput('A lead can hold up to 10 logos'));
    await svc.add('VENUE_LEAD', leadId, many(logo, 1));
    await expect(svc.add('VENUE_LEAD', leadId, [logo()])).rejects.toMatchObject(badInput('A lead can hold up to 10 logos'));

    // A full logo shelf does not block images, and the image limit is its own.
    await svc.add('VENUE_LEAD', leadId, many(img, 50));
    await expect(svc.add('VENUE_LEAD', leadId, [img()])).rejects.toMatchObject(badInput('A lead can hold up to 50 images'));
    // One over-limit kind refuses the whole batch.
    await expect(svc.add('VENUE_LEAD', leadId, [img(), logo()])).rejects.toMatchObject(badInput(/A lead can hold up to/));
    expect(await CrmLeadMediaModel.countDocuments()).toBe(60);
  });
});

describe('leadMediaService.update', () => {
  it('renames and replaces the file of one item, keeping its place', async () => {
    const leadId = await venueLead();
    const [item] = await svc.add('VENUE_LEAD', leadId, [img({ width: 100, height: 100 })]);

    const renamed = await svc.update(item.id, { name: '  Storefront  ' });
    expect(renamed).toMatchObject({ id: item.id, name: 'Storefront', url: item.url, width: 100 });

    const replaced = await svc.update(item.id, { url: 'https://cdn.example.com/new.png', mime_type: 'image/png', size_bytes: 10 });
    expect(replaced).toMatchObject({
      id: item.id,
      name: 'Storefront',
      url: 'https://cdn.example.com/new.png',
      mime_type: 'image/png',
      size_bytes: 10,
      width: null,
      height: null,
      sort_order: 0,
    });
  });

  it('re-files a logo as an image and back while there is room', async () => {
    const leadId = await venueLead();
    const [item] = await svc.add('VENUE_LEAD', leadId, [logo()]);

    expect((await svc.update(item.id, { kind: 'IMAGE' })).kind).toBe('IMAGE');
    expect((await svc.update(item.id, { kind: 'LOGO' })).kind).toBe('LOGO');
    // Re-filing into the kind it already is never counts against the limit.
    expect((await svc.update(item.id, { kind: 'LOGO', name: 'Same' })).name).toBe('Same');
  });

  it('refuses to re-file into a kind that is full', async () => {
    const leadId = await venueLead();
    await svc.add('VENUE_LEAD', leadId, Array.from({ length: 10 }, () => logo()));
    const [image] = (await svc.add('VENUE_LEAD', leadId, [img()])).filter((m) => m.kind === 'IMAGE');

    await expect(svc.update(image.id, { kind: 'LOGO' })).rejects.toMatchObject(badInput('A lead can hold up to 10 logos'));
    expect((await CrmLeadMediaModel.findById(image.id).lean())?.kind).toBe('IMAGE');
  });

  it('counts the limit per lead, so another lead’s full shelf does not matter', async () => {
    const full = await venueLead();
    const other = (await crmService.createVenueLead({ venue_name: 'Other', city: 'Pune', full_address: '2 Banquet Lane', contacts: [] }))!.id;
    await svc.add('VENUE_LEAD', full, Array.from({ length: 10 }, () => logo()));
    const [image] = await svc.add('VENUE_LEAD', other, [img()]);

    expect((await svc.update(image.id, { kind: 'LOGO' })).kind).toBe('LOGO');
  });

  it('refuses an empty change, invalid values and a missing item', async () => {
    const leadId = await venueLead();
    const [item] = await svc.add('VENUE_LEAD', leadId, [img()]);

    await expect(svc.update(item.id, {})).rejects.toMatchObject(badInput('Nothing to change'));
    await expect(svc.update(item.id, { url: 'http://x.example/a.png' })).rejects.toMatchObject(badInput(/https/));
    await expect(svc.update(item.id, { url: 'https://x.example/a.tif', mime_type: 'image/tiff' })).rejects.toMatchObject(
      badInput(/PNG, JPG, WebP, GIF or SVG/)
    );
    await expect(svc.update(item.id, { kind: 'BANNER' })).rejects.toMatchObject(badInput('Pick Logo or Image'));
    await expect(svc.update('junk', { name: 'x' })).rejects.toMatchObject(notFound('Image not found'));
    await expect(svc.update(new Types.ObjectId().toHexString(), { name: 'x' })).rejects.toMatchObject(notFound('Image not found'));
    await expect(svc.update(new Types.ObjectId().toHexString(), { kind: 'LOGO' })).rejects.toMatchObject(
      notFound('Image not found')
    );
    expect((await CrmLeadMediaModel.findById(item.id).lean())?.url).toBe('https://cdn.example.com/photo.jpg');
  });
});

describe('leadMediaService.remove and removeLeadMedia', () => {
  it('removes one item and reports a missing or malformed one', async () => {
    const leadId = await venueLead();
    const [a, b] = await svc.add('VENUE_LEAD', leadId, [img(), img()]);

    expect(await svc.remove(a.id)).toBe(true);
    expect((await svc.list('VENUE_LEAD', leadId)).map((m) => m.id)).toEqual([b.id]);
    await expect(svc.remove(a.id)).rejects.toMatchObject(notFound('Image not found'));
    await expect(svc.remove('junk')).rejects.toMatchObject(notFound('Image not found'));
  });

  it('removes every item of one lead only, and ignores a malformed id', async () => {
    const leadId = await venueLead();
    const otherId = (await crmService.createVenueLead({ venue_name: 'Other', city: 'Pune', full_address: '2 Banquet Lane', contacts: [] }))!.id;
    await svc.add('VENUE_LEAD', leadId, [img(), logo()]);
    await svc.add('VENUE_LEAD', otherId, [img()]);

    expect(await removeLeadMedia('HOST_LEAD', leadId)).toBe(0);
    expect(await removeLeadMedia('VENUE_LEAD', 'junk')).toBe(0);
    expect(await removeLeadMedia('VENUE_LEAD', leadId)).toBe(2);
    expect(await svc.list('VENUE_LEAD', otherId)).toHaveLength(1);
  });
});

describe('lead media resolvers', () => {
  const crm = () => makeContext({ id: 'crm-9', roles: ['CRM_MANAGER'] });

  it('lets CRM staff list, add, update and delete, recording the uploader', async () => {
    const leadId = await venueLead();

    const added = await leadMediaResolvers.Mutation.addCrmLeadMedia(
      {},
      { entity_type: 'VENUE_LEAD', lead_id: leadId, items: [img()] },
      crm()
    );
    expect(added[0].uploaded_by).toBe('crm-9');
    expect(await leadMediaResolvers.Query.crmLeadMedia({}, { entity_type: 'VENUE_LEAD', lead_id: leadId }, makeContext({ roles: ['SUPER_ADMIN'] }))).toHaveLength(1);
    expect((await leadMediaResolvers.Mutation.updateCrmLeadMedia({}, { id: added[0].id, input: { name: 'Renamed' } }, crm())).name).toBe('Renamed');
    expect(await leadMediaResolvers.Mutation.deleteCrmLeadMedia({}, { id: added[0].id }, crm())).toBe(true);
  });

  it.each([
    ['a member', () => makeContext({ roles: ['USER'] }), 'FORBIDDEN'],
    ['an anonymous caller', () => makeContext(null), 'UNAUTHENTICATED'],
  ])('refuses %s on every query and mutation', async (_who, ctx, code) => {
    const leadId = await venueLead();
    const [item] = await svc.add('VENUE_LEAD', leadId, [img()]);
    const calls: (() => unknown)[] = [
      () => leadMediaResolvers.Query.crmLeadMedia({}, { entity_type: 'VENUE_LEAD', lead_id: leadId }, ctx()),
      () => leadMediaResolvers.Mutation.addCrmLeadMedia({}, { entity_type: 'VENUE_LEAD', lead_id: leadId, items: [img()] }, ctx()),
      () => leadMediaResolvers.Mutation.updateCrmLeadMedia({}, { id: item.id, input: { name: 'x' } }, ctx()),
      () => leadMediaResolvers.Mutation.deleteCrmLeadMedia({}, { id: item.id }, ctx()),
    ];
    for (const call of calls) {
      await expect((async () => call())()).rejects.toMatchObject({ extensions: { code } });
    }
    expect(await CrmLeadMediaModel.find().lean()).toEqual([expect.objectContaining({ name: 'Photo' })]);
  });
});
