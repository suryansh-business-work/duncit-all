/**
 * The Duncit account behind a CRM lead, on a real database: how a lead's
 * contacts match an account, that a table page costs one user query, the
 * platforms and last activity the CRM shows, and the Devices filter on the
 * lead tables — with and without the map radius.
 */
jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn().mockResolvedValue('') }));

import { Types } from 'mongoose';
import type { GraphQLContext } from '@context';
import { UserModel } from '@modules/access/user/user.model';
import { LocationModel } from '@modules/platform/location/location.model';
import { HostLeadModel, VenueLeadModel } from '@modules/crm/crm/crm.model';
import { crmService } from '@modules/crm/crm/crm.service';
import { crmResolvers } from '@modules/crm/crm/crm.resolver';
import { leadSurveyService } from '@modules/survey/leadSurvey.service';
import { leadPlatformFilter, matchedUserForLead, splitPlatformFilter } from '../../leadUserMatch';

const LAST_SEEN = new Date('2026-11-23T10:30:00.000Z');

async function account(
  over: { email?: string; phone?: string; first?: string; platforms?: string[]; deleted?: boolean } = {},
) {
  const _id = new Types.ObjectId();
  await UserModel.collection.insertOne({
    _id,
    auth: {
      ...(over.email ? { email: over.email } : {}),
      ...(over.phone ? { phone: { extension: '+91', number: over.phone } } : {}),
    },
    profile: { first_name: over.first ?? 'Asha', last_name: 'Rao', profile_photo: 'https://img.example.test/a.jpg' },
    metadata: { status: 'ACTIVE', role_keys: ['USER'], deleted_at: over.deleted ? new Date() : null },
    ...(over.platforms ? { activity: { last_at: LAST_SEEN, platforms: over.platforms } } : {}),
  } as never);
  return _id.toHexString();
}

const contacts = (...list: Array<{ email?: string; mobile_number?: string; whatsapp_number?: string }>) => ({
  contacts: list,
});

describe('matchedUserForLead', () => {
  it('matches by contact email and carries the platforms and last activity', async () => {
    const id = await account({ email: 'asha@example.com', platforms: ['WEB', 'ANDROID'] });

    await expect(matchedUserForLead({}, contacts({ email: ' Asha@Example.com ' }))).resolves.toEqual({
      user_id: id,
      full_name: 'Asha Rao',
      email: 'asha@example.com',
      phone: null,
      profile_photo: 'https://img.example.test/a.jpg',
      matched_on: 'EMAIL',
      platforms_used: ['ANDROID', 'WEB'],
      last_activity_at: LAST_SEEN.toISOString(),
    });
  });

  it('matches by a contact WhatsApp number, and reads an account never seen as no platforms', async () => {
    const id = await account({ phone: '9876500001' });

    const match = await matchedUserForLead({}, contacts({ mobile_number: '1111', whatsapp_number: '9876500001' }));
    expect(match).toMatchObject({ user_id: id, matched_on: 'PHONE', platforms_used: [], last_activity_at: null });
  });

  it('prefers an email match over a phone match on the same lead', async () => {
    await account({ phone: '9876500002', first: 'Phone' });
    const byEmail = await account({ email: 'mail@example.com', first: 'Mail' });

    const match = await matchedUserForLead({}, contacts({ mobile_number: '9876500002' }, { email: 'mail@example.com' }));
    expect(match).toMatchObject({ user_id: byEmail, matched_on: 'EMAIL' });
  });

  it('never matches a deleted account, a lead without contact values, or values nobody holds', async () => {
    await account({ email: 'gone@example.com', deleted: true });

    await expect(matchedUserForLead({}, contacts({ email: 'gone@example.com' }))).resolves.toBeNull();
    await expect(matchedUserForLead({}, contacts({ email: '', mobile_number: '  ' }))).resolves.toBeNull();
    await expect(matchedUserForLead({}, null)).resolves.toBeNull();
    await expect(matchedUserForLead({}, contacts({ email: 'nobody@example.com' }))).resolves.toBeNull();
  });

  it('answers a whole page of leads with one user query', async () => {
    await account({ email: 'one@example.com' });
    await account({ phone: '9876500003' });
    const find = jest.spyOn(UserModel, 'find');
    const ctx = {};

    const [a, b, c] = await Promise.all([
      matchedUserForLead(ctx, contacts({ email: 'one@example.com' })),
      matchedUserForLead(ctx, contacts({ mobile_number: '9876500003' })),
      matchedUserForLead(ctx, contacts({ email: 'none@example.com' })),
    ]);

    expect(find).toHaveBeenCalledTimes(1);
    expect([a?.matched_on, b?.matched_on, c]).toEqual(['EMAIL', 'PHONE', null]);
    find.mockRestore();
  });

  it('is what VenueLead.matched_user and the survey service answer', async () => {
    const id = await account({ email: 'venue@example.com', platforms: ['IOS'] });
    const lead = { contacts: [{ email: 'venue@example.com' }] };

    const viaResolver = await crmResolvers.VenueLead.matched_user(lead, {}, {} as GraphQLContext);
    expect(viaResolver).toMatchObject({ user_id: id, platforms_used: ['IOS'] });
    await expect(leadSurveyService.matchedUserForLead(lead)).resolves.toMatchObject({ user_id: id });
  });
});

