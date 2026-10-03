/**
 * Ending a pod and undoing that. Every collaborator — the models, the refund
 * path, slot claims, stock deltas, account health — is faked; what is under test
 * is which path each cancel takes, the reason text it carries, the venue
 * double-penalty guard, the revoke preview's money arithmetic, and the revoke's
 * claim-then-rollback ordering.
 */
import { Types } from 'mongoose';

jest.mock('../../pod.model', () => ({
  PodModel: { findById: jest.fn(), findOneAndUpdate: jest.fn(), updateOne: jest.fn() },
}));
jest.mock('@modules/venues/inventory/inventory.model', () => ({ InventoryProductModel: { findById: jest.fn() } }));
jest.mock('@modules/venues/venueSlot/venueSlot.model', () => ({ VenueSlotModel: { findById: jest.fn() } }));
jest.mock('@modules/venues/venueSlot/venueSlot.service', () => ({
  venueSlotService: { holdForPod: jest.fn(), bookForPod: jest.fn(), releaseForPod: jest.fn() },
}));
jest.mock('@modules/finance/payment/payment.model', () => ({ PaymentModel: { find: jest.fn() } }));
jest.mock('@modules/finance/finance/finance.model', () => ({ getFinanceSettings: jest.fn() }));
jest.mock('@modules/finance/finance/breakdown.service', () => ({ bucketForPod: jest.fn() }));
jest.mock('@modules/platform/settings/settings.service', () => ({
  settingsService: { getVenueCancelHealthPenalty: jest.fn() },
}));
jest.mock('@modules/access/accountHealth/accountHealth.service', () => ({
  accountHealthService: { getVenueHealth: jest.fn(), applySystemPenalty: jest.fn() },
}));
jest.mock('../../pod.refundHold', () => ({ cancelHeldRefundsForPod: jest.fn(), isRevokeWindowOpen: jest.fn() }));
jest.mock('@modules/pods/podAudit/podAudit.service', () => ({ podAuditService: { record: jest.fn() } }));
jest.mock('../../pod.shared', () => ({
  loadClubSlugMap: jest.fn(),
  notFound: () => {
    throw new Error('Pod not found');
  },
  podOwnerId: jest.fn(),
  toPub: jest.fn(),
}));
jest.mock('../../pod.validation', () => ({ findHostedPod: jest.fn() }));
jest.mock('../../pod.venue', () => ({ assertOwnedVenue: jest.fn() }));
jest.mock('../../pod.products', () => ({ applyProductDeltas: jest.fn() }));
jest.mock('../../pod.cancelRefund', () => ({
  emailHostAutoCancelled: jest.fn(),
  refundAndNotifyCancellation: jest.fn(),
  round2: (n: number) => Math.round((Number(n) || 0) * 100) / 100,
  softDeletePod: jest.fn(),
  whatsappHostCancellationRequested: jest.fn(),
}));

import { PodModel } from '../../pod.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { venueSlotService } from '@modules/venues/venueSlot/venueSlot.service';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import { bucketForPod } from '@modules/finance/finance/breakdown.service';
import { settingsService } from '@modules/platform/settings/settings.service';
import { accountHealthService } from '@modules/access/accountHealth/accountHealth.service';
import { cancelHeldRefundsForPod, isRevokeWindowOpen } from '../../pod.refundHold';
import { podAuditService } from '@modules/pods/podAudit/podAudit.service';
import { loadClubSlugMap, podOwnerId, toPub } from '../../pod.shared';
import { findHostedPod } from '../../pod.validation';
import { assertOwnedVenue } from '../../pod.venue';
import { applyProductDeltas } from '../../pod.products';
import {
  emailHostAutoCancelled,
  refundAndNotifyCancellation,
  softDeletePod,
  whatsappHostCancellationRequested,
} from '../../pod.cancelRefund';
import { podCancellationMethods as svc, POD_DELETE_REASON_SUBJECTS } from '../../pod.cancellation';

const m = <T>(fn: T) => fn as unknown as jest.Mock;

/** A mongoose-query stand-in: chainable, and awaitable to `value`. */
const query = (value: unknown) => {
  const q: Record<string, unknown> = {};
  q.setOptions = () => q;
  q.select = () => q;
  q.lean = () => q;
  q.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(value).then(resolve, reject);
  return q;
};

