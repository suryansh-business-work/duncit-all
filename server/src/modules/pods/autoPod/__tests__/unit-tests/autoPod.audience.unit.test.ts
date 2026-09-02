/**
 * Who an Auto Pod of one sub-category is offered to — the one rule the
 * notifications, the admin's step-1 counts and the drawer behind each count
 * all read. Every collaborator is faked; what is under test is the matching
 * (sub-category for all three roles, the pinned city for venues and clubs)
 * and the shaping of the rows the admin sees.
 */
import { Types } from 'mongoose';

jest.mock('@modules/venues/venue/venue.model', () => ({ VenueModel: { find: jest.fn() } }));
jest.mock('@modules/venues/host/host.model', () => ({ HostModel: { find: jest.fn() } }));
jest.mock('@modules/clubs/club/club.model', () => ({ ClubModel: { find: jest.fn() } }));
jest.mock('@modules/access/user/user.model', () => ({ UserModel: { find: jest.fn() } }));

import { VenueModel } from '@modules/venues/venue/venue.model';
import { HostModel } from '@modules/venues/host/host.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { UserModel } from '@modules/access/user/user.model';
import { audienceClubs, audienceHosts, audienceVenues, autoPodAudience } from '../../autoPod.audience';
import type { IAutoPodLocation } from '../../autoPod.model';

const venues = VenueModel as unknown as Record<string, jest.Mock>;
const hosts = HostModel as unknown as Record<string, jest.Mock>;
const clubs = ClubModel as unknown as Record<string, jest.Mock>;
const users = UserModel as unknown as Record<string, jest.Mock>;

const SUB = new Types.ObjectId('65b000000000000000000001');
const OWNER = '65b000000000000000000010';
const ADMIN_A = '65b000000000000000000011';
const ADMIN_B = '65b000000000000000000012';
const HOST = '65b000000000000000000013';
const CITY = new Types.ObjectId('65b000000000000000000020');

/** `find().select().lean()` as one chain. */
const chain = (value: unknown) => ({
  select: () => chain(value),
  lean: () => Promise.resolve(value),
});

const location: IAutoPodLocation = {
  location_id: CITY,
  location_name: 'Bengaluru',
  country: 'India',
  state: 'Karnataka',
  city: 'Bengaluru',
  bound_by: 'VENUE',
  bound_at: new Date('2026-08-20T10:00:00Z'),
};

beforeEach(() => {
  venues.find.mockReturnValue(chain([]));
  hosts.find.mockReturnValue(chain([]));
  clubs.find.mockReturnValue(chain([]));
  users.find.mockReturnValue(chain([]));
});

describe('audienceVenues', () => {
  it('matches approved, active venues that host the sub-category', async () => {
    venues.find.mockReturnValue(
      chain([{ _id: 'v1', venue_name: 'Play Arena', city: 'Bengaluru', locality: 'HSR', owner_user_id: OWNER }])
    );
    const rows = await audienceVenues(SUB, null);
    expect(venues.find).toHaveBeenCalledWith({
      status: 'APPROVED',
      is_active: true,
      'venue_category.sub_category_id': SUB,
    });
    expect(rows).toEqual([
      { id: 'v1', venue_name: 'Play Arena', city: 'Bengaluru', locality: 'HSR', owner_user_id: OWNER },
    ]);
  });

  it('narrows to the pinned city once the offer has one', async () => {
    await audienceVenues(SUB, location);
    expect(venues.find).toHaveBeenCalledWith(expect.objectContaining({ location_id: CITY }));
  });

  it('blanks the display fields a venue never filled in', async () => {
    venues.find.mockReturnValue(chain([{ _id: 'v2', owner_user_id: OWNER }]));
    const [row] = await audienceVenues(SUB, null);
    expect(row).toEqual({ id: 'v2', venue_name: '', city: '', locality: '', owner_user_id: OWNER });
  });
});

