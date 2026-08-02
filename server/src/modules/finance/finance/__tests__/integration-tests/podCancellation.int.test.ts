import { Types } from 'mongoose';
import { podCancellationService } from '../../podCancellation.service';
import { financeResolvers } from '../../finance.resolver';
import { PodModel } from '@modules/pods/pod/pod.model';
import { PodAuditLogModel } from '@modules/pods/podAudit/podAudit.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { UserModel } from '@modules/access/user/user.model';
import { makeContext } from '@test/harness';

const makePod = (over: Record<string, unknown> = {}) =>
  PodModel.create({
    pod_id: `cx-${Math.random().toString(36).slice(2)}`,
    pod_title: 'Cancelled pod',
    club_id: new Types.ObjectId(),
    pod_description: 'desc',
    pod_type: 'PAID',
    pod_amount: 500,
    pod_date_time: new Date('2026-08-10T18:00:00.000Z'),
    no_of_spots: 6,
    is_active: false,
    ...over,
  });

const makePayment = (podId: unknown, status: string, total: number) =>
  PaymentModel.create({
    payment_id: `pay-${Math.random().toString(36).slice(2)}`,
    user_id: new Types.ObjectId(),
    user_name: 'Payer',
    user_email: 'payer@x.com',
    pod_id: podId,
    subtotal: total,
    total,
    status,
  } as never);

const audit = (podId: unknown, action: string, over: Record<string, unknown> = {}) =>
  PodAuditLogModel.create({
    pod_id: podId,
    pod_title: 'Cancelled pod',
    source: 'HOST',
    action,
    ...over,
  } as never);

