/**
 * Pod venue helpers with every model and gateway faked: who may act on a
 * venue-booked pod, where a pod's place resolves to, the location → venue-id
 * feed filter and its per-process cache, the slot a new pod takes, and the
 * book-or-hold that rolls the pod back when the slot claim fails (and ONLY then —
 * telling the venue is best-effort and never deletes a pod).
 */
jest.mock('@observability/log', () => ({
  logs: { server: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } },
}));
jest.mock('@modules/access/user/user.model', () => ({ UserModel: { findById: jest.fn() } }));
jest.mock('@modules/clubs/club/club.model', () => ({ ClubModel: { findById: jest.fn() } }));
jest.mock('@modules/platform/location/location.model', () => ({
  LocationModel: { findById: jest.fn(), findOne: jest.fn() },
}));
jest.mock('@modules/venues/venue/venue.model', () => ({
  VenueModel: { findOne: jest.fn(), findById: jest.fn(), find: jest.fn() },
}));
jest.mock('@modules/venues/venue/venue.service', () => ({
  venueService: { findMatchingForClub: jest.fn() },
}));
jest.mock('@modules/venues/venueSlot/venueSlot.model', () => ({
  VenueSlotModel: { findOne: jest.fn(), findById: jest.fn() },
}));
jest.mock('@modules/venues/venueSlot/venueSlot.service', () => ({
  venueSlotService: { transferAutoPodHold: jest.fn(), holdForPod: jest.fn(), bookForPod: jest.fn() },
}));
jest.mock('@modules/platform/whatsapp/whatsapp.service', () => ({ whatsappService: { send: jest.fn() } }));
jest.mock('@modules/platform/whatsapp/whatsapp.assets', () => ({
  podImageAssets: jest.fn(() => ({ IMAGE: { url: 'https://img.example.test/pod.jpg' } })),
}));
jest.mock('@services/email/email.service', () => ({ sendVenueSlotRequestEmail: jest.fn() }));
jest.mock('@config/url-configs', () => ({ getUrlConfigs: jest.fn() }));
jest.mock('@modules/engagement/notification/notification.service', () => ({
  notificationService: { create: jest.fn() },
}));

import { Types } from 'mongoose';
import {
  assertOwnedVenue,
  notifyVenueSlotRequested,
  emailVenueSlotRequested,
  resolveVenueLocation,
  buildPodPlaceFilter,
  assertPartnerVenue,
  resolveSlotForCreate,
  venueApprovalForCreate,
  bookOrHoldSlotForPod,
} from '../../pod.venue';
import { UserModel } from '@modules/access/user/user.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { LocationModel } from '@modules/platform/location/location.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { venueService } from '@modules/venues/venue/venue.service';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { venueSlotService } from '@modules/venues/venueSlot/venueSlot.service';
import { whatsappService } from '@modules/platform/whatsapp/whatsapp.service';
import { sendVenueSlotRequestEmail } from '@services/email/email.service';
import { getUrlConfigs } from '@config/url-configs';
import { notificationService } from '@modules/engagement/notification/notification.service';
import { logs } from '@observability/log';
import { appDate, appDateTime, appTime } from '@utils/app-time';

const users = UserModel as unknown as Record<string, jest.Mock>;
const clubs = ClubModel as unknown as Record<string, jest.Mock>;
const locations = LocationModel as unknown as Record<string, jest.Mock>;
const venues = VenueModel as unknown as Record<string, jest.Mock>;
const slots = VenueSlotModel as unknown as Record<string, jest.Mock>;
const slotSvc = venueSlotService as unknown as Record<string, jest.Mock>;
const matchForClub = venueService.findMatchingForClub as jest.Mock;
const waSend = whatsappService.send as jest.Mock;
const sendEmail = sendVenueSlotRequestEmail as jest.Mock;
const urlConfigs = getUrlConfigs as jest.Mock;
const notifCreate = notificationService.create as jest.Mock;
const logError = logs.server.error as jest.Mock;

/** A mongoose query stand-in: awaitable, `.select()`-able and `.lean()`-able. */
const q = (value: unknown) => {
  const chain: any = {
    select: jest.fn(() => chain),
    sort: jest.fn(() => chain),
    lean: jest.fn(() => Promise.resolve(value)),
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(value).then(res, rej),
  };
  return chain;
};

const flush = async () => {
  for (let i = 0; i < 10; i += 1) await new Promise((r) => setImmediate(r));
};

const USER = '64a000000000000000000001';
const OTHER = '64a000000000000000000002';
const VENUE = '64a000000000000000000003';
const SLOT = '64a000000000000000000004';
const LOC = '64a000000000000000000005';

