/**
 * Who an admin may offer a pod's place to. The audience matchers, the models
 * and the contact lookup are faked; what is under test is the pod -> (category,
 * city) hop, the exclusion of whoever already holds the role, how each role's
 * row is shaped from the audience + contact data, and the free-slot list for a
 * venue (holidays dropped, defaults filled).
 */
import { Types } from 'mongoose';

jest.mock('@modules/clubs/club/club.model', () => ({ ClubModel: { findById: jest.fn() } }));
jest.mock('@modules/venues/venue/venue.model', () => ({ VenueModel: { findById: jest.fn() } }));
jest.mock('@modules/venues/venueSlot/venueSlot.model', () => ({ VenueSlotModel: { find: jest.fn() } }));
jest.mock('@modules/pods/autoPod/autoPod.audience', () => ({
  audienceVenues: jest.fn(),
  audienceHosts: jest.fn(),
  audienceClubs: jest.fn(),
}));
jest.mock('../../podChangeRequest.common', () => ({
  ...jest.requireActual('../../podChangeRequest.common'),
  contactsFor: jest.fn(),
}));

import { ClubModel } from '@modules/clubs/club/club.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { audienceClubs, audienceHosts, audienceVenues } from '@modules/pods/autoPod/autoPod.audience';
import { contactsFor } from '../../podChangeRequest.common';
import {
  candidatesForRequest,
  podMatchKeys,
  slotsForVenue,
} from '../../podChangeRequest.candidates';

const clubFindById = ClubModel.findById as jest.Mock;
const venueFindById = VenueModel.findById as jest.Mock;
const slotFind = VenueSlotModel.find as jest.Mock;
const venuesOf = audienceVenues as jest.Mock;
const hostsOf = audienceHosts as jest.Mock;
const clubsOf = audienceClubs as jest.Mock;
const contacts = contactsFor as jest.Mock;

const id = (n: number) => new Types.ObjectId(`65f1000000000000000000${String(n).padStart(2, '0')}`);
const CLUB = id(1);
const CATEGORY = id(2);
const CLUB_CITY = id(3);
const POD_CITY = id(4);
const VENUE = id(5);
const VENUE_CITY = id(6);

/** `Model.findById(..).select(..).lean()` resolving to `doc`. */
const leanChain = (doc: unknown) => ({ select: jest.fn(() => ({ lean: jest.fn().mockResolvedValue(doc) })) });

const contactMap = (rows: Array<{ user_id: string; full_name?: string; email?: string; phone?: string }>) =>
  new Map(
    rows.map((r) => [
      r.user_id,
      { user_id: r.user_id, full_name: r.full_name ?? '', email: r.email ?? '', phone: r.phone ?? '' },
    ])
  );

const fails = (code: string, message: string) =>
  expect.objectContaining({ message, extensions: expect.objectContaining({ code }) });

describe('podMatchKeys', () => {
  it('reads the sub-category off the club and prefers the pod’s own city', async () => {
    clubFindById.mockReturnValue(leanChain({ category_id: CATEGORY, location_id: CLUB_CITY }));

    const keys = await podMatchKeys({ club_id: CLUB, location_id: POD_CITY, venue_id: VENUE });

    expect(clubFindById).toHaveBeenCalledWith(CLUB);
    expect(venueFindById).not.toHaveBeenCalled();
    expect(keys).toEqual({ subCategoryId: CATEGORY, locationId: POD_CITY });
  });

  it('falls back to the venue’s city when the pod carries none', async () => {
    clubFindById.mockReturnValue(leanChain({ category_id: CATEGORY }));
    venueFindById.mockReturnValue(leanChain({ location_id: VENUE_CITY }));

    const keys = await podMatchKeys({ club_id: CLUB, location_id: null, venue_id: VENUE });

    expect(venueFindById).toHaveBeenCalledWith(VENUE);
    expect(keys).toEqual({ subCategoryId: CATEGORY, locationId: VENUE_CITY });
  });

  it('returns null city when the venue is gone or has no city', async () => {
    clubFindById.mockReturnValue(leanChain({ category_id: CATEGORY }));
    venueFindById.mockReturnValueOnce(leanChain(null)).mockReturnValueOnce(leanChain({}));

    await expect(podMatchKeys({ club_id: CLUB, venue_id: VENUE })).resolves.toEqual({
      subCategoryId: CATEGORY,
      locationId: null,
    });
    await expect(podMatchKeys({ club_id: CLUB, venue_id: VENUE })).resolves.toEqual({
      subCategoryId: CATEGORY,
      locationId: null,
    });
  });

  it('returns nulls without any read for a pod with neither club nor venue', async () => {
    await expect(podMatchKeys({})).resolves.toEqual({ subCategoryId: null, locationId: null });
    expect(clubFindById).not.toHaveBeenCalled();
    expect(venueFindById).not.toHaveBeenCalled();
  });

  it('returns a null sub-category when the club has no category', async () => {
    clubFindById.mockReturnValue(leanChain({ location_id: CLUB_CITY }));
    await expect(podMatchKeys({ club_id: CLUB, location_id: POD_CITY })).resolves.toEqual({
      subCategoryId: null,
      locationId: POD_CITY,
    });
  });
});

