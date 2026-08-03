import { Types } from 'mongoose';
import { podService } from '../../pod.service';
import { PodModel } from '../../pod.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { UserModel } from '@modules/access/user/user.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { paymentService } from '@modules/finance/payment/payment.service';
import { PodAuditLogModel } from '@modules/pods/podAudit/podAudit.model';
import { HealthAdjustmentModel } from '@modules/access/accountHealth/accountHealth.model';
import { settingsService } from '@modules/platform/settings/settings.service';
import { podCancellationService } from '@modules/finance/finance/podCancellation.service';
import * as emailService from '@services/email/email.service';
import { logs } from '@observability/log';

const ownerId = new Types.ObjectId();
const strangerId = new Types.ObjectId();
const hostId = new Types.ObjectId();
const DAY = 86_400_000;
const HOUR = 3_600_000;

beforeEach(() => {
  jest.spyOn(emailService, 'sendPodCancelledEmail').mockResolvedValue(undefined as never);
  jest.spyOn(emailService, 'sendPodRefundEmail').mockResolvedValue(undefined as never);
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

const seedVenue = (over: Record<string, unknown> = {}) =>
  VenueModel.create({
    owner_user_id: ownerId,
    status: 'APPROVED',
    is_active: true,
    venue_name: 'Sunset Hall',
    owner_email: 'owner@example.com',
    ...over,
  } as never);

const seedPod = (over: Record<string, unknown> = {}) =>
  PodModel.create({
    pod_id: `vc-${new Types.ObjectId().toString()}`,
    pod_title: 'Sunset poetry',
    pod_hosts_id: [hostId],
    club_id: new Types.ObjectId(),
    pod_description: 'An evening of poetry',
    pod_type: 'PAID',
    pod_amount: 300,
    pod_date_time: new Date(Date.now() + DAY),
    no_of_spots: 8,
    is_active: true,
    venue_approval_status: 'APPROVED',
    ...over,
  });

const seedAttendee = (email: string) =>
  UserModel.create({
    auth: { email },
    profile: { first_name: 'Ravi', last_name: 'Menon' },
  } as never);

const seedPayment = (
  podId: Types.ObjectId,
  userId: Types.ObjectId,
  over: Record<string, unknown> = {}
) =>
  PaymentModel.create({
    payment_id: `pay-${Math.random().toString(36).slice(2)}`,
    user_id: userId,
    user_name: 'Payer',
    user_email: 'payer@example.com',
    billing_address: 'addr',
    checkout_url: 'https://mweb.duncit.com/checkout',
    target_type: 'POD',
    pod_id: podId,
    description: 'pod booking',
    subtotal: 300,
    platform_fee_pct: 0,
    platform_fee_amount: 0,
    gst_pct: 0,
    gst_amount: 0,
    total: 300,
    currency_symbol: '₹',
    status: 'SUCCESS',
    gateway: 'DUMMY',
    ...over,
  } as never);

/** An upcoming pod booked at the owner's venue, with one paying attendee and
 * one who joined for free — the shape every happy-path case starts from. */
async function seedBookedPod(over: Record<string, unknown> = {}) {
  const venue = await seedVenue();
  const payer = await seedAttendee('payer@example.com');
  const freeloader = await seedAttendee('free@example.com');
  const pod = await seedPod({
    venue_id: venue._id,
    pod_attendees: [hostId, payer._id, freeloader._id],
    ...over,
  });
  const payment = await seedPayment(pod._id as Types.ObjectId, payer._id as Types.ObjectId);
  return { venue, pod, payer, freeloader, payment };
}

describe('podService.venueCancelPod — guards', () => {
  it('rejects an invalid pod id', async () => {
    await expect(podService.venueCancelPod('not-an-id', String(ownerId), 'Kitchen fire')).rejects.toThrow(
      /invalid pod id/i
    );
  });

  it('demands a reason of at least 5 characters', async () => {
    const { pod } = await seedBookedPod();
    await expect(podService.venueCancelPod(String(pod._id), String(ownerId), '  no  ')).rejects.toThrow(
      /describe why you are cancelling/i
    );
    await expect(
      podService.venueCancelPod(String(pod._id), String(ownerId), undefined as unknown as string)
    ).rejects.toThrow(/describe why you are cancelling/i);
  });

  it('is NOT_FOUND for a pod that does not exist', async () => {
    await expect(
      podService.venueCancelPod(String(new Types.ObjectId()), String(ownerId), 'Kitchen fire')
    ).rejects.toThrow(/pod not found/i);
  });

  it('is NOT_FOUND for an already-cancelled pod, before any refund runs', async () => {
    const { pod, payment } = await seedBookedPod();
    await podService.remove(String(pod._id));

    await expect(
      podService.venueCancelPod(String(pod._id), String(ownerId), 'Kitchen fire')
    ).rejects.toThrow(/pod not found/i);

    const untouched = await PaymentModel.findById(payment._id);
    expect(untouched?.status).toBe('SUCCESS');
    expect(await HealthAdjustmentModel.countDocuments({})).toBe(0);
  });

  it('rejects a pod that is not booked at a venue at all', async () => {
    const pod = await seedPod({ venue_approval_status: 'NONE' });
    await expect(
      podService.venueCancelPod(String(pod._id), String(ownerId), 'Kitchen fire')
    ).rejects.toThrow(/not booked at a venue you own/i);
  });

  it('rejects a pod whose venue booking is not APPROVED yet', async () => {
    const venue = await seedVenue();
    const pod = await seedPod({ venue_id: venue._id, venue_approval_status: 'PENDING' });
    await expect(
      podService.venueCancelPod(String(pod._id), String(ownerId), 'Kitchen fire')
    ).rejects.toThrow(/not booked at a venue you own/i);
  });

  it("rejects a pod booked at somebody else's venue", async () => {
    const { pod } = await seedBookedPod();
    await expect(
      podService.venueCancelPod(String(pod._id), String(strangerId), 'Kitchen fire')
    ).rejects.toThrow(/not booked at a venue you own/i);
  });

  it('rejects an ongoing pod', async () => {
    const { pod } = await seedBookedPod({
      pod_date_time: new Date(Date.now() - HOUR),
      pod_end_date_time: new Date(Date.now() + HOUR),
    });
    await expect(
      podService.venueCancelPod(String(pod._id), String(ownerId), 'Kitchen fire')
    ).rejects.toThrow(/only an upcoming pod can be cancelled/i);
  });

  it('rejects a completed pod', async () => {
    const { pod } = await seedBookedPod({
      pod_date_time: new Date(Date.now() - 2 * DAY),
      pod_end_date_time: new Date(Date.now() - DAY),
    });
    await expect(
      podService.venueCancelPod(String(pod._id), String(ownerId), 'Kitchen fire')
    ).rejects.toThrow(/only an upcoming pod can be cancelled/i);
  });
});

describe('podService.venueCancelPod — cancellation', () => {
  it('refunds paid attendees, cancels the pod and deducts the venue health penalty', async () => {
    const { venue, pod, payment } = await seedBookedPod();

    const result = await podService.venueCancelPod(
      String(pod._id),
      String(ownerId),
      'Kitchen fire — the hall is unusable'
    );

    expect(result).toEqual({
      pod_id: String(pod._id),
      health_penalty: 5,
      venue_health_score: 95,
      refunded_count: 1,
    });

    const refunded = await PaymentModel.findById(payment._id);
    expect(refunded?.status).toBe('REFUNDED');
    expect((refunded as any)?.metadata?.refund_reason).toBe('Kitchen fire — the hall is unusable');
    expect((refunded as any)?.metadata?.refund_initiated_by).toBe('VENUE_OWNER');
    expect((refunded as any)?.metadata?.refund_initiator_id).toBe(String(ownerId));

    expect(await PodModel.findById(pod._id)).toBeNull();

    const audit = await PodAuditLogModel.findOne({ pod_id: pod._id, action: 'DELETE' });
    expect(audit?.source).toBe('VENUE_OWNER');
    expect(audit?.note).toBe('Kitchen fire — the hall is unusable');

    const adjustments = await HealthAdjustmentModel.find({ subject_id: venue._id });
    expect(adjustments).toHaveLength(1);
    expect(adjustments[0].subject_type).toBe('VENUE');
    expect(adjustments[0].delta).toBe(-5);
    expect(adjustments[0].created_by).toBeNull();
    expect(adjustments[0].remark).toContain('Sunset poetry');
    expect(adjustments[0].remark).toContain('Kitchen fire');

    // Both attendees hear about the cancellation; only the payer gets a refund note.
    expect(emailService.sendPodCancelledEmail).toHaveBeenCalledTimes(2);
    expect(emailService.sendPodRefundEmail).toHaveBeenCalledTimes(1);
    const refundLines = (emailService.sendPodCancelledEmail as jest.Mock).mock.calls.map(
      ([arg]) => arg.refund_line
    );
    expect(refundLines).toContain('Your payment of ₹300 will be refunded.');
    expect(refundLines).toContain('');
  });

  it('cancels a pod that has no payments at all', async () => {
    const venue = await seedVenue();
    const pod = await seedPod({ venue_id: venue._id });

    const result = await podService.venueCancelPod(
      String(pod._id),
      String(ownerId),
      'Double booked the hall'
    );

    expect(result.refunded_count).toBe(0);
    expect(result.venue_health_score).toBe(95);
    expect(await PodModel.findById(pod._id)).toBeNull();
    expect(emailService.sendPodRefundEmail).not.toHaveBeenCalled();
    expect(await HealthAdjustmentModel.countDocuments({ subject_id: venue._id })).toBe(1);
  });

  it('records no health adjustment when the configured penalty is 0', async () => {
    await settingsService.updateAppSettings({ venue_cancel_health_penalty: 0 });
    const { venue, pod } = await seedBookedPod();

    const result = await podService.venueCancelPod(
      String(pod._id),
      String(ownerId),
      'Renovation overran'
    );

    expect(result.health_penalty).toBe(0);
    expect(result.venue_health_score).toBe(100);
    expect(await HealthAdjustmentModel.countDocuments({ subject_id: venue._id })).toBe(0);
  });

  it('applies the admin-configured penalty instead of the default', async () => {
    await settingsService.updateAppSettings({ venue_cancel_health_penalty: 20 });
    const { pod } = await seedBookedPod();

    const result = await podService.venueCancelPod(
      String(pod._id),
      String(ownerId),
      'Licence suspended'
    );

    expect(result.health_penalty).toBe(20);
    expect(result.venue_health_score).toBe(80);
  });

  it('trims the reason to 500 characters', async () => {
    const { pod } = await seedBookedPod();
    const reason = `  ${'x'.repeat(600)}  `;

    await podService.venueCancelPod(String(pod._id), String(ownerId), reason);

    const audit = await PodAuditLogModel.findOne({ pod_id: pod._id, action: 'DELETE' });
    expect(audit?.note).toHaveLength(500);
  });

  it('lists the cancellation in Finance → Cancel & Refunds as kind VENUE', async () => {
    const { pod } = await seedBookedPod();

    await podService.venueCancelPod(String(pod._id), String(ownerId), 'Kitchen fire in the hall');

    const rows = await podCancellationService.list('VENUE');
    const row = rows.find((r) => r.pod_id === String(pod._id));
    expect(row?.kind).toBe('VENUE');
    expect(row?.reason).toBe('Kitchen fire in the hall');
    expect(row?.refunded_count).toBe(1);
    expect(row?.venue_name).toBe('Sunset Hall');
  });

  it('raises a refund row in Finance → Payment Logs for every paid attendee', async () => {
    const { pod, payer } = await seedBookedPod();
    const second = await seedAttendee('second@example.com');
    const secondPayment = await seedPayment(pod._id as Types.ObjectId, second._id as Types.ObjectId);
    await PodModel.updateOne({ _id: pod._id }, { $push: { pod_attendees: second._id } });

    await podService.venueCancelPod(String(pod._id), String(ownerId), 'Roof collapsed overnight');

    // The finance portal's Payment Logs page is payments(filter) with the
    // Refunded status chip — the refund row IS the flipped payment.
    const refundRows = await paymentService.list({ status: 'REFUNDED', pod_id: String(pod._id) });
    expect(refundRows).toHaveLength(2);
    expect(refundRows.map((r: { user_id: string }) => r.user_id).sort()).toEqual(
      [String(payer._id), String(second._id)].sort()
    );

    const stored = await PaymentModel.findById(secondPayment._id);
    expect(stored?.status).toBe('REFUNDED');
    expect((stored as any)?.metadata?.refund_initiated_by).toBe('VENUE_OWNER');
    expect((stored as any)?.metadata?.refund_reason).toBe('Roof collapsed overnight');
    expect((stored as any)?.metadata?.refunded_at).toBeTruthy();

    // Nothing is left behind as an unrefunded liability on the cancellation.
    const row = (await podCancellationService.list('VENUE')).find(
      (r) => r.pod_id === String(pod._id)
    );
    expect(row?.refunded_count).toBe(2);
    expect(row?.refunded_total).toBe(600);
    expect(row?.unrefunded_count).toBe(0);
    expect(row?.unrefunded_total).toBe(0);
  });

  it('docks the venue once when the same pod is cancelled twice at the same moment', async () => {
    const { venue, pod, payment } = await seedBookedPod();

    const [first, second] = await Promise.all([
      podService.venueCancelPod(String(pod._id), String(ownerId), 'Kitchen fire in the hall'),
      podService.venueCancelPod(String(pod._id), String(ownerId), 'Kitchen fire in the hall'),
    ]);

    // Exactly one call commits the cancellation and takes the penalty; the
    // other reports health_penalty 0 because it docked nothing. Its score is
    // read concurrently, so it may still show the pre-penalty value — the
    // client refetches the list either way, and the meter reads live.
    const winners = [first, second].filter((r) => r.health_penalty === 5);
    const losers = [first, second].filter((r) => r.health_penalty === 0);
    expect(winners).toHaveLength(1);
    expect(winners[0].venue_health_score).toBe(95);
    expect(winners[0].refunded_count).toBe(1);
    expect(losers).toHaveLength(1);
    expect(losers[0].refunded_count).toBe(0);

    expect(await HealthAdjustmentModel.countDocuments({ subject_id: venue._id })).toBe(1);
    expect(await PodAuditLogModel.countDocuments({ pod_id: pod._id, action: 'DELETE' })).toBe(1);
    // The audience is emailed once, not twice.
    expect(emailService.sendPodCancelledEmail).toHaveBeenCalledTimes(2);
    expect(emailService.sendPodRefundEmail).toHaveBeenCalledTimes(1);
    expect((await PaymentModel.findById(payment._id))?.status).toBe('REFUNDED');
  });
});

describe('refundAndNotifyCancellation — shared email failure path', () => {
  it('logs against venueCancelPod when the cancellation emails throw', async () => {
    const errorSpy = jest.spyOn(logs.server, 'error').mockImplementation(() => {});
    jest.spyOn(emailService, 'sendPodCancelledEmail').mockImplementation(() => {
      throw new Error('smtp down');
    });
    const { pod } = await seedBookedPod();

    const result = await podService.venueCancelPod(String(pod._id), String(ownerId), 'Kitchen fire');

    expect(result.refunded_count).toBe(1);
    expect(await PodModel.findById(pod._id)).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      'pod',
      'venueCancelPod',
      expect.objectContaining({ msg: 'delete emails failed' })
    );
  });

  it('logs against hostRemove when the host delete emails throw', async () => {
    const errorSpy = jest.spyOn(logs.server, 'error').mockImplementation(() => {});
    jest.spyOn(emailService, 'sendPodCancelledEmail').mockImplementation(() => {
      throw new Error('smtp down');
    });
    const attendee = await seedAttendee('attendee@example.com');
    const pod = await seedPod({ pod_attendees: [hostId, attendee._id] });

    const ok = await podService.hostRemove(String(pod._id), String(hostId), 'Event cancelled');

    expect(ok).toBe(true);
    expect(await PodModel.findById(pod._id)).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      'pod',
      'hostRemove',
      expect.objectContaining({ msg: 'delete emails failed' })
    );
  });
});