describe('assertOwnedVenue', () => {
  const refusal = 'This pod is not booked at a venue you own';

  it('refuses a pod with no venue, or whose booking is not APPROVED, without looking', async () => {
    await expect(assertOwnedVenue({ venue_id: null, venue_approval_status: 'APPROVED' }, USER)).rejects.toThrow(refusal);
    await expect(assertOwnedVenue({ venue_id: VENUE, venue_approval_status: 'PENDING' }, USER)).rejects.toThrow(refusal);
    expect(venues.findOne).not.toHaveBeenCalled();
  });

  it('accepts the owner of the approved venue, matching on the caller as owner', async () => {
    venues.findOne.mockReturnValue(q({ _id: VENUE }));

    await expect(
      assertOwnedVenue({ venue_id: VENUE, venue_approval_status: 'APPROVED' }, USER)
    ).resolves.toBeUndefined();
    expect(venues.findOne).toHaveBeenCalledWith({ _id: VENUE, owner_user_id: new Types.ObjectId(USER) });
  });

  it('refuses someone who does not own that venue', async () => {
    venues.findOne.mockReturnValue(q(null));
    await expect(
      assertOwnedVenue({ venue_id: VENUE, venue_approval_status: 'APPROVED' }, OTHER)
    ).rejects.toMatchObject({ message: refusal, extensions: { code: 'FORBIDDEN' } });
  });
});

describe('notifyVenueSlotRequested', () => {
  const start = new Date('2026-11-01T12:30:00.000Z');

  it('drops an in-app note on the venue owner with the slot time', async () => {
    notifCreate.mockResolvedValue({});
    await notifyVenueSlotRequested({ pod_title: 'Sunrise Yoga' }, { start_at: start, owner_user_id: new Types.ObjectId(OTHER) });

    expect(notifCreate).toHaveBeenCalledWith({
      title: 'New slot booking request',
      body: `"Sunrise Yoga" requested your venue slot on ${appDateTime(start)}. Review it in the Partners portal.`,
      scope: 'USER',
      target_user_ids: [OTHER],
      silent: false,
    });
  });

  it('logs and swallows a failed note — it is best-effort', async () => {
    const err = new Error('push down');
    notifCreate.mockRejectedValue(err);

    await expect(
      notifyVenueSlotRequested({ pod_title: 'X' }, { start_at: start, owner_user_id: OTHER })
    ).resolves.toBeUndefined();
    expect(logError).toHaveBeenCalledWith('pod', 'notifyVenueSlotRequested', {
      error: err,
      msg: 'slot request notification failed',
    });
  });
});