// Implementations set by one test must never leak into the next.
beforeEach(() => jest.resetAllMocks());

const POD_ID = new Types.ObjectId().toHexString();
const HOST = new Types.ObjectId().toHexString();

describe('hostDeleteImpact', () => {
  it('counts the other attendees plus extra seats and totals the SUCCESS payments', async () => {
    m(findHostedPod).mockResolvedValue({
      _id: POD_ID,
      pod_hosts_id: [HOST],
      pod_attendees: [HOST, 'a1', 'a2'],
      extra_seats: 3,
    });
    m(PaymentModel.find).mockReturnValue(query([{ total: 499.5, currency_symbol: '$' }, { total: 500 }]));

    await expect(svc.hostDeleteImpact(POD_ID, HOST)).resolves.toEqual({
      other_attendee_count: 5,
      refundable_payment_count: 2,
      refund_total: 999.5,
      currency_symbol: '$',
    });
    expect(PaymentModel.find).toHaveBeenCalledWith({ pod_id: POD_ID, status: 'SUCCESS' });
    expect(getFinanceSettings).not.toHaveBeenCalled();
  });

  it('with no payments reads the currency from finance settings, else falls back to ₹', async () => {
    m(findHostedPod).mockResolvedValue({ _id: POD_ID });
    m(PaymentModel.find).mockReturnValue(query([]));
    m(getFinanceSettings).mockResolvedValueOnce({ currency_symbol: '€' }).mockResolvedValueOnce({});

    await expect(svc.hostDeleteImpact(POD_ID, HOST)).resolves.toEqual({
      other_attendee_count: 0,
      refundable_payment_count: 0,
      refund_total: 0,
      currency_symbol: '€',
    });
    expect((await svc.hostDeleteImpact(POD_ID, HOST)).currency_symbol).toBe('₹');
  });
});

describe('hostRemove', () => {
  const doc = { _id: POD_ID };
  beforeEach(() => m(findHostedPod).mockResolvedValue(doc));

  it('offers exactly the five reason subjects', () => {
    expect(POD_DELETE_REASON_SUBJECTS).toEqual(['Event cancelled', 'Venue unavailable', 'Low attendance', 'Rescheduling', 'Other']);
  });

  it('refuses an unknown subject, and "Other" with no note, before any refund', async () => {
    await expect(svc.hostRemove(POD_ID, HOST, 'Bored')).rejects.toThrow('Select a valid delete reason');
    await expect(svc.hostRemove(POD_ID, HOST, 'Other', '   ')).rejects.toThrow('Please describe the reason');
    expect(refundAndNotifyCancellation).not.toHaveBeenCalled();
  });

  it('refunds with "subject — note" as the reason and messages the host', async () => {
    m(refundAndNotifyCancellation).mockResolvedValue(2);
    await expect(svc.hostRemove(POD_ID, HOST, ' Rescheduling ', ' moved to Sunday ')).resolves.toBe(true);
    expect(refundAndNotifyCancellation).toHaveBeenCalledWith(doc, HOST, 'Rescheduling — moved to Sunday', 'HOST');
    expect(whatsappHostCancellationRequested).toHaveBeenCalledWith(doc, HOST);
  });

  it('uses the bare subject without a note, and stays quiet when a concurrent cancel won', async () => {
    m(refundAndNotifyCancellation).mockResolvedValue(null);
    await expect(svc.hostRemove(POD_ID, HOST, 'Low attendance', null)).resolves.toBe(true);
    expect(refundAndNotifyCancellation).toHaveBeenCalledWith(doc, HOST, 'Low attendance', 'HOST');
    expect(whatsappHostCancellationRequested).not.toHaveBeenCalled();
  });
});

