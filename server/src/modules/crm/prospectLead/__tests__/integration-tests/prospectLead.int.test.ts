import { Types } from 'mongoose';
import type { GraphQLContext } from '@context';
import { commsService } from '@services/comms/comms.service';
import { CommunicationLogModel } from '@modules/crm/communicationLog/communicationLog.model';
import { crmService } from '@modules/crm/crm/crm.service';
import { CrmLeadMediaModel } from '@modules/crm/leadMedia/leadMedia.model';
import { prospectLeadService } from '../../prospectLead.service';
import { prospectLeadResolvers } from '../../prospectLead.resolver';
import { CommunityLeadModel, CreatorLeadModel } from '../../prospectLead.model';

/**
 * Creator and community leads: CRUD with the one-phone-per-lead rule, the
 * server-side table, numeric normalisation, the generic contact email / call,
 * manual notes, dynamic-field opt-in, and the CRM-only gate on every resolver.
 */
afterEach(() => jest.restoreAllMocks());

const creatorInput = (over: Record<string, unknown> = {}) => ({
  creator_name: 'Riya Runs',
  handle: '@riyaruns',
  primary_platform: 'Instagram',
  niches: ['Fitness', 'Running'],
  followers_count: 48200,
  engagement_rate: 4.5,
  city: 'Pune',
  contacts: [{ name: 'Riya', mobile_number: '+919811100001', email: 'riya@example.com' }],
  ...over,
});

const communityInput = (over: Record<string, unknown> = {}) => ({
  community_name: 'Pune Trail Runners',
  community_type: 'Running Club',
  platform: 'WhatsApp',
  member_count: 320,
  meetup_frequency: 'Weekly',
  interests: ['Trail running'],
  city: 'Pune',
  contacts: [{ name: 'Kabir', mobile_number: '+919822200002' }],
  ...over,
});

describe('creator leads', () => {
  it('creates, reads, updates and deletes a creator lead', async () => {
    const lead = await prospectLeadService.create('CREATOR_LEAD', creatorInput({ tags: [' fitness ', ''] }));
    expect(lead).toMatchObject({
      creator_name: 'Riya Runs',
      primary_platform: 'Instagram',
      niches: ['Fitness', 'Running'],
      followers_count: 48200,
      engagement_rate: 4.5,
      tags: ['fitness'],
      lead_status: 'New',
      priority: 'Medium',
      dynamic_values_json: '{}',
    });

    expect(await prospectLeadService.get('CREATOR_LEAD', lead!.id)).toMatchObject({ handle: '@riyaruns' });
    expect(await prospectLeadService.get('CREATOR_LEAD', new Types.ObjectId().toHexString())).toBeNull();

    const updated = await prospectLeadService.update('CREATOR_LEAD', lead!.id, {
      creator_name: 'Riya Runs Daily',
      collaboration_types: ['Barter'],
      next_follow_up_date: '2026-12-01T00:00:00.000Z',
      dynamic_values_json: '{"rate_note":"barter first"}',
    });
    expect(updated).toMatchObject({
      creator_name: 'Riya Runs Daily',
      collaboration_types: ['Barter'],
      next_follow_up_date: '2026-12-01T00:00:00.000Z',
      dynamic_values_json: '{"rate_note":"barter first"}',
    });

    expect(await prospectLeadService.remove('CREATOR_LEAD', lead!.id)).toBe(true);
    await expect(prospectLeadService.remove('CREATOR_LEAD', lead!.id)).rejects.toThrow('Creator lead not found');
    await expect(prospectLeadService.update('CREATOR_LEAD', lead!.id, { creator_name: 'X' })).rejects.toThrow(
      'Creator lead not found'
    );
  });

  it('stores blank or invalid numbers as null, never as 0', async () => {
    const lead = await prospectLeadService.create(
      'CREATOR_LEAD',
      creatorInput({ followers_count: '', engagement_rate: -3, contacts: [] })
    );
    expect(lead).toMatchObject({ followers_count: null, engagement_rate: null });
    const stored = await prospectLeadService.update('CREATOR_LEAD', lead!.id, { creator_name: 'Riya', followers_count: '1200' });
    expect(stored!.followers_count).toBe(1200);
  });

  it('refuses the same phone on a second creator lead and on a community lead alike', async () => {
    await prospectLeadService.create('CREATOR_LEAD', creatorInput());
    await expect(
      prospectLeadService.create('CREATOR_LEAD', creatorInput({ creator_name: 'Copy', contacts: [{ mobile_number: '09811100001' }] }))
    ).rejects.toThrow('Phone number 09811100001 already belongs to Creator lead "Riya Runs".');
    // Duplicates are checked across every lead kind, not within one.
    await expect(
      prospectLeadService.create('COMMUNITY_LEAD', communityInput({ contacts: [{ mobile_number: '+919811100001' }] }))
    ).rejects.toMatchObject({ extensions: { code: 'DUPLICATE_LEAD' } });
  });

  it('requires a creator name', async () => {
    await expect(prospectLeadService.create('CREATOR_LEAD', creatorInput({ creator_name: '' }))).rejects.toThrow(/creator_name/);
  });
});