describe('emailVenueSlotRequested', () => {
  const start = new Date('2026-11-01T12:30:00.000Z');
  const slot = { _id: SLOT, venue_id: VENUE, start_at: start };
  const pod = { pod_title: 'Sunrise Yoga', pod_hosts_id: [USER], pod_images_and_videos: [] };

  beforeEach(() => {
    urlConfigs.mockResolvedValue({ partnersUrl: 'https://partners.example.test//' });
    sendEmail.mockResolvedValue(undefined);
    waSend.mockResolvedValue(undefined);
  });

  it('does nothing for a venue that no longer exists', async () => {
    venues.findById.mockReturnValue(q(null));

    await emailVenueSlotRequested(pod, slot);

    expect(sendEmail).not.toHaveBeenCalled();
    expect(waSend).not.toHaveBeenCalled();
  });

  it('emails the venue contact and WhatsApps the owner with decision links', async () => {
    const owner = { auth: { email: 'owner@example.com' }, profile: { first_name: 'Olu', last_name: 'Ade' } };
    venues.findById.mockReturnValue(
      q({ venue_name: 'Rooftop Hall', owner_email: ' venue@example.com ', owner_name: '  ', owner_user_id: OTHER })
    );
    users.findById
      .mockReturnValueOnce(q(owner))
      .mockReturnValueOnce(q({ profile: { first_name: 'Hari', last_name: 'P' } }));

    await emailVenueSlotRequested(pod, slot);

    expect(users.findById).toHaveBeenNthCalledWith(1, OTHER);
    expect(users.findById).toHaveBeenNthCalledWith(2, USER);
    expect(sendEmail).toHaveBeenCalledWith({
      to: 'venue@example.com',
      owner_name: 'Olu Ade',
      venue_name: 'Rooftop Hall',
      pod_title: 'Sunrise Yoga',
      host_name: 'Hari P',
      when: appDateTime(start),
      review_url: 'https://partners.example.test/venues/requests',
      approve_url: `https://partners.example.test/venues/requests/${SLOT}?action=approve`,
      decline_url: `https://partners.example.test/venues/requests/${SLOT}?action=decline`,
    });
    expect(waSend).toHaveBeenCalledWith({
      event: 'VENUE_SLOT_REQUESTED',
      entityId: SLOT,
      user: owner,
      name: 'Olu Ade',
      assets: { IMAGE: { url: 'https://img.example.test/pod.jpg' } },
      params: [
        'Olu Ade',
        'Sunrise Yoga',
        appDate(start),
        appTime(start),
        'Hari P',
        'https://partners.example.test/venues/requests',
      ],
    });
  });

  it('prefers the venue contact name, and falls back to the owner account email', async () => {
    venues.findById.mockReturnValue(
      q({ venue_name: 'Hall', owner_email: '', owner_name: 'Front Desk', owner_user_id: OTHER })
    );
    users.findById
      .mockReturnValueOnce(q({ auth: { email: 'acct@example.com' }, profile: { first_name: 'Olu' } }))
      .mockReturnValueOnce(q(null));

    await emailVenueSlotRequested(pod, slot);

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'acct@example.com', owner_name: 'Front Desk', host_name: 'A host' })
    );
  });

  it('still sends (to a blank address, which the send logs) when nobody can be named', async () => {
    venues.findById.mockReturnValue(q({ venue_name: '', owner_email: null, owner_name: null, owner_user_id: OTHER }));
    users.findById.mockReturnValueOnce(q(null)).mockReturnValueOnce(q(null));

    await emailVenueSlotRequested({ pod_title: 'Solo', pod_images_and_videos: [] }, slot);

    expect(users.findById).toHaveBeenNthCalledWith(2, undefined);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: '', owner_name: 'there', venue_name: 'your venue', host_name: 'A host' })
    );
    expect(waSend).toHaveBeenCalledWith(expect.objectContaining({ user: null, name: 'there' }));
  });

  it('logs and swallows a failed email, and does not go on to WhatsApp', async () => {
    venues.findById.mockReturnValue(q({ venue_name: 'Hall', owner_email: 'v@example.com', owner_user_id: OTHER }));
    users.findById.mockReturnValue(q(null));
    const err = new Error('smtp down');
    sendEmail.mockRejectedValue(err);

    await expect(emailVenueSlotRequested(pod, slot)).resolves.toBeUndefined();
    expect(waSend).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledWith('pod', 'emailVenueSlotRequested', {
      error: err,
      msg: 'slot request email failed',
    });
  });
});