describe('audienceHosts', () => {
  it('matches approved, active hosts onboarded into the sub-category, with no city', async () => {
    hosts.find.mockReturnValue(
      chain([{ user_id: HOST, full_name: 'Asha Rao', email: 'asha@example.com', phone: '9999999999' }])
    );
    const rows = await audienceHosts(SUB);
    expect(hosts.find).toHaveBeenCalledWith({
      status: 'APPROVED',
      is_active: true,
      'host_categories.sub_category_id': SUB,
    });
    expect(rows).toEqual([
      { user_id: HOST, full_name: 'Asha Rao', email: 'asha@example.com', phone: '9999999999' },
    ]);
  });

  it('blanks contact fields a host never filled in', async () => {
    hosts.find.mockReturnValue(chain([{ user_id: HOST }]));
    expect(await audienceHosts(SUB)).toEqual([{ user_id: HOST, full_name: '', email: '', phone: '' }]);
  });
});

describe('audienceClubs', () => {
  it('matches active clubs carrying the sub-category, in the pinned city', async () => {
    clubs.find.mockReturnValue(chain([{ _id: 'c1', club_name: 'Runners', admin_user_ids: [ADMIN_A] }]));
    const rows = await audienceClubs(SUB, location);
    expect(clubs.find).toHaveBeenCalledWith({ category_id: SUB, is_active: true, location_id: CITY });
    expect(rows).toEqual([{ id: 'c1', club_name: 'Runners', admin_user_ids: [ADMIN_A] }]);
  });

  it('reads a club with no admins as an empty list rather than failing', async () => {
    clubs.find.mockReturnValue(chain([{ _id: 'c2' }]));
    expect(await audienceClubs(SUB, null)).toEqual([{ id: 'c2', club_name: '', admin_user_ids: [] }]);
  });
});

describe('autoPodAudience', () => {
  it('refuses anything that is not a category id', async () => {
    await expect(autoPodAudience('not-an-id')).rejects.toMatchObject({
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });

  it('counts each role and names the people behind the venues and clubs', async () => {
    venues.find.mockReturnValue(
      chain([{ _id: 'v1', venue_name: 'Play Arena', city: 'Bengaluru', locality: 'HSR', owner_user_id: OWNER }])
    );
    hosts.find.mockReturnValue(chain([{ user_id: HOST, full_name: 'Asha Rao', email: '', phone: '' }]));
    clubs.find.mockReturnValue(
      chain([
        { _id: 'c1', club_name: 'Runners', admin_user_ids: [ADMIN_A, ADMIN_B] },
        // The same admin on a second club is ONE person with two clubs, not two rows.
        { _id: 'c2', club_name: 'Trail Club', admin_user_ids: [ADMIN_A] },
      ])
    );
    users.find.mockReturnValue(
      chain([
        { _id: OWNER, profile: { first_name: 'Om', last_name: 'Prakash' }, auth: { email: 'om@example.com' } },
        { _id: ADMIN_A, profile: { first_name: 'Neha' }, auth: { email: 'neha@example.com' } },
      ])
    );

    const audience = await autoPodAudience(String(SUB));

    expect(audience.venue_count).toBe(1);
    expect(audience.host_count).toBe(1);
    expect(audience.club_admin_count).toBe(2);
    expect(audience.venues[0]).toMatchObject({ id: 'v1', owner_name: 'Om Prakash' });
    expect(audience.club_admins).toEqual([
      { user_id: ADMIN_A, full_name: 'Neha', email: 'neha@example.com', club_names: ['Runners', 'Trail Club'] },
      // A user row that no longer exists still counts — the club lists them as its admin.
      { user_id: ADMIN_B, full_name: '', email: '', club_names: ['Runners'] },
    ]);
    // Every venue owner and club admin is looked up ONCE, however many rows name them.
    const [filter] = users.find.mock.calls[0];
    expect(filter._id.$in.map(String).sort((a: string, b: string) => a.localeCompare(b))).toEqual(
      [OWNER, ADMIN_A, ADMIN_B].sort((a, b) => a.localeCompare(b))
    );
  });

  it('skips the user lookup entirely when nobody is behind the counts', async () => {
    const audience = await autoPodAudience(String(SUB));
    expect(audience).toEqual({
      venue_count: 0,
      host_count: 0,
      club_admin_count: 0,
      venues: [],
      hosts: [],
      club_admins: [],
    });
    expect(users.find).not.toHaveBeenCalled();
  });
});