describe('venueCancelPod', () => {
  const doc = { _id: POD_ID, pod_title: 'Sunset Yoga', venue_id: 'venue-1' };

  it('validates the id and a reason of at least five characters before reading the pod', async () => {
    await expect(svc.venueCancelPod('nope', HOST, 'long enough')).rejects.toThrow('Invalid pod id');
    await expect(svc.venueCancelPod(POD_ID, HOST, ' abcd ')).rejects.toThrow('Please describe why you are cancelling this pod');
    expect(PodModel.findById).not.toHaveBeenCalled();
  });

  it('refuses a missing or non-upcoming pod', async () => {
    m(PodModel.findById).mockReturnValueOnce(query(null));
    await expect(svc.venueCancelPod(POD_ID, HOST, 'Flooded hall')).rejects.toThrow('Pod not found');

    m(PodModel.findById).mockReturnValueOnce(query(doc));
    m(bucketForPod).mockReturnValue('past');
    await expect(svc.venueCancelPod(POD_ID, HOST, 'Flooded hall')).rejects.toThrow('Only an upcoming pod can be cancelled');
    expect(assertOwnedVenue).toHaveBeenCalledWith(doc, HOST);
    expect(refundAndNotifyCancellation).not.toHaveBeenCalled();
  });

  it('refunds, then docks the configured penalty with the reason capped at 500 chars', async () => {
    m(PodModel.findById).mockReturnValue(query(doc));
    m(bucketForPod).mockReturnValue('upcoming');
    m(refundAndNotifyCancellation).mockResolvedValue(3);
    m(settingsService.getVenueCancelHealthPenalty).mockResolvedValue(15);
    m(accountHealthService.applySystemPenalty).mockResolvedValue(70);
    const reason = `  ${'x'.repeat(600)}  `;

    await expect(svc.venueCancelPod(POD_ID, HOST, reason)).resolves.toEqual({
      pod_id: POD_ID,
      health_penalty: 15,
      venue_health_score: 70,
      refunded_count: 3,
    });
    const note = 'x'.repeat(500);
    expect(refundAndNotifyCancellation).toHaveBeenCalledWith(doc, HOST, note, 'VENUE_OWNER');
    expect(accountHealthService.applySystemPenalty).toHaveBeenCalledWith({
      subject_type: 'VENUE',
      subject_id: 'venue-1',
      points: 15,
      remark: `Venue owner cancelled the pod "Sunset Yoga". Reason: ${note}`,
    });
  });

  it('never docks the venue twice: a concurrent cancel reports the current score and zero penalty', async () => {
    m(PodModel.findById).mockReturnValue(query(doc));
    m(bucketForPod).mockReturnValue('upcoming');
    m(refundAndNotifyCancellation).mockResolvedValue(null);
    m(accountHealthService.getVenueHealth).mockResolvedValue({ total_score: 85 });

    await expect(svc.venueCancelPod(POD_ID, HOST, 'Flooded hall')).resolves.toEqual({
      pod_id: POD_ID,
      health_penalty: 0,
      venue_health_score: 85,
      refunded_count: 0,
    });
    expect(accountHealthService.applySystemPenalty).not.toHaveBeenCalled();
    expect(settingsService.getVenueCancelHealthPenalty).not.toHaveBeenCalled();
  });
});

describe('systemCancelPod', () => {
  it('returns null for a bad id or an already-cancelled pod, without refunding', async () => {
    await expect(svc.systemCancelPod('bad', 'r', 50)).resolves.toBeNull();
    m(PodModel.findById).mockReturnValue(query(null));
    await expect(svc.systemCancelPod(POD_ID, 'r', 50)).resolves.toBeNull();
    expect(refundAndNotifyCancellation).not.toHaveBeenCalled();
  });

  it('refunds at the policy percentage with no actor, excludes the owner from the fan-out and emails the host', async () => {
    const doc = { _id: POD_ID };
    m(PodModel.findById).mockReturnValue(query(doc));
    m(podOwnerId).mockReturnValue(HOST);
    m(refundAndNotifyCancellation).mockResolvedValue(4);

    await expect(svc.systemCancelPod(POD_ID, 'Finance negative', 75)).resolves.toBe(4);
    expect(refundAndNotifyCancellation).toHaveBeenCalledWith(doc, '', 'Finance negative', 'SYSTEM', 75, HOST);
    expect(emailHostAutoCancelled).toHaveBeenCalledWith(doc);
  });

  it('does not email the host when another cancel already committed', async () => {
    m(PodModel.findById).mockReturnValue(query({ _id: POD_ID }));
    m(refundAndNotifyCancellation).mockResolvedValue(null);
    await expect(svc.systemCancelPod(POD_ID, 'r', 0)).resolves.toBeNull();
    expect(emailHostAutoCancelled).not.toHaveBeenCalled();
  });
});