describe('resolveVenueLocation', () => {
  it('needs a venue or at least a location', async () => {
    await expect(resolveVenueLocation({})).rejects.toThrow('Select a venue');
  });

  it('a venue-less pod keeps its own location and zone', async () => {
    await expect(resolveVenueLocation({ location_id: LOC, zone_name: 'Indiranagar' })).resolves.toEqual({
      venue_id: null,
      location_id: LOC,
      zone_name: 'Indiranagar',
    });
    await expect(resolveVenueLocation({ location_id: LOC })).resolves.toEqual({
      venue_id: null,
      location_id: LOC,
      zone_name: null,
    });
    expect(venues.findById).not.toHaveBeenCalled();
  });

  it('refuses a venue that does not exist', async () => {
    venues.findById.mockReturnValue(q(null));
    await expect(resolveVenueLocation({ venue_id: VENUE })).rejects.toMatchObject({
      message: 'Venue not found',
      extensions: { code: 'NOT_FOUND' },
    });
  });

  it('takes the venue location when none was sent, and skips the club check for a slot booking', async () => {
    venues.findById.mockReturnValue(q({ _id: VENUE, location_id: new Types.ObjectId(LOC), city: 'Pune' }));

    await expect(
      resolveVenueLocation({ venue_id: VENUE, venue_slot_id: SLOT, club_id: 'club-1', zone_name: 'ignored' })
    ).resolves.toEqual({ venue_id: VENUE, location_id: LOC, zone_name: null });
    expect(clubs.findById).not.toHaveBeenCalled();
    expect(locations.findOne).not.toHaveBeenCalled();
  });

  it('keeps an explicit location over the venue one', async () => {
    venues.findById.mockReturnValue(q({ _id: VENUE, location_id: new Types.ObjectId(), city: 'Pune' }));
    await expect(resolveVenueLocation({ venue_id: VENUE, location_id: LOC })).resolves.toEqual({
      venue_id: VENUE,
      location_id: LOC,
      zone_name: null,
    });
  });

  it('falls back to the city name, matched exactly and case-blind with regex characters literal', async () => {
    venues.findById.mockReturnValue(q({ _id: VENUE, location_id: null, city: 'Delhi (NCR)' }));
    locations.findOne.mockReturnValue(q({ _id: new Types.ObjectId(LOC) }));

    const result = await resolveVenueLocation({ venue_id: VENUE });

    expect(result.location_id).toBe(LOC);
    const { $or } = locations.findOne.mock.calls[0][0];
    const rx: RegExp = $or[0].city;
    expect($or[1].location_name).toBe(rx);
    expect(rx.test('delhi (ncr)')).toBe(true);
    expect(rx.test('Delhi NCR')).toBe(false);
    expect(rx.test('New Delhi (NCR)')).toBe(false);
  });

  it('answers a null location when the city names no location, or the venue has no city', async () => {
    venues.findById.mockReturnValueOnce(q({ _id: VENUE, city: 'Nowhere' }));
    locations.findOne.mockReturnValue(q(null));
    await expect(resolveVenueLocation({ venue_id: VENUE })).resolves.toEqual({
      venue_id: VENUE,
      location_id: null,
      zone_name: null,
    });

    venues.findById.mockReturnValueOnce(q({ _id: VENUE, city: '' }));
    await expect(resolveVenueLocation({ venue_id: VENUE })).resolves.toMatchObject({ location_id: null });
    expect(locations.findOne).toHaveBeenCalledTimes(1);
  });

  describe('club ↔ venue match on the manual (no-slot) path', () => {
    const venueDoc = { _id: VENUE, location_id: new Types.ObjectId(LOC) };

    it('accepts a venue the club matches, asking with the club place and taxonomy', async () => {
      venues.findById.mockReturnValue(q(venueDoc));
      const superId = new Types.ObjectId();
      clubs.findById.mockResolvedValue({ location_id: new Types.ObjectId(LOC), super_category_id: superId });
      matchForClub.mockResolvedValue([{ id: 'someone-else' }, { id: VENUE }]);

      await expect(resolveVenueLocation({ venue_id: VENUE, club_id: 'club-1' })).resolves.toMatchObject({
        venue_id: VENUE,
      });
      expect(clubs.findById).toHaveBeenCalledWith('club-1');
      expect(matchForClub).toHaveBeenCalledWith({
        location_id: LOC,
        locality: null,
        super_category_id: String(superId),
        category_id: null,
      });
    });

    it('refuses a venue the club does not match', async () => {
      venues.findById.mockReturnValue(q(venueDoc));
      const catId = new Types.ObjectId();
      clubs.findById.mockResolvedValue({ location_id: LOC, locality: 'Koramangala', category_id: catId });
      matchForClub.mockResolvedValue([{ id: 'another-venue' }]);

      await expect(resolveVenueLocation({ venue_id: VENUE, club_id: 'club-1' })).rejects.toMatchObject({
        message: 'Selected venue is not available for this club',
        extensions: { code: 'BAD_USER_INPUT' },
      });
      expect(matchForClub).toHaveBeenCalledWith(
        expect.objectContaining({ locality: 'Koramangala', category_id: String(catId), super_category_id: null })
      );
    });

    it('a club with no location yet, or no club at all, imposes no constraint', async () => {
      venues.findById.mockReturnValue(q(venueDoc));
      clubs.findById.mockResolvedValueOnce({ location_id: null }).mockResolvedValueOnce(null);

      await expect(resolveVenueLocation({ venue_id: VENUE, club_id: 'club-1' })).resolves.toMatchObject({ venue_id: VENUE });
      await expect(resolveVenueLocation({ venue_id: VENUE, club_id: 'club-2' })).resolves.toMatchObject({ venue_id: VENUE });
      expect(matchForClub).not.toHaveBeenCalled();
    });
  });
});