describe('community leads', () => {
  it('serves the communityLeadsTable page with search, filter and sort', async () => {
    await prospectLeadService.create('COMMUNITY_LEAD', communityInput());
    await prospectLeadService.create(
      'COMMUNITY_LEAD',
      communityInput({ community_name: 'Mumbai Book Circle', community_type: 'Book Club', platform: 'Telegram', member_count: 90, city: 'Mumbai', contacts: [] })
    );
    await prospectLeadService.create(
      'COMMUNITY_LEAD',
      communityInput({ community_name: 'Delhi Paws', community_type: 'Pet Owners', member_count: 1500, city: 'Delhi', contacts: [] })
    );

    const all = await prospectLeadService.table('COMMUNITY_LEAD');
    expect(all.total).toBe(3);

    const search = await prospectLeadService.table('COMMUNITY_LEAD', { search: 'telegram' });
    expect(search.rows.map((r) => r!.community_name)).toEqual(['Mumbai Book Circle']);

    const bySize = await prospectLeadService.table('COMMUNITY_LEAD', { sort_by: 'member_count', sort_dir: 'desc' });
    expect(bySize.rows.map((r) => r!.member_count)).toEqual([1500, 320, 90]);

    const pune = await prospectLeadService.table('COMMUNITY_LEAD', {
      filters: [{ field: 'city', op: 'eq', value: 'Pune' }],
    });
    expect(pune.rows.map((r) => r!.community_name)).toEqual(['Pune Trail Runners']);
  });

  it('never leaks one kind into the other kind’s table', async () => {
    await prospectLeadService.create('CREATOR_LEAD', creatorInput());
    expect((await prospectLeadService.table('COMMUNITY_LEAD')).total).toBe(0);
    expect(await CommunityLeadModel.countDocuments()).toBe(0);
    expect(await CreatorLeadModel.countDocuments()).toBe(1);
  });
});

describe('contact actions and manual logs', () => {
  it('emails a creator contact and logs it SENT on the lead and in Communications', async () => {
    const send = jest.spyOn(commsService, 'sendEmail').mockResolvedValue({ ok: true, message: 'Sent', provider: 'smtp' });
    const lead = await prospectLeadService.create('CREATOR_LEAD', creatorInput());

    const result = await prospectLeadService.email(
      'CREATOR_LEAD',
      lead!.id,
      { to: 'riya@example.com', subject: 'Collab', body: '<p>Hi</p>' },
      'crm-1'
    );

    expect(result.ok).toBe(true);
    expect(send).toHaveBeenCalledWith({ to: 'riya@example.com', subject: 'Collab', body: '<p>Hi</p>', provider_id: undefined, attachments: undefined });
    const log = await CommunicationLogModel.findOne({ entity_id: new Types.ObjectId(lead!.id) }).lean();
    expect(log).toMatchObject({ type: 'EMAIL', entity_type: 'CREATOR_LEAD', status: 'SENT', created_by: 'crm-1' });
    const stored = await CreatorLeadModel.findById(lead!.id).lean();
    expect(stored!.activity_log[0]).toMatchObject({ type: 'EMAIL', summary: 'Collab', status: 'SENT' });
  });

  it('logs a failed community call with the provider’s reason', async () => {
    jest.spyOn(commsService, 'call').mockResolvedValue({ ok: false, message: 'Twilio is not configured for calls', provider: 'twilio' });
    const lead = await prospectLeadService.create('COMMUNITY_LEAD', communityInput());

    const result = await prospectLeadService.call('COMMUNITY_LEAD', lead!.id, '+919822200002');

    expect(result.ok).toBe(false);
    const log = await CommunicationLogModel.findOne({ entity_type: 'COMMUNITY_LEAD' }).lean();
    expect(log).toMatchObject({ type: 'CALL', status: 'FAILED', error_message: 'Twilio is not configured for calls' });
  });

  it('refuses contact actions on a missing lead without contacting anyone', async () => {
    const send = jest.spyOn(commsService, 'sendEmail');
    const call = jest.spyOn(commsService, 'call');
    const missing = new Types.ObjectId().toHexString();
    await expect(
      prospectLeadService.email('COMMUNITY_LEAD', missing, { to: 'a@example.com', subject: 's', body: 'b' })
    ).rejects.toThrow('Community lead not found');
    await expect(prospectLeadService.call('CREATOR_LEAD', missing, '+919800000000')).rejects.toThrow('Creator lead not found');
    expect(send).not.toHaveBeenCalled();
    expect(call).not.toHaveBeenCalled();
  });

  it('adds a manual note to creator and community leads', async () => {
    const creator = await prospectLeadService.create('CREATOR_LEAD', creatorInput());
    const community = await prospectLeadService.create('COMMUNITY_LEAD', communityInput());

    await crmService.addManualLog({ entity_type: 'CREATOR_LEAD', entity_id: creator!.id, body_html: '<p>Asked for rates</p>' });
    await crmService.addManualLog({ entity_type: 'COMMUNITY_LEAD', entity_id: community!.id, body_html: '<p>Admin call done</p>' });

    expect((await CreatorLeadModel.findById(creator!.id).lean())!.activity_log[0]).toMatchObject({ type: 'NOTE' });
    expect((await CommunityLeadModel.findById(community!.id).lean())!.activity_log[0]).toMatchObject({ type: 'NOTE' });
    await expect(
      crmService.addManualLog({ entity_type: 'COMMUNITY_LEAD', entity_id: new Types.ObjectId().toHexString(), body_html: '<p>x</p>' })
    ).rejects.toThrow('Community lead not found');
  });
});