describe('podCancellationService', () => {
  it('returns an empty list and zeroed stats when nothing was cancelled', async () => {
    expect(await podCancellationService.list()).toEqual([]);
    const stats = await podCancellationService.stats();
    expect(stats).toMatchObject({
      total_cancelled: 0,
      cancelled_by_host: 0,
      cancelled_by_venue: 0,
      cancelled_by_admin: 0,
      cancelled_by_club_admin: 0,
      total_refund_amount: 0,
      refunded_payment_count: 0,
    });
    expect(stats.currency_symbol).toBeTruthy();
  });

  it('assembles host cancellations with refunds, venue money and host names', async () => {
    const host = await UserModel.create({
      auth: { email: 'host@x.com' },
      profile: { first_name: 'Hema', last_name: 'Kaur' },
    } as never);
    const owner = new Types.ObjectId();
    const venue = await VenueModel.create({ owner_user_id: owner, venue_name: 'Blue Hall' } as never);
    const slot = await VenueSlotModel.create({
      venue_id: venue._id,
      owner_user_id: owner,
      start_at: new Date('2026-08-10T17:00:00.000Z'),
      end_at: new Date('2026-08-10T21:00:00.000Z'),
      price: 1200,
    } as never);
    const ghostHostId = new Types.ObjectId(); // host with no user doc
    // Host with a user doc but no profile names (raw legacy doc) — resolves to
    // '' and drops out of host_names.
    const namelessId = new Types.ObjectId();
    await UserModel.collection.insertOne({
      _id: namelessId,
      auth: { email: 'noprof@x.com' },
      profile: {},
    });
    const pod = await makePod({
      pod_hosts_id: [host._id, ghostHostId, namelessId],
      pod_attendees: [new Types.ObjectId(), new Types.ObjectId()],
      venue_id: venue._id,
      venue_slot_id: slot._id,
      deleted_at: new Date('2026-07-20T12:00:00.000Z'),
    });
    // Older DELETE audit first, then the latest one — the row must read the latest.
    await audit(pod._id, 'DELETE', { note: 'first attempt', actor_name: 'Old Actor' });
    await audit(pod._id, 'DELETE', { note: 'Event cancelled — rain', actor_name: 'Hema Kaur' });
    await makePayment(pod._id, 'REFUNDED', 100);
    await makePayment(pod._id, 'REFUNDED', 150);
    await makePayment(pod._id, 'SUCCESS', 200);
    await makePayment(pod._id, 'FAILED', 999); // ignored

    const rows = await podCancellationService.list();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      pod_id: String(pod._id),
      pod_title: 'Cancelled pod',
      kind: 'HOST',
      reason: 'Event cancelled — rain',
      actor_name: 'Hema Kaur',
      cancelled_at: '2026-07-20T12:00:00.000Z',
      pod_amount: 500,
      attendee_count: 2,
      refunded_count: 2,
      refunded_total: 250,
      unrefunded_count: 1,
      unrefunded_total: 200,
      venue_id: String(venue._id),
      venue_name: 'Blue Hall',
      venue_amount: 1200,
      host_names: ['Hema Kaur'],
    });

    const stats = await podCancellationService.stats();
    expect(stats).toMatchObject({
      total_cancelled: 1,
      cancelled_by_host: 1,
      total_refund_amount: 250,
      refunded_payment_count: 2,
    });
  });

  it('classifies venue declines, club-admin/admin deletes and audit-less pods', async () => {
    const declined = await makePod({ venue_approval_status: 'DECLINED' });
    const declineEntry = await audit(declined._id, 'VENUE_DECLINED', {
      source: 'VENUE_OWNER',
      note: 'Double booking',
      actor_name: 'Venue Owner',
    });
    const declinedSilent = await makePod({ venue_approval_status: 'DECLINED' });
    const noAudit = await makePod({ deleted_at: new Date('2026-07-01T00:00:00.000Z') });
    const clubDeleted = await makePod({ deleted_at: new Date('2026-07-02T00:00:00.000Z') });
    await audit(clubDeleted._id, 'DELETE', { source: 'CLUB_ADMIN', note: 'Policy' });
    const adminDeleted = await makePod({ deleted_at: new Date('2026-07-03T00:00:00.000Z') });
    await audit(adminDeleted._id, 'DELETE', { source: 'ADMIN', note: 'Fraud' });

    const rows = await podCancellationService.list();
    const byPod = new Map(rows.map((r) => [r.pod_id, r]));
    expect(byPod.get(String(declined._id))).toMatchObject({
      kind: 'VENUE',
      reason: 'Double booking',
      cancelled_at: declineEntry.created_at.toISOString(),
      venue_id: null,
      venue_name: null,
      venue_amount: 0,
    });
    expect(byPod.get(String(declinedSilent._id))).toMatchObject({ kind: 'VENUE', reason: '' });
    expect(byPod.get(String(declinedSilent._id))?.cancelled_at).toBeTruthy();
    expect(byPod.get(String(noAudit._id))).toMatchObject({ kind: 'SYSTEM', reason: '' });
    expect(byPod.get(String(clubDeleted._id))).toMatchObject({ kind: 'CLUB_ADMIN' });
    expect(byPod.get(String(adminDeleted._id))).toMatchObject({ kind: 'ADMIN' });

    expect(await podCancellationService.list('VENUE')).toHaveLength(2);
    expect(await podCancellationService.list('CLUB_ADMIN')).toHaveLength(1);

    const stats = await podCancellationService.stats();
    expect(stats).toMatchObject({
      total_cancelled: 5,
      cancelled_by_venue: 2,
      cancelled_by_admin: 2, // ADMIN + SYSTEM
      cancelled_by_club_admin: 1,
    });
  });

  it('tolerates legacy pod documents and a missing venue doc', async () => {
    const rawId = new Types.ObjectId();
    await PodModel.collection.insertOne({
      _id: rawId,
      pod_id: 'legacy-cancel',
      pod_title: 'Legacy',
      pod_description: 'd',
      pod_type: 'FREE',
      deleted_at: new Date('2026-06-01T00:00:00.000Z'),
      venue_id: new Types.ObjectId(), // venue doc does not exist
    });
    // Raw declined doc without timestamps or audit — cancelled_at falls to ''.
    const rawDeclinedId = new Types.ObjectId();
    await PodModel.collection.insertOne({
      _id: rawDeclinedId,
      pod_id: 'legacy-declined',
      pod_title: 'Legacy declined',
      pod_description: 'd',
      pod_type: 'FREE',
      deleted_at: null,
      venue_approval_status: 'DECLINED',
    });
    const rows = await podCancellationService.list();
    expect(rows).toHaveLength(2);
    const byPod = new Map(rows.map((r) => [r.pod_id, r]));
    expect(byPod.get(String(rawId))).toMatchObject({
      kind: 'SYSTEM',
      pod_date_time: null,
      pod_amount: 0,
      attendee_count: 0,
      venue_name: null,
      host_names: [],
      club_id: null,
    });
    expect(byPod.get(String(rawDeclinedId))).toMatchObject({ kind: 'VENUE', cancelled_at: '' });
  });

  it('is role-gated on both resolvers', async () => {
    const admin = makeContext({ roles: ['FINANCE_MANAGER'] });
    expect(await financeResolvers.Query.podCancellations(null, {}, admin)).toEqual([]);
    expect(
      (await financeResolvers.Query.podCancellationStats(null, {}, admin)).total_cancelled,
    ).toBe(0);
    await expect(
      financeResolvers.Query.podCancellations(null, {}, makeContext({ roles: [] })),
    ).rejects.toThrow();
    await expect(
      financeResolvers.Query.podCancellationStats(null, {}, makeContext(null)),
    ).rejects.toThrow();
  });
});
