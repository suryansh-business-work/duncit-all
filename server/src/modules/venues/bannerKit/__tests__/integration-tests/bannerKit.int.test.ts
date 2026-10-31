import { Types } from 'mongoose';
import type { GraphQLContext } from '@context';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { HostModel } from '@modules/venues/host/host.model';
import { UserModel } from '@modules/access/user/user.model';
import { venueService } from '@modules/venues/venue/venue.service';
import { hostService } from '@modules/venues/host/host.service';
import { EntityChangeLogModel } from '@modules/platform/entityAudit/entityAudit.model';
import { bannerKitResolvers } from '../../bannerKit.resolver';

/**
 * A venue's and a host's banner kit against the in-memory database: what an
 * old row reads as, what a save stores and refuses, and who may save it.
 */
// The first write in a fresh database creates its collections and indexes.
jest.setTimeout(30_000);

const CDN = 'https://ik.imagekit.io/duncit';
const { Venue, Host, Mutation } = bannerKitResolvers;

const as = (roles: string[], id = new Types.ObjectId().toHexString()) =>
  ({ user: { id, roles } }) as unknown as GraphQLContext;
const guest = { user: null } as unknown as GraphQLContext;

async function venueOf(owner: Types.ObjectId, over: Record<string, unknown> = {}) {
  return VenueModel.create({ owner_user_id: owner, venue_name: 'Blue Door Cafe', status: 'APPROVED', ...over });
}

async function hostOf(user: Types.ObjectId, over: Record<string, unknown> = {}) {
  return HostModel.create({ user_id: user, full_name: 'Asha Rao', status: 'APPROVED', ...over });
}

/** What the API answers for the venue's kit, read the way a client reads it. */
async function venueKit(id: string) {
  const venue = await venueService.getById(id);
  return Venue.banner_kit(must(venue));
}

async function hostKit(userId: string) {
  const host = await hostService.getByUser(userId);
  return Host.banner_kit(must(host));
}

/** The row a read must have found. */
function must<T>(value: T | null | undefined): T {
  if (value == null) throw new Error('Expected a row');
  return value;
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The change log is written fire-and-forget; waits until `expected` fields are in it. */
async function waitForLoggedFields(entityId: unknown, expected: string[]): Promise<string[]> {
  let fields: string[] = [];
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const rows = await EntityChangeLogModel.find({ entity_type: 'VENUE', entity_id: entityId }).lean();
    fields = rows.map((row) => row.field);
    if (expected.every((field) => fields.includes(field))) return fields;
    await pause(20);
  }
  return fields;
}

const refusal = (promise: Promise<unknown>) => promise.then(() => null, (err: { extensions?: { code?: string } }) => err.extensions?.code);

describe('banner kit reads', () => {
  it('reads a venue saved before kits existed as the defaults, prefilled from its cover and gallery', async () => {
    const owner = new Types.ObjectId();
    const venue = await venueOf(owner, {
      cover_image_url: `${CDN}/cover.jpg`,
      gallery: [`${CDN}/g1.jpg`, 'https://old.example.com/g2.jpg'],
    });
    await VenueModel.collection.updateOne({ _id: venue._id }, { $unset: { banner_kit: '' } });

    expect(await venueKit(String(venue._id))).toEqual({
      logo_url: `${CDN}/cover.jpg`,
      instagram_handle: '',
      photos: [
        { url: `${CDN}/cover.jpg`, caption: '' },
        { url: `${CDN}/g1.jpg`, caption: '' },
      ],
      event_photos: [],
      tagline: '',
      bio: '',
      brand_color: '',
      collab_opt_in: true,
      suggested_photos: [`${CDN}/cover.jpg`, `${CDN}/g1.jpg`],
    });
    // The prefill is a read: nothing was written.
    const raw = await VenueModel.collection.findOne({ _id: venue._id });
    expect(raw?.banner_kit).toBeUndefined();
  });

  it("suggests a host's profile photo, then their application photo", async () => {
    const user = await UserModel.create({ auth: { email: 'asha-kit@x.com' }, profile: { first_name: 'Asha', profile_photo: `${CDN}/me.jpg` } });
    await hostOf(user._id as Types.ObjectId, { passport_photo_url: `${CDN}/passport.jpg` });

    const kit = await hostKit(String(user._id));
    expect(kit.suggested_photos).toEqual([`${CDN}/me.jpg`, `${CDN}/passport.jpg`]);
    expect(kit.logo_url).toBe(`${CDN}/me.jpg`);
    expect(kit.event_photos).toEqual([]);
  });

  it('answers an empty kit for a host with no photos and no account', async () => {
    const user = new Types.ObjectId();
    await hostOf(user);
    const kit = await hostKit(String(user));
    expect(kit).toMatchObject({ logo_url: '', photos: [], suggested_photos: [], collab_opt_in: true });
  });
});