describe('candidatesForRequest', () => {
  const pod = { club_id: CLUB, location_id: POD_CITY };
  const none = { venueId: null, userIds: [] as string[] };

  beforeEach(() => {
    clubFindById.mockReturnValue(leanChain({ category_id: CATEGORY }));
  });

  it('refuses to match when the pod’s club has no category', async () => {
    clubFindById.mockReturnValue(leanChain({}));
    await expect(candidatesForRequest(pod, 'HOST', none)).rejects.toEqual(
      fails(
        'BAD_REQUEST',
        'This pod’s club has no category, so Duncit cannot match a replacement. Set the club’s category first.'
      )
    );
    expect(hostsOf).not.toHaveBeenCalled();
  });

  describe('VENUE', () => {
    it('lists matching venues in the pod’s city, minus the current one, with owner contacts', async () => {
      venuesOf.mockResolvedValue([
        { id: 'v-current', venue_name: 'Old Court', city: 'Pune', locality: 'Baner', owner_user_id: 'u-0' },
        { id: 'v-1', venue_name: 'Court One', city: 'Pune', locality: 'Aundh', owner_user_id: 'u-1' },
        { id: 'v-2', venue_name: 'Court Two', city: '', locality: '', owner_user_id: 'u-2' },
      ]);
      contacts.mockResolvedValue(
        contactMap([{ user_id: 'u-1', full_name: 'Owner One', email: 'one@example.test', phone: '+910000000001' }])
      );

      const rows = await candidatesForRequest(pod, 'VENUE', { venueId: 'v-current', userIds: [] });

      expect(venuesOf).toHaveBeenCalledWith(CATEGORY, { location_id: POD_CITY });
      expect(contacts).toHaveBeenCalledWith(['u-1', 'u-2']);
      expect(rows).toEqual([
        {
          id: 'v-1',
          user_id: 'u-1',
          label: 'Court One',
          detail: 'Aundh, Pune',
          full_name: 'Owner One',
          email: 'one@example.test',
          phone: '+910000000001',
          venue_id: 'v-1',
          club_id: null,
          club_name: '',
        },
        {
          id: 'v-2',
          user_id: 'u-2',
          label: 'Court Two',
          detail: '',
          full_name: '',
          email: '',
          phone: '',
          venue_id: 'v-2',
          club_id: null,
          club_name: '',
        },
      ]);
    });

    it('passes no city pin when the pod has no city at all', async () => {
      clubFindById.mockReturnValue(leanChain({ category_id: CATEGORY }));
      venuesOf.mockResolvedValue([]);
      contacts.mockResolvedValue(new Map());

      await expect(candidatesForRequest({ club_id: CLUB }, 'VENUE', none)).resolves.toEqual([]);
      expect(venuesOf).toHaveBeenCalledWith(CATEGORY, null);
    });
  });

  describe('HOST', () => {
    it('matches on category alone, drops current hosts, and prefers the Host record’s details', async () => {
      hostsOf.mockResolvedValue([
        { user_id: 'h-current', full_name: 'Current', email: 'c@example.test', phone: '1' },
        { user_id: 'h-1', full_name: 'Host Record', email: 'host@example.test', phone: '+910000000011' },
        { user_id: 'h-2', full_name: '', email: '', phone: '' },
      ]);
      contacts.mockResolvedValue(
        contactMap([
          { user_id: 'h-1', full_name: 'Account Name', email: 'acct@example.test', phone: '+910000000099' },
          { user_id: 'h-2', full_name: 'Fallback Name', email: 'fb@example.test', phone: '+910000000022' },
        ])
      );

      const rows = await candidatesForRequest(pod, 'HOST', { venueId: null, userIds: ['h-current'] });

      expect(hostsOf).toHaveBeenCalledWith(CATEGORY);
      expect(contacts).toHaveBeenCalledWith(['h-1', 'h-2']);
      expect(rows).toEqual([
        {
          id: 'h-1',
          user_id: 'h-1',
          label: 'Host Record',
          detail: '+910000000011',
          full_name: 'Host Record',
          email: 'host@example.test',
          phone: '+910000000011',
          venue_id: null,
          club_id: null,
          club_name: '',
        },
        {
          id: 'h-2',
          user_id: 'h-2',
          label: 'Fallback Name',
          detail: '+910000000022',
          full_name: 'Fallback Name',
          email: 'fb@example.test',
          phone: '+910000000022',
          venue_id: null,
          club_id: null,
          club_name: '',
        },
      ]);
    });
  });

  describe('CLUB_ADMIN', () => {
    it('groups each admin’s clubs into one row, skipping current admins', async () => {
      clubsOf.mockResolvedValue([
        { id: 'c-1', club_name: 'Runners', admin_user_ids: ['a-1', 'a-current'] },
        { id: 'c-2', club_name: 'Walkers', admin_user_ids: ['a-1', 'a-2'] },
      ]);
      contacts.mockResolvedValue(
        contactMap([
          { user_id: 'a-1', full_name: 'Admin One', email: 'a1@example.test', phone: '+910000000031' },
          { user_id: 'a-2', full_name: '', email: 'a2@example.test', phone: '' },
        ])
      );

      const rows = await candidatesForRequest(pod, 'CLUB_ADMIN', { venueId: null, userIds: ['a-current'] });

      expect(clubsOf).toHaveBeenCalledWith(CATEGORY, { location_id: POD_CITY });
      expect(contacts).toHaveBeenCalledWith(['a-1', 'a-2']);
      expect(rows).toEqual([
        {
          id: 'a-1',
          user_id: 'a-1',
          label: 'Admin One',
          detail: 'Runners, Walkers',
          full_name: 'Admin One',
          email: 'a1@example.test',
          phone: '+910000000031',
          venue_id: null,
          club_id: null,
          club_name: 'Runners',
        },
        {
          id: 'a-2',
          user_id: 'a-2',
          // No name on the account: the email labels the row.
          label: 'a2@example.test',
          detail: 'Walkers',
          full_name: '',
          email: 'a2@example.test',
          phone: '',
          venue_id: null,
          club_id: null,
          club_name: 'Walkers',
        },
      ]);
    });

    it('returns no rows when every admin is already on the pod', async () => {
      clubsOf.mockResolvedValue([{ id: 'c-1', club_name: 'Runners', admin_user_ids: ['a-current'] }]);
      contacts.mockResolvedValue(new Map());

      await expect(
        candidatesForRequest(pod, 'CLUB_ADMIN', { venueId: null, userIds: ['a-current'] })
      ).resolves.toEqual([]);
      expect(contacts).toHaveBeenCalledWith([]);
    });
  });
});