describe('dynamic fields for creator and community leads', () => {
  it('offers a field to creator / community forms only when opted in', async () => {
    await crmService.createDynamicField({ name: 'venue_host_only', sort_order: 1 });
    await crmService.createDynamicField({ name: 'creator_rate', applies_to_creator: true, sort_order: 2 });
    await crmService.createDynamicField({ name: 'community_size_band', applies_to_community: true, sort_order: 3 });
    await crmService.createDynamicField({ name: 'both_new', applies_to_creator: true, applies_to_community: true, sort_order: 4 });

    const names = async (entity: 'CREATOR_LEAD' | 'COMMUNITY_LEAD') =>
      (await crmService.listDynamicFields(entity)).map((f) => f!.name);
    expect(await names('CREATOR_LEAD')).toEqual(['creator_rate', 'both_new']);
    expect(await names('COMMUNITY_LEAD')).toEqual(['community_size_band', 'both_new']);
  });

  it('updates the creator / community flags and reads them back', async () => {
    const field = await crmService.createDynamicField({ name: 'follow_up_owner' });
    expect(field).toMatchObject({ applies_to_creator: false, applies_to_community: false });
    const updated = await crmService.updateDynamicField(field!.id, { applies_to_community: true });
    expect(updated).toMatchObject({ applies_to_creator: false, applies_to_community: true });
  });

  it('serves the creator and community pick-lists in the lead config', async () => {
    const config = await crmService.config();
    expect(config.creator_platforms).toContain('Instagram');
    expect(config.collaboration_types).toContain('Barter');
    expect(config.community_types).toContain('Running Club');
    expect(config.community_platforms).toContain('WhatsApp');
  });
});

describe('prospect lead resolvers', () => {
  const crm = { user: { id: 'crm-1', roles: ['CRM_MANAGER'] } } as unknown as GraphQLContext;
  const member = { user: { id: 'u-1', roles: ['USER'] } } as unknown as GraphQLContext;
  const anonymous = {} as GraphQLContext;

  it('lets CRM staff create and list leads', async () => {
    const created = await prospectLeadResolvers.Mutation.createCommunityLead(null, { input: communityInput() }, crm);
    const page = await prospectLeadResolvers.Query.communityLeadsTable(null, {}, crm);
    expect(page.rows.map((r) => r!.id)).toEqual([created!.id]);
  });

  it.each([
    ['a signed-in member', member, 'Access Denied'],
    ['an anonymous caller', anonymous, /./],
  ])('refuses %s on every query and mutation', async (_who, ctx, message) => {
    const lead = await prospectLeadService.create('CREATOR_LEAD', creatorInput());
    const calls: (() => unknown)[] = [
      () => prospectLeadResolvers.Query.creatorLeadsTable(null, {}, ctx),
      () => prospectLeadResolvers.Query.creatorLead(null, { id: lead!.id }, ctx),
      () => prospectLeadResolvers.Mutation.createCreatorLead(null, { input: creatorInput() }, ctx),
      () => prospectLeadResolvers.Mutation.updateCreatorLead(null, { id: lead!.id, input: { creator_name: 'X' } }, ctx),
      () => prospectLeadResolvers.Mutation.deleteCreatorLead(null, { id: lead!.id }, ctx),
      () =>
        prospectLeadResolvers.Mutation.callCrmLeadContact(
          null,
          { entity_type: 'CREATOR_LEAD', id: lead!.id, contact_number: '+919800000000' },
          ctx
        ),
    ];
    for (const call of calls) {
      await expect((async () => call())()).rejects.toThrow(message);
    }
    expect(await CreatorLeadModel.countDocuments()).toBe(1);
  });
});