describe('remove', () => {
  it('an admin delete of a live pod goes through refund-and-notify with the default reason', async () => {
    const doc = { _id: POD_ID };
    m(PodModel.findById).mockReturnValue(query(doc));
    await svc.remove(POD_ID, { source: 'ADMIN', actorUserId: 'admin-1' });
    expect(refundAndNotifyCancellation).toHaveBeenCalledWith(doc, 'admin-1', 'Cancelled by Duncit', 'ADMIN');
    expect(softDeletePod).not.toHaveBeenCalled();
  });

  it('a club-admin delete keeps its own note and an absent actor becomes ""', async () => {
    const doc = { _id: POD_ID };
    m(PodModel.findById).mockReturnValue(query(doc));
    await svc.remove(POD_ID, { source: 'CLUB_ADMIN', actorUserId: null, note: 'Club closed' });
    expect(refundAndNotifyCancellation).toHaveBeenCalledWith(doc, '', 'Club closed', 'CLUB_ADMIN');
  });

  it('an admin delete of an already-cancelled pod falls through to the idempotent soft delete', async () => {
    m(PodModel.findById).mockReturnValue(query(null));
    const audit = { source: 'ADMIN' as const, actorUserId: 'admin-1' };
    await svc.remove(POD_ID, audit);
    expect(softDeletePod).toHaveBeenCalledWith(POD_ID, audit);
    expect(refundAndNotifyCancellation).not.toHaveBeenCalled();
  });

  it('any other source, or no audit, soft-deletes without reading the pod', async () => {
    const audit = { source: 'HOST' as const, actorUserId: HOST };
    await svc.remove(POD_ID, audit);
    await svc.remove(POD_ID);
    expect(PodModel.findById).not.toHaveBeenCalled();
    expect(softDeletePod).toHaveBeenNthCalledWith(1, POD_ID, audit);
    expect(softDeletePod).toHaveBeenNthCalledWith(2, POD_ID, undefined);
  });
});

describe('revokePreview', () => {
  const cancelled = { _id: POD_ID, pod_title: 'Hike', pod_date_time: new Date('2026-11-01T05:00:00Z'), deleted_at: new Date() };

  it('validates the id and the pod', async () => {
    await expect(svc.revokePreview('bad')).rejects.toThrow('Invalid pod id');
    m(PodModel.findById).mockReturnValue(query(null));
    await expect(svc.revokePreview(POD_ID)).rejects.toThrow('Pod not found');
  });

  it('splits paid refunds (a loss) from held ones (free to drop) and totals each to the paisa', async () => {
    m(PodModel.findById).mockReturnValue(query(cancelled));
    m(isRevokeWindowOpen).mockReturnValue(true);
    m(PaymentModel.find).mockReturnValue(
      query([
        { _id: 'p1', user_id: 'u1', user_name: 'A', user_email: 'a@x.com', currency_symbol: '₹', metadata: { cancel_refund_amount: 100.125 } },
        { _id: 'p2', user_id: null, metadata: { refunded_amount: 50.2 } },
        { _id: 'p3', user_id: 'u3', metadata: { refund_hold: true, refund_hold_amount: 80.5, cancel_refund_amount: 999 } },
        { _id: 'p4', metadata: { refund_hold: true } },
      ])
    );

    const preview = await svc.revokePreview(POD_ID);

    expect(preview).toMatchObject({
      pod_id: POD_ID,
      pod_title: 'Hike',
      pod_date_time: '2026-11-01T05:00:00.000Z',
      is_cancelled: true,
      can_revoke: true,
      blocked_reason: null,
      loss_total: 150.33,
      held_total: 80.5,
      currency_symbol: '₹',
    });
    expect(preview.refunds).toEqual([
      { payment_id: 'p1', user_id: 'u1', user_name: 'A', user_email: 'a@x.com', amount: 100.13, currency_symbol: '₹', state: 'PAID' },
      { payment_id: 'p2', user_id: null, user_name: '', user_email: '', amount: 50.2, currency_symbol: '', state: 'PAID' },
      { payment_id: 'p3', user_id: 'u3', user_name: '', user_email: '', amount: 80.5, currency_symbol: '', state: 'HELD' },
      { payment_id: 'p4', user_id: null, user_name: '', user_email: '', amount: 0, currency_symbol: '', state: 'HELD' },
    ]);
  });

  it('names why revoke is blocked: not cancelled, or the pod date has passed', async () => {
    m(PaymentModel.find).mockReturnValue(query([]));
    m(PodModel.findById).mockReturnValueOnce(query({ ...cancelled, deleted_at: null, pod_date_time: null }));
    const live = await svc.revokePreview(POD_ID);
    expect(live).toMatchObject({ is_cancelled: false, can_revoke: false, blocked_reason: 'NOT_CANCELLED', pod_date_time: null });
    expect(live).toMatchObject({ loss_total: 0, held_total: 0, currency_symbol: '₹' });

    m(PodModel.findById).mockReturnValueOnce(query(cancelled));
    m(isRevokeWindowOpen).mockReturnValue(false);
    expect(await svc.revokePreview(POD_ID)).toMatchObject({ can_revoke: false, blocked_reason: 'POD_DATE_PASSED' });
  });
});