describe('slotsForVenue', () => {
  const NOW = new Date('2026-11-01T00:00:00Z');

  beforeEach(() => {
    jest.useFakeTimers({ now: NOW });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  const slotQuery = (docs: unknown[]) => {
    const lean = jest.fn().mockResolvedValue(docs);
    const limit = jest.fn(() => ({ lean }));
    const sort = jest.fn(() => ({ limit }));
    slotFind.mockReturnValue({ sort });
    return { sort, limit };
  };

  it('rejects a malformed venue id before reading anything', async () => {
    await expect(slotsForVenue('not-an-id')).rejects.toEqual(fails('BAD_USER_INPUT', 'Invalid venue_id'));
    expect(venueFindById).not.toHaveBeenCalled();
    expect(slotFind).not.toHaveBeenCalled();
  });

  it('lists future AVAILABLE slots, drops the venue’s leave days and fills defaults', async () => {
    venueFindById.mockReturnValue(leanChain({ settings: { holidays: ['2026-11-03'] } }));
    const { sort, limit } = slotQuery([
      {
        _id: id(40),
        venue_id: VENUE,
        start_at: new Date('2026-11-02T10:00:00Z'),
        end_at: new Date('2026-11-02T12:00:00Z'),
        price: 500,
        capacity: 12,
        space_label: 'Court A',
      },
      { _id: id(41), venue_id: VENUE, start_at: new Date('2026-11-03T10:00:00Z') },
      { _id: id(42), venue_id: VENUE, start_at: new Date('2026-11-04T10:00:00Z'), end_at: null },
    ]);

    const slots = await slotsForVenue(String(VENUE), 5);

    expect(slotFind).toHaveBeenCalledWith({
      venue_id: VENUE,
      status: 'AVAILABLE',
      start_at: { $gte: NOW },
    });
    expect(sort).toHaveBeenCalledWith({ start_at: 1 });
    expect(limit).toHaveBeenCalledWith(5);
    expect(slots).toEqual([
      {
        id: String(id(40)),
        venue_id: String(VENUE),
        start_at: '2026-11-02T10:00:00.000Z',
        end_at: '2026-11-02T12:00:00.000Z',
        price: 500,
        capacity: 12,
        space_label: 'Court A',
      },
      {
        id: String(id(42)),
        venue_id: String(VENUE),
        start_at: '2026-11-04T10:00:00.000Z',
        end_at: null,
        price: 0,
        capacity: 0,
        space_label: '',
      },
    ]);
  });

  it('keeps every slot when the venue is missing (no holidays to apply) and defaults the limit to 200', async () => {
    venueFindById.mockReturnValue(leanChain(null));
    const { limit } = slotQuery([{ _id: id(43), venue_id: VENUE, start_at: new Date('2026-11-03T10:00:00Z') }]);

    const slots = await slotsForVenue(String(VENUE));

    expect(limit).toHaveBeenCalledWith(200);
    expect(slots.map((s) => s.id)).toEqual([String(id(43))]);
  });
});
