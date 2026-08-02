import { Types } from 'mongoose';
import { venuePodsService } from '../../venuePods.service';
import { venueResolvers } from '../../venue.resolver';
import { VenueModel } from '../../venue.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { UserModel } from '@modules/access/user/user.model';
import { makeContext } from '@test/harness';

const ownerId = new Types.ObjectId();

const makeVenue = (name: string, owner: Types.ObjectId = ownerId) =>
  VenueModel.create({ owner_user_id: owner, venue_name: name } as never);

const makePod = (venueId: unknown, over: Record<string, unknown> = {}) =>
  PodModel.create({
    pod_id: `vp-${Math.random().toString(36).slice(2)}`,
    pod_title: 'Venue pod',
    club_id: new Types.ObjectId(),
    pod_description: 'desc',
    pod_type: 'PAID',
    pod_amount: 300,
    pod_date_time: new Date(Date.now() + 86_400_000),
    no_of_spots: 8,
    is_active: true,
    venue_id: venueId,
    venue_approval_status: 'APPROVED',
    ...over,
  });

describe('venuePodsService.listForOwner', () => {
  it('rejects malformed and foreign venue ids, returns [] with no venues', async () => {
    await expect(venuePodsService.listForOwner(String(ownerId), 'nope')).rejects.toThrow(
      'Venue not found',
    );
    const foreign = await makeVenue('Not Mine', new Types.ObjectId());
    await expect(
      venuePodsService.listForOwner(String(ownerId), String(foreign._id)),
    ).rejects.toThrow('You do not own this venue');
    expect(await venuePodsService.listForOwner(String(new Types.ObjectId()))).toEqual([]);
  });

  it('lists all lifecycle buckets across owned venues, excluding pending bookings', async () => {
    const venueA = await makeVenue('Hall A');
    const venueB = await makeVenue('Hall B');
    const other = await makeVenue('Foreign Hall', new Types.ObjectId());
    const host = await UserModel.create({
      auth: { email: 'h@x.com' },
      profile: { first_name: 'Hema', last_name: 'Kaur' },
    } as never);
    // A host with no profile names (raw legacy doc) and one with no user doc
    // both drop out of host_names.
    const namelessId = new Types.ObjectId();
    await UserModel.collection.insertOne({
      _id: namelessId,
      auth: { email: 'noprof@x.com' },
      profile: {},
    });
    const ghostHostId = new Types.ObjectId();
    const attendee = new Types.ObjectId();

    const upcoming = await makePod(venueA._id, {
      pod_hosts_id: [host._id, namelessId, ghostHostId],
      pod_attendees: [attendee],
    });
    const completed = await makePod(venueA._id, {
      pod_date_time: new Date('2026-01-01T10:00:00.000Z'),
      pod_end_date_time: new Date('2026-01-01T12:00:00.000Z'),
      completed_at: new Date('2026-01-01T13:00:00.000Z'),
    });
    const cancelled = await makePod(venueB._id, {
      deleted_at: new Date('2026-02-01T00:00:00.000Z'),
    });
    const ongoing = await makePod(venueB._id, {
      pod_date_time: new Date(Date.now() - 3_600_000),
      pod_end_date_time: new Date(Date.now() + 3_600_000),
    });
    await makePod(venueA._id, { venue_approval_status: 'PENDING' }); // excluded
    await makePod(other._id); // foreign venue, excluded

    const rows = await venuePodsService.listForOwner(String(ownerId));
    const byId = new Map(rows.map((r) => [r.id, r]));
    expect(rows).toHaveLength(4);
    expect(byId.get(String(upcoming._id))).toMatchObject({
      bucket: 'UPCOMING',
      venue_name: 'Hall A',
      host_names: ['Hema Kaur'],
      attendee_count: 1,
      pod_attendees: [String(attendee)],
      pod_amount: 300,
    });
    expect(byId.get(String(completed._id))).toMatchObject({
      bucket: 'COMPLETED',
      completed_at: '2026-01-01T13:00:00.000Z',
      pod_end_date_time: '2026-01-01T12:00:00.000Z',
    });
    expect(byId.get(String(cancelled._id))).toMatchObject({
      bucket: 'CANCELLED',
      cancelled_at: '2026-02-01T00:00:00.000Z',
      venue_name: 'Hall B',
    });
    expect(byId.get(String(ongoing._id))).toMatchObject({ bucket: 'ONGOING' });

    const onlyA = await venuePodsService.listForOwner(String(ownerId), String(venueA._id));
    expect(onlyA.map((r) => r.venue_name)).toEqual(['Hall A', 'Hall A']);
  });

  it('tolerates legacy pod documents missing optional arrays', async () => {
    const venue = await makeVenue('Hall L');
    const rawId = new Types.ObjectId();
    await PodModel.collection.insertOne({
      _id: rawId,
      pod_id: 'legacy-vp',
      pod_title: 'Legacy',
      pod_description: 'd',
      pod_type: 'FREE',
      venue_id: venue._id,
      venue_approval_status: 'APPROVED',
      deleted_at: null,
    });
    const rows = await venuePodsService.listForOwner(String(ownerId));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      pod_date_time: '',
      pod_end_date_time: null,
      pod_amount: 0,
      no_of_spots: 0,
      attendee_count: 0,
      pod_attendees: [],
      host_names: [],
      completed_at: null,
      cancelled_at: null,
      created_at: '',
    });
  });

  it('resolves through the venuePods resolver for the signed-in owner', async () => {
    await makeVenue('Hall R');
    const rows = await venueResolvers.Query.venuePods(
      null,
      {},
      makeContext({ id: String(ownerId) }),
    );
    expect(rows).toEqual([]);
    await expect(venueResolvers.Query.venuePods(null, {}, makeContext(null))).rejects.toThrow(
      'Authentication required',
    );
  });
});