describe('revokeCancellation', () => {
  const CANCELLED_AT = new Date('2026-10-01T08:00:00Z');
  const SLOT_ID = new Types.ObjectId().toHexString();
  const base = {
    _id: POD_ID,
    deleted_at: CANCELLED_AT,
    venue_slot_id: SLOT_ID,
    venue_approval_status: 'APPROVED',
    product_requests: [{ product_id: 'prod-1', quantity: 2 }],
  };

  beforeEach(() => {
    m(isRevokeWindowOpen).mockReturnValue(true);
    m(VenueSlotModel.findById).mockResolvedValue({ _id: SLOT_ID, venue_id: 'venue-9' });
    m(loadClubSlugMap).mockResolvedValue(new Map());
    m(toPub).mockReturnValue({ id: POD_ID, restored: true });
    m(PodModel.updateOne).mockReturnValue(query({}));
  });

  const restoreTo = (restored: unknown) => {
    m(PodModel.findById).mockReturnValue(query(base));
    m(PodModel.findOneAndUpdate).mockReturnValue(query(restored));
  };

  it('refuses a bad id, a missing pod, a live pod and a pod whose start has passed', async () => {
    await expect(svc.revokeCancellation('bad', 'admin')).rejects.toThrow('Invalid pod id');
    m(PodModel.findById).mockReturnValueOnce(query(null));
    await expect(svc.revokeCancellation(POD_ID, 'admin')).rejects.toThrow('Pod not found');
    m(PodModel.findById).mockReturnValueOnce(query({ ...base, deleted_at: null }));
    await expect(svc.revokeCancellation(POD_ID, 'admin')).rejects.toThrow('This pod is not cancelled.');
    m(PodModel.findById).mockReturnValueOnce(query(base));
    m(isRevokeWindowOpen).mockReturnValueOnce(false);
    await expect(svc.revokeCancellation(POD_ID, 'admin')).rejects.toThrow('This pod already started');
    expect(PodModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('a lost race on the flip reads as "not cancelled" and claims nothing', async () => {
    restoreTo(null);
    await expect(svc.revokeCancellation(POD_ID, 'admin')).rejects.toThrow('This pod is not cancelled.');
    expect(venueSlotService.bookForPod).not.toHaveBeenCalled();
    expect(applyProductDeltas).not.toHaveBeenCalled();
  });

  it('flips the pod back online, re-books its slot, re-reserves stock, drops held refunds and audits RESTORE', async () => {
    const restored = { ...base, deleted_at: null };
    restoreTo(restored);

    await expect(svc.revokeCancellation(POD_ID, 'admin-7')).resolves.toEqual({ id: POD_ID, restored: true });

    expect(PodModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: POD_ID, deleted_at: { $ne: null } },
      { $set: { deleted_at: null, is_active: true } },
      { new: true }
    );
    expect(venueSlotService.bookForPod).toHaveBeenCalledWith(SLOT_ID, 'venue-9', POD_ID);
    expect(venueSlotService.holdForPod).not.toHaveBeenCalled();
    expect(applyProductDeltas).toHaveBeenCalledWith([], base.product_requests);
    expect(cancelHeldRefundsForPod).toHaveBeenCalledWith(POD_ID);
    expect(podAuditService.record).toHaveBeenCalledWith({
      pod: restored,
      action: 'RESTORE',
      source: 'ADMIN',
      actorUserId: 'admin-7',
      note: 'Cancellation revoked by Duncit',
    });
    expect(venueSlotService.releaseForPod).not.toHaveBeenCalled();
  });

  it('a pod the venue never approved comes back hidden, with its slot only HELD', async () => {
    m(PodModel.findById).mockReturnValue(query({ ...base, venue_approval_status: 'PENDING' }));
    m(PodModel.findOneAndUpdate).mockReturnValue(query({ ...base, deleted_at: null, venue_approval_status: 'PENDING' }));

    await svc.revokeCancellation(POD_ID, 'admin');

    expect(m(PodModel.findOneAndUpdate).mock.calls[0][1]).toEqual({ $set: { deleted_at: null, is_active: false } });
    expect(venueSlotService.holdForPod).toHaveBeenCalledWith(SLOT_ID, 'venue-9', POD_ID);
    expect(venueSlotService.bookForPod).not.toHaveBeenCalled();
  });

  it('a slot-less pod skips the slot claim; missing product_requests reserve nothing', async () => {
    restoreTo({ ...base, deleted_at: null, venue_slot_id: null, product_requests: undefined });
    await svc.revokeCancellation(POD_ID, 'admin');
    expect(VenueSlotModel.findById).not.toHaveBeenCalled();
    expect(applyProductDeltas).toHaveBeenCalledWith([], []);
  });

  it('a slot that no longer exists rolls the pod back to cancelled at its ORIGINAL time and rethrows CONFLICT', async () => {
    restoreTo({ ...base, deleted_at: null });
    m(VenueSlotModel.findById).mockResolvedValue(null);

    await expect(svc.revokeCancellation(POD_ID, 'admin')).rejects.toThrow('The venue slot this pod held no longer exists');

    expect(venueSlotService.releaseForPod).toHaveBeenCalledWith(POD_ID);
    expect(PodModel.updateOne).toHaveBeenCalledWith({ _id: POD_ID }, { $set: { deleted_at: CANCELLED_AT, is_active: false } });
    expect(cancelHeldRefundsForPod).not.toHaveBeenCalled();
    expect(podAuditService.record).not.toHaveBeenCalled();
  });

  it('stock that can no longer be reserved also rolls back, after the slot was claimed', async () => {
    restoreTo({ ...base, deleted_at: null });
    m(applyProductDeltas).mockRejectedValue(new Error('Only 1 unit left'));

    await expect(svc.revokeCancellation(POD_ID, 'admin')).rejects.toThrow('Only 1 unit left');

    expect(venueSlotService.bookForPod).toHaveBeenCalled();
    expect(venueSlotService.releaseForPod).toHaveBeenCalledWith(POD_ID);
    expect(PodModel.updateOne).toHaveBeenCalledWith({ _id: POD_ID }, { $set: { deleted_at: CANCELLED_AT, is_active: false } });
    expect(cancelHeldRefundsForPod).not.toHaveBeenCalled();
  });
});

describe('releaseCompletedPodStock', () => {
  it('hands each unsold unit back, clamping at zero and skipping sold-out rows and missing products', async () => {
    const saveA = jest.fn();
    const saveB = jest.fn();
    const productA = { requested_count: 10, save: saveA };
    const productB = { requested_count: 1, save: saveB };
    m(PodModel.findById).mockReturnValue(
      query({
        product_requests: [
          { product_id: 'A', quantity: 5, sold_count: 2 },
          { product_id: 'B', quantity: 4 },
          { product_id: 'C', quantity: 3, sold_count: 3 },
          { product_id: 'GONE', quantity: 2, sold_count: 0 },
        ],
      })
    );
    m(InventoryProductModel.findById).mockImplementation(async (id: string) => ({ A: productA, B: productB })[id] ?? null);

    await expect(svc.releaseCompletedPodStock(POD_ID)).resolves.toBe(true);

    expect(productA.requested_count).toBe(7);
    expect(productB.requested_count).toBe(0);
    expect(saveA).toHaveBeenCalledTimes(1);
    expect(saveB).toHaveBeenCalledTimes(1);
    expect(InventoryProductModel.findById).not.toHaveBeenCalledWith('C');
  });

  it('a pod that cannot be found releases nothing', async () => {
    m(PodModel.findById).mockReturnValue(query(null));
    await expect(svc.releaseCompletedPodStock(POD_ID)).resolves.toBe(true);
    expect(InventoryProductModel.findById).not.toHaveBeenCalled();
  });
});