describe('buildPodPlaceFilter', () => {
  // The venue-id cache is per process and keyed on location|zone, so every test
  // uses its own location id or zone to start cold.
  const newLoc = () => String(new Types.ObjectId());

  it('is null with no place, or only a blank zone', async () => {
    await expect(buildPodPlaceFilter()).resolves.toBeNull();
    await expect(buildPodPlaceFilter({ zone_name: '   ' })).resolves.toBeNull();
    expect(locations.findById).not.toHaveBeenCalled();
  });

  it('location + zone: virtual pods, pods in that zone, and venues in the zone by locality or pincode', async () => {
    const loc = newLoc();
    const locId = new Types.ObjectId(loc);
    locations.findById.mockReturnValue(
      q({
        _id: locId,
        city: 'Bengaluru',
        state: 'Karnataka',
        country_code: 'IN',
        location_zones: [
          { zone_name: 'Whitefield', pincode: '560066' },
          { zone_name: 'Indiranagar', pincode: '560038' },
        ],
      })
    );
    const venueA = new Types.ObjectId();
    venues.find.mockReturnValue(q([{ _id: venueA }]));

    const filter = await buildPodPlaceFilter({ location_id: loc, zone_name: ' Indiranagar ' });

    expect(filter).toEqual({
      $or: [
        { pod_mode: 'VIRTUAL' },
        { location_id: loc, zone_name: 'Indiranagar' },
        { venue_id: { $in: [venueA] } },
      ],
    });
    const or = venues.find.mock.calls[0][0].$or;
    expect(or).toHaveLength(4);
    expect(or[0]).toEqual({ location_id: locId, locality: expect.any(RegExp) });
    expect(or[0].locality.test('indiranagar')).toBe(true);
    expect(or[1]).toEqual({ location_id: locId, postal_code: '560038' });
    expect(or[2].city.test('BENGALURU')).toBe(true);
    expect(or[2].state.test('karnataka')).toBe(true);
    expect(or[2].country_code).toBe('IN');
    expect(or[2].locality.test('Indiranagar')).toBe(true);
    expect(or[3]).toMatchObject({ country_code: 'IN', postal_code: '560038' });
  });

  it('a zone with no pincode matches on locality only', async () => {
    const loc = newLoc();
    const locId = new Types.ObjectId(loc);
    locations.findById.mockReturnValue(q({ _id: locId, location_zones: undefined }));
    venues.find.mockReturnValue(q([]));

    const filter = await buildPodPlaceFilter({ location_id: loc, zone_name: 'HSR' });

    const or = venues.find.mock.calls[0][0].$or;
    expect(or).toEqual([{ location_id: locId, locality: expect.any(RegExp) }]);
    // No venue in the zone: no venue branch in the pod filter.
    expect(filter).toEqual({ $or: [{ pod_mode: 'VIRTUAL' }, { location_id: loc, zone_name: 'HSR' }] });
  });

  it('location only: the location id plus the city (from location_name when city is blank)', async () => {
    const loc = newLoc();
    const locId = new Types.ObjectId(loc);
    locations.findById.mockReturnValue(q({ _id: locId, city: '', location_name: 'Goa' }));
    const venueB = new Types.ObjectId();
    venues.find.mockReturnValue(q([{ _id: venueB }]));

    const filter = await buildPodPlaceFilter({ location_id: loc });

    const or = venues.find.mock.calls[0][0].$or;
    expect(or).toHaveLength(2);
    expect(or[0]).toEqual({ location_id: locId });
    expect(Object.keys(or[1])).toEqual(['city']);
    expect(or[1].city.test('goa')).toBe(true);
    expect(filter).toEqual({
      $or: [{ pod_mode: 'VIRTUAL' }, { location_id: loc }, { venue_id: { $in: [venueB] } }],
    });
  });

  it('a location with no place fields matches on its id alone', async () => {
    const loc = newLoc();
    const locId = new Types.ObjectId(loc);
    locations.findById.mockReturnValue(q({ _id: locId }));
    venues.find.mockReturnValue(q([]));

    await buildPodPlaceFilter({ location_id: loc });

    expect(venues.find.mock.calls[0][0].$or).toEqual([{ location_id: locId }]);
  });

  it('an unknown location reads no venues', async () => {
    const loc = newLoc();
    locations.findById.mockReturnValue(q(null));

    await expect(buildPodPlaceFilter({ location_id: loc })).resolves.toEqual({
      $or: [{ pod_mode: 'VIRTUAL' }, { location_id: loc }],
    });
    expect(venues.find).not.toHaveBeenCalled();
  });

  it('zone only: venues by locality, pods by zone name', async () => {
    const venueC = new Types.ObjectId();
    venues.find.mockReturnValue(q([{ _id: venueC }]));

    const filter = await buildPodPlaceFilter({ zone_name: 'Bandra (W)' });

    const or = venues.find.mock.calls[0][0].$or;
    expect(or).toHaveLength(1);
    expect(or[0].locality.test('bandra (w)')).toBe(true);
    expect(or[0].locality.test('Bandra W')).toBe(false);
    expect(locations.findById).not.toHaveBeenCalled();
    expect(filter).toEqual({
      $or: [{ pod_mode: 'VIRTUAL' }, { zone_name: 'Bandra (W)' }, { venue_id: { $in: [venueC] } }],
    });
  });

  it('serves a repeat from the cache for the TTL, then reads again', async () => {
    const now = jest.spyOn(Date, 'now');
    try {
      now.mockReturnValue(1_000_000);
      const zone = `cache-zone-${new Types.ObjectId()}`;
      venues.find.mockReturnValue(q([{ _id: new Types.ObjectId() }]));

      await buildPodPlaceFilter({ zone_name: zone });
      now.mockReturnValue(1_000_000 + 59_999);
      await buildPodPlaceFilter({ zone_name: zone });
      expect(venues.find).toHaveBeenCalledTimes(1);

      now.mockReturnValue(1_000_000 + 60_000);
      await buildPodPlaceFilter({ zone_name: zone });
      expect(venues.find).toHaveBeenCalledTimes(2);
    } finally {
      now.mockRestore();
    }
  });

  it('a failed read is not cached', async () => {
    const zone = `fail-zone-${new Types.ObjectId()}`;
    venues.find.mockReturnValueOnce({
      select: () => ({ lean: () => Promise.reject(new Error('db down')) }),
    });
    await expect(buildPodPlaceFilter({ zone_name: zone })).rejects.toThrow('db down');

    venues.find.mockReturnValue(q([]));
    await expect(buildPodPlaceFilter({ zone_name: zone })).resolves.toEqual({
      $or: [{ pod_mode: 'VIRTUAL' }, { zone_name: zone }],
    });
    expect(venues.find).toHaveBeenCalledTimes(2);
  });

  it('the cache is bounded: once full it is cleared, so an early key is read again', async () => {
    venues.find.mockReturnValue(q([]));
    const first = `bounded-${new Types.ObjectId()}`;
    await buildPodPlaceFilter({ zone_name: first });
    // 200 more distinct keys guarantee the 200-key bound is hit after `first`.
    for (let i = 0; i < 200; i += 1) {
      await buildPodPlaceFilter({ zone_name: `${first}-${i}` });
    }
    const before = venues.find.mock.calls.length;

    await buildPodPlaceFilter({ zone_name: first });

    expect(venues.find.mock.calls.length).toBe(before + 1);
  });
});