describe('splitPlatformFilter', () => {
  it('leaves a query without the Devices filter untouched', () => {
    const input = { search: 'x', filters: [{ field: 'city', op: 'eq' as const, value: 'Pune' }] };
    expect(splitPlatformFilter(input)).toEqual({ input, platforms: null });
    expect(splitPlatformFilter(undefined)).toEqual({ input: undefined, platforms: null });
  });

  it('lifts the Devices filter out and names its platforms in display order', () => {
    const split = splitPlatformFilter({
      filters: [
        { field: 'duncit_platforms', op: 'in', values: ['WEB', 'ANDROID'] },
        { field: 'duncit_platforms', op: 'eq', value: 'WEB' },
        { field: 'city', op: 'eq', value: 'Pune' },
      ],
    });
    expect(split.platforms).toEqual(['WEB', 'ANDROID']);
    expect(split.input?.filters).toEqual([{ field: 'city', op: 'eq', value: 'Pune' }]);
  });

  it('refuses another operator, an empty pick and a value that is not a platform', () => {
    const bad = (filter: object) => () => splitPlatformFilter({ filters: [{ field: 'duncit_platforms', ...filter } as never] });
    expect(bad({ op: 'contains', value: 'WEB' })).toThrow('only matches one or more platforms');
    expect(bad({ op: 'in', values: [] })).toThrow('Devices must be one or more of ANDROID, IOS, WEB.');
    expect(bad({ op: 'in' })).toThrow('Devices must be one or more of');
    expect(bad({ op: 'eq', value: 'TV' })).toThrow('Devices must be one or more of');
    expect(bad({ op: 'eq' })).toThrow('Devices must be one or more of');
  });
});

describe('the Devices filter on the lead tables', () => {
  beforeEach(async () => {
    await account({ email: 'android@example.com', platforms: ['ANDROID'] });
    await account({ phone: '9876500010', platforms: ['IOS', 'WEB'] });
    await account({ email: 'quiet@example.com' });
    await VenueLeadModel.create([
      { venue_name: 'Android Arena', city: 'Mumbai', area: 'Bandra', full_address: 'a', contacts: [{ email: 'android@example.com' }] },
      { venue_name: 'Phone Courts', city: 'Mumbai', area: 'Bandra', full_address: 'b', contacts: [{ whatsapp_number: '9876500010' }] },
      { venue_name: 'Quiet Cafe', city: 'Mumbai', area: 'Bandra', full_address: 'c', contacts: [{ email: 'quiet@example.com' }] },
      { venue_name: 'Stranger Hall', city: 'Mumbai', area: 'Bandra', full_address: 'd', contacts: [{ mobile_number: '9000000000' }] },
    ]);
  });

  const devices = (...values: string[]) => ({ filters: [{ field: 'duncit_platforms', op: 'in' as const, values }] });
  const names = (rows: Array<{ venue_name?: string }>) => rows.map((row) => row.venue_name).sort();

  it('keeps only the leads whose matched account used one of the picked platforms', async () => {
    expect(names((await crmService.venueLeadsTable(devices('ANDROID'))).rows)).toEqual(['Android Arena']);
    expect(names((await crmService.venueLeadsTable(devices('WEB'))).rows)).toEqual(['Phone Courts']);
    const either = await crmService.venueLeadsTable(devices('ANDROID', 'IOS'));
    expect(names(either.rows)).toEqual(['Android Arena', 'Phone Courts']);
    expect(either.total).toBe(2);
  });

  it('applies inside the map radius too', async () => {
    await LocationModel.create({
      location_id: `mumbai-${new Types.ObjectId().toString()}`,
      location_name: 'Mumbai',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      location_image: 'https://img.example.test/city.jpg',
      location_pincode: '400001',
      lat: 19.076,
      lng: 72.8777,
      location_zones: [{ zone_name: 'Bandra', lat: 19.0596, lng: 72.8295 }],
    });
    await VenueLeadModel.createIndexes();

    const page = await crmService.venueLeadsTable(devices('IOS'), { lat: 19.0596, lng: 72.8295, radius_km: 5 });
    expect(names(page.rows)).toEqual(['Phone Courts']);
  });

  it('matches no lead when no matched account used the platform, and every kind of lead table takes it', async () => {
    await HostLeadModel.create({ host_name: 'Lone Host', city: 'Pune', contacts: [{ email: 'android@example.com' }] });

    await expect(leadPlatformFilter(VenueLeadModel, ['IOS'])).resolves.toEqual({
      $or: [{ 'contacts.mobile_number': { $in: ['9876500010'] } }, { 'contacts.whatsapp_number': { $in: ['9876500010'] } }],
    });
    expect((await crmService.hostLeadsTable(devices('IOS'))).rows).toEqual([]);
    const hosts = (await crmService.hostLeadsTable(devices('ANDROID'))).rows as Array<{ host_name?: string }>;
    expect(hosts.map((row) => row.host_name)).toEqual(['Lone Host']);
    expect((await crmService.ecommLeadsTable(devices('WEB'))).total).toBe(0);
  });
});

describe('leadPlatformFilter on an empty collection', () => {
  it('matches nothing rather than everything', async () => {
    await expect(leadPlatformFilter(VenueLeadModel, ['WEB'])).resolves.toEqual({ _id: { $in: [] } });
  });
});