describe('services offered and social links on prospect leads', () => {
  it('stores both on a community lead and reads them back', async () => {
    const lead = await prospectLeadService.create(
      'COMMUNITY_LEAD',
      communityInput({
        services_offered: [{ service: 'Venue partnerships' }, { service: 'Other', custom_name: 'Trail mapping', description: 'Weekly' }],
        social_links: [{ name: '', url: 'https://www.strava.com/clubs/pune-trail' }, { url: '  ' }],
      })
    );

    const services = [
      { service: 'Venue partnerships', custom_name: '', description: '' },
      { service: 'Other', custom_name: 'Trail mapping', description: 'Weekly' },
    ];
    const links = [{ name: 'strava.com', url: 'https://www.strava.com/clubs/pune-trail' }];
    expect(lead).toMatchObject({ services_offered: services, social_links: links });
    expect(await prospectLeadService.get('COMMUNITY_LEAD', lead!.id)).toMatchObject({ services_offered: services, social_links: links });
  });

  it('replaces them on a creator lead update and keeps them when they are not sent', async () => {
    const lead = await prospectLeadService.create(
      'CREATOR_LEAD',
      creatorInput({ social_links: [{ name: 'YouTube', url: 'https://youtube.com/@riyaruns' }] })
    );

    const untouched = await prospectLeadService.update('CREATOR_LEAD', lead!.id, { creator_name: 'Riya R' });
    expect(untouched!.social_links).toEqual([{ name: 'YouTube', url: 'https://youtube.com/@riyaruns' }]);
    expect(untouched!.services_offered).toEqual([]);

    const updated = await prospectLeadService.update('CREATOR_LEAD', lead!.id, {
      social_links: [{ name: 'Threads', url: 'https://threads.net/@riyaruns' }],
      services_offered: [{ service: 'Sponsored reels' }],
    });
    expect(updated).toMatchObject({
      social_links: [{ name: 'Threads', url: 'https://threads.net/@riyaruns' }],
      services_offered: [{ service: 'Sponsored reels', custom_name: '', description: '' }],
    });
  });

  it('refuses a javascript: link on create and on update', async () => {
    await expect(
      prospectLeadService.create('CREATOR_LEAD', creatorInput({ social_links: [{ name: 'x', url: 'javascript:alert(1)' }] }))
    ).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
    expect(await CreatorLeadModel.countDocuments()).toBe(0);

    const lead = await prospectLeadService.create('COMMUNITY_LEAD', communityInput());
    await expect(
      prospectLeadService.update('COMMUNITY_LEAD', lead!.id, { social_links: [{ url: 'javascript:alert(1)' }] })
    ).rejects.toThrow('"javascript:alert(1)" is not a web link');
    expect((await prospectLeadService.get('COMMUNITY_LEAD', lead!.id))!.social_links).toEqual([]);
  });
});

describe('deleting a prospect lead', () => {
  it.each([
    ['CREATOR_LEAD', () => creatorInput()],
    ['COMMUNITY_LEAD', () => communityInput()],
  ] as const)('removes the %s’s logos and images and nobody else’s', async (kind, input) => {
    const lead = await prospectLeadService.create(kind, input());
    const other = await prospectLeadService.create(kind, { ...input(), contacts: [] });
    const media = (lead_id: string) => ({
      entity_type: kind,
      lead_id: new Types.ObjectId(lead_id),
      kind: 'LOGO',
      url: 'https://cdn.example.com/l.png',
    });
    await CrmLeadMediaModel.create([media(lead!.id), media(lead!.id), media(other!.id)]);

    expect(await prospectLeadService.remove(kind, lead!.id)).toBe(true);

    expect(await CrmLeadMediaModel.countDocuments({ lead_id: new Types.ObjectId(lead!.id) })).toBe(0);
    expect(await CrmLeadMediaModel.countDocuments({ lead_id: new Types.ObjectId(other!.id) })).toBe(1);
  });

  it('removes no media when the lead does not exist', async () => {
    const ghost = new Types.ObjectId().toHexString();
    await CrmLeadMediaModel.create({ entity_type: 'CREATOR_LEAD', lead_id: new Types.ObjectId(ghost), kind: 'IMAGE', url: 'https://cdn.example.com/a.png' });
    await expect(prospectLeadService.remove('CREATOR_LEAD', ghost)).rejects.toThrow('Creator lead not found');
    expect(await CrmLeadMediaModel.countDocuments()).toBe(1);
  });
});