describe('assertPartnerVenue', () => {
  const userOid = new Types.ObjectId(USER);

  it('without a venue: a slot booking and a manual pod get their own messages', async () => {
    await expect(assertPartnerVenue({ venue_slot_id: SLOT }, userOid)).rejects.toThrow('Select an approved venue');
    await expect(assertPartnerVenue({}, userOid)).rejects.toThrow('Select one of your approved venues');
    expect(venues.findOne).not.toHaveBeenCalled();
  });

  it('a slot booking may target any approved, active venue', async () => {
    venues.findOne.mockReturnValue(q({ _id: VENUE }));
    await expect(assertPartnerVenue({ venue_id: VENUE, venue_slot_id: SLOT }, userOid)).resolves.toBeUndefined();
    expect(venues.findOne).toHaveBeenCalledWith({ _id: VENUE, status: 'APPROVED', is_active: true });
  });

  it('a manual pod must be at one of the host own approved venues', async () => {
    venues.findOne.mockReturnValue(q(null));
    await expect(assertPartnerVenue({ venue_id: VENUE }, userOid)).rejects.toMatchObject({
      message: 'Select one of your approved venues',
      extensions: { code: 'BAD_USER_INPUT' },
    });
    expect(venues.findOne).toHaveBeenCalledWith({
      _id: VENUE,
      owner_user_id: userOid,
      status: 'APPROVED',
      is_active: true,
    });
  });
});

