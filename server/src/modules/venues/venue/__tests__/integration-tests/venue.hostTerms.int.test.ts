/**
 * A venue's Fees & Minimum Spend for a host weighing it (Venues list cards and
 * Venue Details on mWeb and the app): only an active host gets it, only for
 * APPROVED, active venues, in the order asked.
 */
import { Types } from 'mongoose';
import { makeContext } from '@test/harness';
import { UserRoleModel } from '@modules/access/user/relations';
import { HostModel } from '@modules/venues/host/host.model';
import { settingsService } from '@modules/platform/settings/settings.service';
import { activeHostStatus, assertActiveHost } from '@modules/pods/pod/pod.validation';
import { VenueModel } from '../../venue.model';
import { venueResolvers } from '../../venue.resolver';
import { VENUE_HOST_TERMS_MAX_IDS, venueHostTermsFor } from '../../venue.hostTerms';

const platform = async () => ({ min_guests: 6, response_hours: 24 });

async function seedVenue(overrides: Record<string, unknown> = {}) {
  const venue = await VenueModel.create({
    owner_user_id: new Types.ObjectId(),
    status: 'APPROVED',
    is_active: true,
    venue_name: 'Loft',
    ...overrides,
  });
  return String(venue._id);
}

async function seedRoleHost() {
  const id = new Types.ObjectId();
  await UserRoleModel.create({ user_id: id, role: 'HOST', scope: { city: null, zone: null } });
  return String(id);
}

async function seedHostDoc(fields: Record<string, unknown>) {
  const id = new Types.ObjectId();
  await HostModel.create({ user_id: id, ...fields });
  return String(id);
}

describe('venueHostTermsFor', () => {
  it("gives an active host each venue's minimums and fees", async () => {
    const hostId = await seedRoleHost();
    const venueId = await seedVenue({
      settings: { offers: { min_guests: 12, min_spend: 5000, min_business: [{ model: 'PER_GUEST', amount: 450 }] } },
      pricing: { cleaning_fee: 500, pet_fee: 250, deposit: 2000, gst_enabled: true },
    });

    expect(await venueHostTermsFor(hostId, [venueId], platform)).toEqual([
      {
        venue_id: venueId,
        min_guests: 12,
        min_business: [{ model: 'PER_GUEST', amount: 450 }],
        min_spend: 5000,
        cleaning_fee: 500,
        pet_fee: 250,
        deposit: 2000,
        gst_enabled: true,
      },
    ]);
  });

  it('falls back to the platform minimum guests and reads unset fees as none', async () => {
    const hostId = await seedRoleHost();
    const venueId = await seedVenue();

    const [terms] = await venueHostTermsFor(hostId, [venueId], platform);
    expect(terms).toMatchObject({ min_guests: 6, min_business: [], min_spend: 0, cleaning_fee: 0, pet_fee: 0, deposit: 0 });
  });

  it('answers in the order asked, once per venue, and leaves out venues a host cannot book', async () => {
    const hostId = await seedRoleHost();
    const first = await seedVenue({ venue_name: 'First' });
    const second = await seedVenue({ venue_name: 'Second' });
    const draft = await seedVenue({ status: 'DRAFT' });
    const dark = await seedVenue({ is_active: false });

    const terms = await venueHostTermsFor(hostId, [second, 'not-an-id', draft, first, second, dark], platform);
    expect(terms.map((row) => row.venue_id)).toEqual([second, first]);
  });

  it(`reads at most ${VENUE_HOST_TERMS_MAX_IDS} venues per request`, async () => {
    const hostId = await seedRoleHost();
    const venueId = await seedVenue();
    const filler = Array.from({ length: VENUE_HOST_TERMS_MAX_IDS }, () => String(new Types.ObjectId()));

    expect(await venueHostTermsFor(hostId, [...filler.slice(1), venueId], platform)).toHaveLength(1);
    expect(await venueHostTermsFor(hostId, [...filler, venueId], platform)).toEqual([]);
  });

  it('gives an approved host profile without the cached role the terms too', async () => {
    const hostId = await seedHostDoc({ status: 'APPROVED', is_active: true });
    const venueId = await seedVenue();

    expect(await venueHostTermsFor(hostId, [venueId], platform)).toHaveLength(1);
  });

  it('gives a member, an unapproved host and a deactivated host nothing', async () => {
    const venueId = await seedVenue({ settings: { offers: { min_spend: 5000 } } });
    const member = String(new Types.ObjectId());
    const submitted = await seedHostDoc({ status: 'SUBMITTED' });
    const deactivated = await seedHostDoc({ status: 'APPROVED', is_active: false });
    await UserRoleModel.create({ user_id: new Types.ObjectId(deactivated), role: 'HOST', scope: { city: null, zone: null } });

    for (const userId of [member, submitted, deactivated]) {
      expect(await venueHostTermsFor(userId, [venueId], platform)).toEqual([]);
    }
  });

  it('asks nothing of the database for an empty list', async () => {
    const defaults = jest.fn(platform);
    expect(await venueHostTermsFor(await seedRoleHost(), [], defaults)).toEqual([]);
    expect(defaults).not.toHaveBeenCalled();
  });
});

describe('activeHostStatus — the same rule assertActiveHost enforces', () => {
  it('names an active, a deactivated and a missing host', async () => {
    const active = await seedRoleHost();
    const deactivated = await seedHostDoc({ status: 'APPROVED', is_active: false });
    const none = String(new Types.ObjectId());

    expect(await activeHostStatus(active)).toBe('ACTIVE');
    expect(await activeHostStatus(deactivated)).toBe('DEACTIVATED');
    expect(await activeHostStatus(none)).toBe('NOT_HOST');
    expect(await activeHostStatus('not-an-id')).toBe('NOT_HOST');

    await expect(assertActiveHost(active)).resolves.toBeUndefined();
    await expect(assertActiveHost(deactivated)).rejects.toThrow('Your host account has been deactivated');
    await expect(assertActiveHost(none)).rejects.toThrow('Host access is required before creating pods');
  });
});

describe('Query.venueHostTerms', () => {
  const { venueHostTerms } = venueResolvers.Query;

  it('refuses a signed-out caller', async () => {
    await expect(venueHostTerms(undefined, { venue_ids: [] }, makeContext())).rejects.toMatchObject({
      extensions: { code: 'UNAUTHENTICATED' },
    });
  });

  it("serves a signed-in host, with the platform's minimum guests as the fallback", async () => {
    const hostId = await seedRoleHost();
    const venueId = await seedVenue();
    const { min_guests } = await settingsService.getVenueOfferDefaults();

    const terms = await venueHostTerms(undefined, { venue_ids: [venueId] }, makeContext({ id: hostId, roles: ['HOST'] }));
    expect(terms).toEqual([expect.objectContaining({ venue_id: venueId, min_guests })]);
  });
});