describe('updateVenueBannerKit', () => {
  it("saves the owner's kit, normalised, and records each field that moved in the venue change log", async () => {
    const owner = new Types.ObjectId();
    const venue = await venueOf(owner, { cover_image_url: `${CDN}/cover.jpg` });
    const saved = await Mutation.updateVenueBannerKit(
      null,
      {
        venue_id: String(venue._id),
        input: {
          instagram_handle: '@Blue.Door',
          photos: [{ url: `${CDN}/room.jpg`, caption: 'The back room' }],
          tagline: 'Games every Friday',
          brand_color: '#FF6600',
          collab_opt_in: false,
        },
      },
      as(['VENUE_OWNER'], String(owner))
    );

    const kit = Venue.banner_kit(must(saved));
    expect(kit).toMatchObject({
      instagram_handle: 'blue.door',
      photos: [{ url: `${CDN}/room.jpg`, caption: 'The back room' }],
      tagline: 'Games every Friday',
      brand_color: '#ff6600',
      collab_opt_in: false,
      // Saved now, so the cover is offered, not prefilled.
      logo_url: '',
      suggested_photos: [`${CDN}/cover.jpg`],
    });

    // A second save that sends only the bio keeps the rest.
    await Mutation.updateVenueBannerKit(null, { venue_id: String(venue._id), input: { bio: 'Since 2019.' } }, as([], String(owner)));
    expect(await venueKit(String(venue._id))).toMatchObject({ instagram_handle: 'blue.door', bio: 'Since 2019.' });

    const fields = await waitForLoggedFields(venue._id, ['banner_kit.instagram_handle', 'banner_kit.bio']);
    expect(fields).toEqual(expect.arrayContaining(['banner_kit.instagram_handle', 'banner_kit.tagline', 'banner_kit.bio']));
  });

  it.each([['ONBOARDING_MANAGER'], ['ALL_VENUES_ACCESS'], ['SUPER_ADMIN']])('lets a %s edit any venue', async (role) => {
    const venue = await venueOf(new Types.ObjectId());
    const saved = await Mutation.updateVenueBannerKit(null, { venue_id: String(venue._id), input: { tagline: 'Staff edit' } }, as([role]));
    expect(Venue.banner_kit(must(saved)).tagline).toBe('Staff edit');
  });

  it("refuses a partner who does not own the venue, and roles that cannot edit venues", async () => {
    const venue = await venueOf(new Types.ObjectId());
    const input = { tagline: 'Not mine' };
    expect(await refusal(Mutation.updateVenueBannerKit(null, { venue_id: String(venue._id), input }, as(['VENUE_OWNER'])))).toBe('FORBIDDEN');
    expect(await refusal(Mutation.updateVenueBannerKit(null, { venue_id: String(venue._id), input }, as(['ALL_HOSTS_ACCESS'])))).toBe('FORBIDDEN');
    expect(await refusal(Mutation.updateVenueBannerKit(null, { venue_id: String(venue._id), input }, as(['MARKETING_MANAGER'])))).toBe('FORBIDDEN');
    expect(() => Mutation.updateVenueBannerKit(null, { venue_id: String(venue._id), input }, guest)).toThrow(/not authenticated/i);
    expect((await venueKit(String(venue._id))).tagline).toBe('');
  });

  it('refuses a bad id, a missing venue and an invalid kit without saving any of it', async () => {
    const owner = new Types.ObjectId();
    const venue = await venueOf(owner);
    const ctx = as([], String(owner));
    expect(await refusal(Mutation.updateVenueBannerKit(null, { venue_id: 'nope', input: {} }, ctx))).toBe('BAD_USER_INPUT');
    expect(await refusal(Mutation.updateVenueBannerKit(null, { venue_id: new Types.ObjectId().toHexString(), input: {} }, ctx))).toBe('NOT_FOUND');
    const bad = { tagline: 'Fine', photos: [{ url: 'https://evil.example.com/x.jpg' }] };
    expect(await refusal(Mutation.updateVenueBannerKit(null, { venue_id: String(venue._id), input: bad }, ctx))).toBe('BAD_USER_INPUT');
    expect((await venueKit(String(venue._id))).tagline).toBe('');
  });
});

describe('updateHostBannerKit', () => {
  it('saves the host’s own kit, event photos included', async () => {
    const user = new Types.ObjectId();
    const host = await hostOf(user);
    const saved = await Mutation.updateHostBannerKit(
      null,
      {
        host_id: String(host._id),
        input: { event_photos: [{ url: `${CDN}/quiz.jpg`, caption: 'Quiz night' }], bio: 'I run quiz nights.' },
      },
      as(['HOST'], String(user))
    );
    const kit = await Host.banner_kit(must(saved));
    expect(kit).toMatchObject({ event_photos: [{ url: `${CDN}/quiz.jpg`, caption: 'Quiz night' }], bio: 'I run quiz nights.' });
    // The host reads back the plain row, never the commission figures.
    expect(saved?.host_commission_pct).toBeNull();
  });

  it.each([['ONBOARDING_MANAGER'], ['ALL_HOSTS_ACCESS'], ['CITY_ADMIN']])('lets a %s edit any host', async (role) => {
    const host = await hostOf(new Types.ObjectId());
    const saved = await Mutation.updateHostBannerKit(null, { host_id: String(host._id), input: { tagline: 'Staff edit' } }, as([role]));
    expect((await Host.banner_kit(must(saved))).tagline).toBe('Staff edit');
  });

  it('refuses another host and a venues-console role, and a bad or missing host', async () => {
    const host = await hostOf(new Types.ObjectId());
    const input = { tagline: 'Not mine' };
    expect(await refusal(Mutation.updateHostBannerKit(null, { host_id: String(host._id), input }, as(['HOST'])))).toBe('FORBIDDEN');
    expect(await refusal(Mutation.updateHostBannerKit(null, { host_id: String(host._id), input }, as(['ALL_VENUES_ACCESS'])))).toBe('FORBIDDEN');
    expect(await refusal(Mutation.updateHostBannerKit(null, { host_id: 'nope', input }, as(['SUPER_ADMIN'])))).toBe('BAD_USER_INPUT');
    expect(await refusal(Mutation.updateHostBannerKit(null, { host_id: new Types.ObjectId().toHexString(), input }, as(['SUPER_ADMIN'])))).toBe('NOT_FOUND');
    expect(() => Mutation.updateHostBannerKit(null, { host_id: String(host._id), input }, guest)).toThrow(/not authenticated/i);
  });
});