describe('resolveSlotForCreate', () => {
  const start = new Date('2026-11-01T12:30:00.000Z');
  const end = new Date('2026-11-01T14:30:00.000Z');
  const slotDoc = (over: Record<string, unknown> = {}) => ({
    _id: SLOT,
    venue_id: new Types.ObjectId(VENUE),
    owner_user_id: new Types.ObjectId(OTHER),
    status: 'AVAILABLE',
    start_at: start,
    end_at: end,
    ...over,
  });

  it('takes no slot for a virtual pod, or a physical one without a slot', async () => {
    await expect(resolveSlotForCreate({ venue_slot_id: SLOT }, 'VIRTUAL')).resolves.toEqual({
      slotDoc: null,
      needsVenueApproval: false,
    });
    await expect(resolveSlotForCreate({}, 'PHYSICAL')).resolves.toEqual({ slotDoc: null, needsVenueApproval: false });
    expect(slots.findById).not.toHaveBeenCalled();
  });

  it('an Auto Pod takes the slot its venue is holding, already approved, and overwrites the window', async () => {
    const autoPodId = String(new Types.ObjectId());
    const held = slotDoc({ status: 'BOOKED' });
    slots.findOne.mockResolvedValue(held);
    const input: any = { venue_slot_id: SLOT, pod_date_time: 'stale' };

    await expect(resolveSlotForCreate(input, 'PHYSICAL', autoPodId)).resolves.toEqual({
      slotDoc: held,
      needsVenueApproval: false,
    });
    expect(slots.findOne).toHaveBeenCalledWith({
      _id: SLOT,
      booked_by_auto_pod_id: new Types.ObjectId(autoPodId),
      status: 'BOOKED',
    });
    expect(input).toMatchObject({
      venue_id: VENUE,
      pod_date_time: start.toISOString(),
      pod_end_date_time: end.toISOString(),
    });
  });

  it('an Auto Pod whose hold has lapsed is a conflict', async () => {
    slots.findOne.mockResolvedValue(null);
    await expect(
      resolveSlotForCreate({ venue_slot_id: SLOT }, 'PHYSICAL', String(new Types.ObjectId()))
    ).rejects.toMatchObject({
      message: 'The venue slot for this Auto Pod is no longer held',
      extensions: { code: 'CONFLICT' },
    });
  });

  it('refuses a slot that does not exist, or is no longer available', async () => {
    slots.findById.mockResolvedValueOnce(null);
    await expect(resolveSlotForCreate({ venue_slot_id: SLOT }, 'PHYSICAL')).rejects.toMatchObject({
      message: 'Selected slot not found',
      extensions: { code: 'NOT_FOUND' },
    });

    slots.findById.mockResolvedValueOnce(slotDoc({ status: 'HELD' }));
    await expect(resolveSlotForCreate({ venue_slot_id: SLOT }, 'PHYSICAL')).rejects.toMatchObject({
      message: 'Selected slot is no longer available',
      extensions: { code: 'CONFLICT' },
    });
  });

  it('refuses a slot that belongs to a different venue than the one picked', async () => {
    slots.findById.mockResolvedValue(slotDoc());
    await expect(
      resolveSlotForCreate({ venue_slot_id: SLOT, venue_id: String(new Types.ObjectId()) }, 'PHYSICAL')
    ).rejects.toThrow('Slot does not belong to the selected venue');
    expect(venues.findById).not.toHaveBeenCalled();
  });

  it('refuses a slot on a day the venue is on leave (venue wall-clock date)', async () => {
    // 2026-11-01T20:00Z is already 2 Nov in IST — the date the venue stored.
    slots.findById.mockResolvedValue(slotDoc({ start_at: new Date('2026-11-01T20:00:00.000Z') }));
    venues.findById.mockReturnValue(q({ settings: { holidays: ['2026-11-02'] }, owner_user_id: OTHER }));

    await expect(resolveSlotForCreate({ venue_slot_id: SLOT, venue_id: VENUE }, 'PHYSICAL')).rejects.toMatchObject({
      message: 'The venue is on leave on this date. Pick another slot.',
      extensions: { code: 'CONFLICT' },
    });
  });

  it("another partner's venue needs its approval; the slot window overwrites the form's", async () => {
    const doc = slotDoc();
    slots.findById.mockResolvedValue(doc);
    venues.findById.mockReturnValue(q({ settings: { holidays: ['2026-11-02'] } }));
    const input: any = { venue_slot_id: SLOT, pod_hosts_id: [USER], pod_date_time: 'stale', pod_end_date_time: 'stale' };

    await expect(resolveSlotForCreate(input, 'PHYSICAL')).resolves.toEqual({ slotDoc: doc, needsVenueApproval: true });
    expect(input).toMatchObject({
      venue_id: VENUE,
      pod_date_time: start.toISOString(),
      pod_end_date_time: end.toISOString(),
    });
  });

  it('booking your own venue confirms instantly, and a venue with no settings has no holidays', async () => {
    slots.findById.mockResolvedValue(slotDoc({ owner_user_id: new Types.ObjectId(USER) }));
    venues.findById.mockReturnValue(q(null));

    await expect(
      resolveSlotForCreate({ venue_slot_id: SLOT, pod_hosts_id: [new Types.ObjectId(USER)] }, 'PHYSICAL')
    ).resolves.toMatchObject({ needsVenueApproval: false });
  });

  it('a pod with no hosts listed needs the venue approval', async () => {
    slots.findById.mockResolvedValue(slotDoc());
    venues.findById.mockReturnValue(q({ settings: {} }));
    await expect(resolveSlotForCreate({ venue_slot_id: SLOT }, 'PHYSICAL')).resolves.toMatchObject({
      needsVenueApproval: true,
    });
  });
});

describe('venueApprovalForCreate', () => {
  it('an Auto Pod is approved already; others wait for the venue or need nothing', () => {
    expect(venueApprovalForCreate({ slotId: SLOT, autoPodId: 'a' }, true)).toBe('APPROVED');
    expect(venueApprovalForCreate({ slotId: SLOT, autoPodId: 'a' }, false)).toBe('APPROVED');
    expect(venueApprovalForCreate(null, true)).toBe('PENDING');
    expect(venueApprovalForCreate(null, false)).toBe('NONE');
  });
});

describe('bookOrHoldSlotForPod', () => {
  const podId = new Types.ObjectId();
  const makePod = () => ({ _id: podId, pod_title: 'Sunrise Yoga', pod_hosts_id: [USER], deleteOne: jest.fn() });
  const slot = {
    _id: SLOT,
    venue_id: VENUE,
    owner_user_id: OTHER,
    start_at: new Date('2026-11-01T12:30:00.000Z'),
  };

  it('does nothing without a slot', async () => {
    const pod = makePod();
    await bookOrHoldSlotForPod(pod, null, true);
    expect(slotSvc.holdForPod).not.toHaveBeenCalled();
    expect(slotSvc.bookForPod).not.toHaveBeenCalled();
    expect(pod.deleteOne).not.toHaveBeenCalled();
  });

  it('hands an Auto Pod hold over in one write, and never notifies', async () => {
    const pod = makePod();
    slotSvc.transferAutoPodHold.mockResolvedValue(undefined);

    await bookOrHoldSlotForPod(pod, slot, true, { slotId: SLOT, autoPodId: 'auto-1' });

    expect(slotSvc.transferAutoPodHold).toHaveBeenCalledWith(SLOT, 'auto-1', String(podId));
    expect(slotSvc.holdForPod).not.toHaveBeenCalled();
    await flush();
    expect(notifCreate).not.toHaveBeenCalled();
  });

  it('rolls the pod back when the Auto Pod hand-over fails', async () => {
    const pod = makePod();
    const err = new Error('hold lost');
    slotSvc.transferAutoPodHold.mockRejectedValue(err);

    await expect(bookOrHoldSlotForPod(pod, slot, false, { slotId: SLOT, autoPodId: 'auto-1' })).rejects.toBe(err);
    expect(pod.deleteOne).toHaveBeenCalledTimes(1);
  });

  it('books your own venue outright and tells nobody', async () => {
    const pod = makePod();
    slotSvc.bookForPod.mockResolvedValue(undefined);

    await bookOrHoldSlotForPod(pod, slot, false);

    expect(slotSvc.bookForPod).toHaveBeenCalledWith(SLOT, VENUE, String(podId));
    expect(slotSvc.holdForPod).not.toHaveBeenCalled();
    await flush();
    expect(notifCreate).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
    expect(pod.deleteOne).not.toHaveBeenCalled();
  });

  it("holds another partner's slot, then tells the venue in-app and by email after the claim", async () => {
    const pod = makePod();
    slotSvc.holdForPod.mockResolvedValue(undefined);
    notifCreate.mockResolvedValue({});
    venues.findById.mockReturnValue(q({ venue_name: 'Hall', owner_email: 'v@example.com', owner_user_id: OTHER }));
    users.findById.mockReturnValue(q(null));
    urlConfigs.mockResolvedValue({ partnersUrl: 'https://partners.example.test' });
    sendEmail.mockResolvedValue(undefined);
    waSend.mockResolvedValue(undefined);

    await bookOrHoldSlotForPod(pod, slot, true);
    await flush();

    expect(slotSvc.holdForPod).toHaveBeenCalledWith(SLOT, VENUE, String(podId));
    expect(notifCreate).toHaveBeenCalledWith(expect.objectContaining({ target_user_ids: [OTHER] }));
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'v@example.com', pod_title: 'Sunrise Yoga' }));
    expect(pod.deleteOne).not.toHaveBeenCalled();
  });

  it('a failed notice never deletes a pod whose slot is held', async () => {
    const pod = makePod();
    slotSvc.holdForPod.mockResolvedValue(undefined);
    notifCreate.mockRejectedValue(new Error('push down'));
    venues.findById.mockReturnValue(q(null));

    await expect(bookOrHoldSlotForPod(pod, slot, true)).resolves.toBeUndefined();
    await flush();

    expect(pod.deleteOne).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledWith('pod', 'notifyVenueSlotRequested', expect.any(Object));
  });

  it('rolls the pod back and rethrows when a concurrent request took the slot', async () => {
    const pod = makePod();
    const conflict = new Error('Slot already taken');
    slotSvc.holdForPod.mockRejectedValue(conflict);

    await expect(bookOrHoldSlotForPod(pod, slot, true)).rejects.toBe(conflict);
    expect(pod.deleteOne).toHaveBeenCalledTimes(1);
    await flush();
    expect(notifCreate).not.toHaveBeenCalled();

    const own = makePod();
    slotSvc.bookForPod.mockRejectedValue(conflict);
    await expect(bookOrHoldSlotForPod(own, slot, false)).rejects.toBe(conflict);
    expect(own.deleteOne).toHaveBeenCalledTimes(1);
  });
});
