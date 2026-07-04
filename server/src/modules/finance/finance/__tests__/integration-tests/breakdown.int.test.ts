jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) }));

import { Types } from 'mongoose';
import { breakdownService, momPct } from '../../breakdown.service';
import { paymentReleaseService } from '../../paymentRelease.service';
import { PaymentReleaseModel } from '../../paymentRelease.model';
import { FinanceSettingsModel } from '../../finance.model';
import { financeResolvers } from '../../finance.resolver';
import { PodModel } from '@modules/pods/pod/pod.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { UserModel } from '@modules/access/user/user.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { makeContext } from '@test/harness';

let seq = 0;

async function seedHost(commissionPct = 0) {
  return UserModel.create({
    auth: { email: `bhost${++seq}@x.com` },
    profile: { first_name: 'Ravi', last_name: 'Host' },
    finance: { host_commission_pct: commissionPct },
  });
}

async function seedVenue(ownerId: Types.ObjectId, commissionPct = 0) {
  return VenueModel.create({
    owner_user_id: ownerId,
    venue_name: 'Studio One',
    owner_email: `bvenue${++seq}@x.com`,
    venue_commission_pct: commissionPct,
  });
}

async function seedSlot(venue: { _id: Types.ObjectId; owner_user_id: Types.ObjectId }, price: number) {
  return VenueSlotModel.create({
    venue_id: venue._id,
    owner_user_id: venue.owner_user_id,
    start_at: new Date(),
    end_at: new Date(Date.now() + 3600_000),
    price,
    status: 'BOOKED',
  });
}

async function seedPod(hostIds: Types.ObjectId[], venueId?: Types.ObjectId, venueSlotId?: Types.ObjectId) {
  return PodModel.create({
    pod_id: `bpod-${++seq}`,
    pod_title: 'Breakdown Pod',
    pod_hosts_id: hostIds,
    club_id: new Types.ObjectId(),
    venue_id: venueId ?? null,
    venue_slot_id: venueSlotId ?? null,
    pod_description: 'desc',
    pod_date_time: new Date(),
    pod_type: 'NON_NATIVE_PAID',
  });
}

async function seedPayment(podId: Types.ObjectId, total: number, gstAmount = 0) {
  return PaymentModel.create({
    payment_id: `bpay-${++seq}`,
    user_id: new Types.ObjectId(),
    user_name: 'Buyer',
    user_email: 'buyer@x.com',
    subtotal: total,
    total,
    gst_amount: gstAmount,
    status: 'SUCCESS',
    pod_id: podId,
  });
}

/** Host + venue + a booked ₹300 slot + one ₹1000 payment — the canonical pod. */
async function seedCanonicalPod() {
  const host = await seedHost();
  const venue = await seedVenue(host._id);
  const slot = await seedSlot(venue, 300);
  const pod = await seedPod([host._id], venue._id, slot._id);
  await seedPayment(pod._id, 1000);
  return { host, venue, pod };
}

const completeInput = (podId: Types.ObjectId) => ({
  pod_id: String(podId),
  venue_bill_amount: 0,
  bill_url: 'https://x.com/bill.pdf',
  evidence_media: [{ url: 'https://x.com/party.jpg' }],
});

describe('breakdownService.podFinanceBreakdown', () => {
  it('rejects an invalid id and a missing pod', async () => {
    await expect(breakdownService.podFinanceBreakdown('nope')).rejects.toThrow(/invalid pod/i);
    await expect(
      breakdownService.podFinanceBreakdown(new Types.ObjectId().toString())
    ).rejects.toThrow(/not found/i);
  });

  it('computes a LIVE breakdown (canonical ₹1000 + ₹300 booked slot)', async () => {
    const { pod } = await seedCanonicalPod();

    const view = await breakdownService.podFinanceBreakdown(String(pod._id));
    expect(view.settlement_status).toBe('LIVE');
    expect(view.frozen).toBe(false);
    expect(view.bookings_count).toBe(1);
    expect(view.collected_total).toBe(1000);
    expect(view.has_venue).toBe(true);
    expect(view.completed_at).toBeNull();
    const w = view.waterfall;
    expect(w.gst_amount).toBe(152.54);
    expect(w.platform_fee_amount).toBe(42.37);
    expect(w.pool_amount).toBe(805.09);
    expect(w.venue_amount).toBe(300); // the booked slot price (Partners portal)
    expect(w.venue_commission_amount).toBe(30);
    expect(w.venue_receives).toBe(270);
    expect(w.host_amount).toBe(505.09); // the remainder is the host's
    expect(w.host_commission_amount).toBe(50.51);
    expect(w.host_receives).toBe(454.58);
    expect(w.duncit_revenue).toBe(122.88);
    expect(w.host_earn_pct).toBe(45.46);
  });

  it('freezes the snapshot at completion and keeps it frozen through rate changes', async () => {
    const { host, pod } = await seedCanonicalPod();

    await paymentReleaseService.completePod(completeInput(pod._id), {
      id: String(host._id),
      isAdmin: false,
    });

    let view = await breakdownService.podFinanceBreakdown(String(pod._id));
    expect(view.settlement_status).toBe('PENDING_APPROVAL');
    expect(view.frozen).toBe(true);
    expect(view.waterfall.host_receives).toBe(454.58);
    expect(view.waterfall.venue_receives).toBe(270);

    // A later rate change must NOT rewrite the frozen numbers.
    await FinanceSettingsModel.updateOne(
      { singleton_key: 'finance' },
      { $set: { platform_fee_pct: 20, default_host_commission_pct: 50 } }
    );
    view = await breakdownService.podFinanceBreakdown(String(pod._id));
    expect(view.waterfall.host_receives).toBe(454.58);
    expect(view.waterfall.duncit_revenue).toBe(122.88);
    await FinanceSettingsModel.updateOne(
      { singleton_key: 'finance' },
      { $set: { platform_fee_pct: 5, default_host_commission_pct: 10 } }
    );

    // Finance approval → SETTLED, pod stamped complete.
    const rel = await PaymentReleaseModel.findOne({ pod_id: pod._id, kind: 'HOST_PAYMENT' });
    await paymentReleaseService.review(
      String(rel!._id),
      { status: 'APPROVED', approval_type: 'FULL' },
      new Types.ObjectId().toString()
    );
    view = await breakdownService.podFinanceBreakdown(String(pod._id));
    expect(view.settlement_status).toBe('SETTLED');
    expect(view.completed_at).not.toBeNull();
  });

  it('handles a hostless, venueless, zero-collected pod (all-zero waterfall)', async () => {
    const pod = await seedPod([]);
    const view = await breakdownService.podFinanceBreakdown(String(pod._id));
    expect(view.collected_total).toBe(0);
    expect(view.has_venue).toBe(false);
    expect(view.waterfall.host_receives).toBe(0);
    expect(view.waterfall.venue_amount).toBe(0);
    expect(view.waterfall.host_earn_pct).toBe(0);
  });

  it('renders a frozen no-venue snapshot with zero venue lines and 0% earn on 0 collected', async () => {
    const host = await seedHost();
    const pod = await seedPod([host._id]); // no venue, nothing collected
    await paymentReleaseService.completePod(completeInput(pod._id), {
      id: String(host._id),
      isAdmin: false,
    });
    const view = await breakdownService.podFinanceBreakdown(String(pod._id));
    expect(view.frozen).toBe(true);
    expect(view.waterfall.venue_receives).toBe(0);
    expect(view.waterfall.host_earn_pct).toBe(0);
  });

  it('treats a v1 (no-breakdown) release as submitted but not frozen', async () => {
    const host = await seedHost();
    const pod = await seedPod([host._id]);
    await seedPayment(pod._id, 1000);
    await paymentReleaseService.create(
      {
        pod_id: String(pod._id),
        kind: 'HOST_PAYMENT',
        amount_requested: 500,
        evidence_media: [{ url: 'https://x.com/p.jpg' }],
      },
      String(host._id)
    );
    const view = await breakdownService.podFinanceBreakdown(String(pod._id));
    expect(view.settlement_status).toBe('PENDING_APPROVAL');
    expect(view.frozen).toBe(false);
    expect(view.waterfall.gst_amount).toBe(152.54); // live math
  });
});

describe('breakdownService.canViewPodBreakdown', () => {
  it('allows the pod host and the venue owner, rejects everyone else', async () => {
    const host = await seedHost();
    const owner = await seedHost();
    const venue = await seedVenue(owner._id);
    const pod = await seedPod([host._id], venue._id);

    expect(await breakdownService.canViewPodBreakdown(String(pod._id), String(host._id))).toBe(true);
    expect(await breakdownService.canViewPodBreakdown(String(pod._id), String(owner._id))).toBe(true);
    expect(
      await breakdownService.canViewPodBreakdown(String(pod._id), new Types.ObjectId().toString())
    ).toBe(false);
    expect(await breakdownService.canViewPodBreakdown('nope', String(host._id))).toBe(false);
    expect(
      await breakdownService.canViewPodBreakdown(new Types.ObjectId().toString(), String(host._id))
    ).toBe(false);

    const noVenuePod = await seedPod([host._id]);
    expect(
      await breakdownService.canViewPodBreakdown(String(noVenuePod._id), String(owner._id))
    ).toBe(false);

    // Venue referenced by the pod but since deleted → not viewable as owner.
    await VenueModel.deleteOne({ _id: venue._id });
    expect(await breakdownService.canViewPodBreakdown(String(pod._id), String(owner._id))).toBe(
      false
    );
  });
});

describe('breakdownService.potentialPodEarnings', () => {
  it('previews the waterfall with commission overrides and the picked slot price', async () => {
    const host = await seedHost(20); // 20% host commission override
    const venue = await seedVenue(host._id, 5); // 5% venue commission override
    const w = await breakdownService.potentialPodEarnings(String(host._id), 1000, String(venue._id), 300);
    expect(w.host_commission_pct).toBe(20);
    expect(w.venue_commission_pct).toBe(5);
    expect(w.venue_amount).toBe(300);
    expect(w.venue_receives).toBe(285); // 300 − 5%
    expect(w.host_amount).toBe(505.09); // pool 805.09 − 300
    expect(w.host_receives).toBe(404.07); // − 20% commission
    expect(w.host_earn_pct).toBe(40.41);
  });

  it('uses defaults with no venue (venue amount ignored) and rejects bad input', async () => {
    const host = await seedHost();
    const w = await breakdownService.potentialPodEarnings(String(host._id), 1000, null, 300);
    expect(w.venue_amount).toBe(0); // no venue → no venue money
    expect(w.host_amount).toBe(805.09); // whole pool
    expect(w.host_receives).toBe(724.58);
    await expect(breakdownService.potentialPodEarnings(String(host._id), -5)).rejects.toThrow(
      /amount/i
    );
    await expect(
      breakdownService.potentialPodEarnings(String(host._id), Number.NaN)
    ).rejects.toThrow(/amount/i);
    await expect(
      breakdownService.potentialPodEarnings(String(host._id), 1000, 'bad-id')
    ).rejects.toThrow(/invalid venue/i);
    await expect(
      breakdownService.potentialPodEarnings(String(host._id), 1000, null, -1)
    ).rejects.toThrow(/venue amount/i);
  });
});

describe('earnings summaries', () => {
  it('aggregates host lifetime/pending/this-month and venue equivalents', async () => {
    const { host, pod } = await seedCanonicalPod();
    await paymentReleaseService.completePod(completeInput(pod._id), {
      id: String(host._id),
      isAdmin: false,
    });

    // Before approval: everything pending.
    let hostSummary = await breakdownService.hostEarningsSummary(String(host._id));
    expect(hostSummary.pending_amount).toBe(454.58);
    expect(hostSummary.lifetime_earnings).toBe(0);
    expect(hostSummary.pods_completed).toBe(0);

    const hostRel = await PaymentReleaseModel.findOne({ pod_id: pod._id, kind: 'HOST_PAYMENT' });
    const venueRel = await PaymentReleaseModel.findOne({ pod_id: pod._id, kind: 'VENUE_BILLING' });
    const reviewer = new Types.ObjectId().toString();
    await paymentReleaseService.review(String(hostRel!._id), { status: 'APPROVED', approval_type: 'FULL' }, reviewer);
    await paymentReleaseService.review(String(venueRel!._id), { status: 'APPROVED', approval_type: 'FULL' }, reviewer);

    hostSummary = await breakdownService.hostEarningsSummary(String(host._id));
    expect(hostSummary.lifetime_earnings).toBe(454.58);
    expect(hostSummary.pending_amount).toBe(0);
    expect(hostSummary.pods_completed).toBe(1);
    expect(hostSummary.this_month_earnings).toBe(454.58);

    const venueSummary = await breakdownService.venueEarningsSummary(String(host._id));
    expect(venueSummary.lifetime_earnings).toBe(270);
    expect(venueSummary.pods_completed).toBe(1);
  });

  it('returns zeroes for users with no releases and owners with no venues', async () => {
    const nobody = new Types.ObjectId().toString();
    const hostSummary = await breakdownService.hostEarningsSummary(nobody);
    expect(hostSummary.lifetime_earnings).toBe(0);
    expect(hostSummary.pods_completed).toBe(0);
    const venueSummary = await breakdownService.venueEarningsSummary(nobody);
    expect(venueSummary.lifetime_earnings).toBe(0);
  });
});

describe('finance resolvers (new breakdown surface)', () => {
  const Q = financeResolvers.Query as any;
  const M = financeResolvers.Mutation as any;

  it('podFinanceBreakdown: host allowed, admin allowed, stranger forbidden', async () => {
    const { host, pod } = await seedCanonicalPod();

    const asHost = await Q.podFinanceBreakdown(
      {},
      { pod_id: String(pod._id) },
      makeContext({ id: String(host._id), roles: ['USER'] })
    );
    expect(asHost.waterfall.host_receives).toBe(454.58);

    const asAdmin = await Q.podFinanceBreakdown(
      {},
      { pod_id: String(pod._id) },
      makeContext({ roles: ['FINANCE_MANAGER'] })
    );
    expect(asAdmin.pod_id).toBe(String(pod._id));

    await expect(
      Q.podFinanceBreakdown({}, { pod_id: String(pod._id) }, makeContext({ roles: ['USER'] }))
    ).rejects.toThrow(/host, venue owner, or an admin/i);
  });

  it('potentialPodEarnings + summaries + venue payouts resolve for the signed-in user', async () => {
    const host = await seedHost();
    const ctx = makeContext({ id: String(host._id), roles: ['USER'] });
    const w = await Q.potentialPodEarnings({}, { amount: 1000 }, ctx);
    expect(w.host_receives).toBe(724.58); // no venue → whole pool − 10%

    expect((await Q.myHostEarningsSummary({}, {}, ctx)).lifetime_earnings).toBe(0);
    expect((await Q.myVenueEarningsSummary({}, {}, ctx)).lifetime_earnings).toBe(0);
    expect(await Q.myVenuePayouts({}, {}, ctx)).toEqual([]);
  });

  it('financeDashboardStats requires a finance role', async () => {
    await expect(Q.financeDashboardStats({}, {}, makeContext({ roles: ['USER'] }))).rejects.toThrow(
      /access denied/i
    );
    const stats = await Q.financeDashboardStats({}, {}, makeContext({ roles: ['FINANCE_MANAGER'] }));
    expect(stats.currency_symbol).toBeTruthy();
  });

  it('setHostDeductions validates role, id, range, and persists the commission override', async () => {
    const host = await seedHost();
    const admin = makeContext({ roles: ['FINANCE_MANAGER'] });

    await expect(
      M.setHostDeductions(
        {},
        { user_id: String(host._id), host_commission_pct: 15 },
        makeContext({ roles: ['USER'] })
      )
    ).rejects.toThrow(/access denied/i);
    await expect(
      M.setHostDeductions({}, { user_id: 'bad', host_commission_pct: 15 }, admin)
    ).rejects.toThrow(/invalid user/i);
    await expect(
      M.setHostDeductions({}, { user_id: String(host._id), host_commission_pct: 150 }, admin)
    ).rejects.toThrow(/host_commission_pct/i);
    await expect(
      M.setHostDeductions({}, { user_id: String(host._id), host_commission_pct: Number.NaN }, admin)
    ).rejects.toThrow(/host_commission_pct/i);
    await expect(
      M.setHostDeductions({}, { user_id: new Types.ObjectId().toString(), host_commission_pct: 15 }, admin)
    ).rejects.toThrow(/not found/i);

    await M.setHostDeductions({}, { user_id: String(host._id), host_commission_pct: 15 }, admin);
    const updated = await UserModel.findById(host._id).select('finance');
    expect(updated?.finance?.host_commission_pct).toBe(15);
  });
});

describe('momPct', () => {
  it('covers growth-from-zero, flat-zero, and real deltas', () => {
    expect(momPct(0, 0)).toBe(0);
    expect(momPct(50, 0)).toBe(100);
    expect(momPct(150, 100)).toBe(50);
    expect(momPct(50, 100)).toBe(-50);
  });
});

describe('paymentReleaseService.listMineVenue', () => {
  it('lists venue payouts for an owner, empty for strangers and bad ids', async () => {
    const { host, pod } = await seedCanonicalPod();
    await paymentReleaseService.completePod(completeInput(pod._id), {
      id: String(host._id),
      isAdmin: false,
    });

    const mine = await paymentReleaseService.listMineVenue(String(host._id));
    expect(mine.length).toBeGreaterThanOrEqual(1);
    expect(mine[0]!.kind).toBe('VENUE_BILLING');

    expect(await paymentReleaseService.listMineVenue(new Types.ObjectId().toString())).toEqual([]);
    expect(await paymentReleaseService.listMineVenue('bad-id')).toEqual([]);
  });
});

describe('breakdownService.dashboardStats', () => {
  it('aggregates revenue/GST/Duncit/pending/completed with month-over-month deltas', async () => {
    const { host, venue, pod } = await seedCanonicalPod();
    await PaymentModel.updateMany({ pod_id: pod._id }, { $set: { gst_amount: 152.54 } });
    void venue;
    await paymentReleaseService.completePod(completeInput(pod._id), {
      id: String(host._id),
      isAdmin: false,
    });
    const hostRel = await PaymentReleaseModel.findOne({ pod_id: pod._id, kind: 'HOST_PAYMENT' });
    await paymentReleaseService.review(
      String(hostRel!._id),
      { status: 'APPROVED', approval_type: 'FULL' },
      new Types.ObjectId().toString()
    );

    let stats = await breakdownService.dashboardStats();
    expect(stats.total_revenue.total).toBeGreaterThanOrEqual(1000);
    expect(stats.total_revenue.this_month).toBeGreaterThanOrEqual(1000);
    expect(stats.gst_collected.this_month).toBeGreaterThanOrEqual(152.54);
    expect(stats.duncit_revenue.this_month).toBeGreaterThanOrEqual(122.88);
    expect(stats.completed_payouts.this_month).toBeGreaterThanOrEqual(454.58);
    // Venue release still pending.
    expect(stats.pending_payouts.total).toBeGreaterThanOrEqual(270);
    // Nothing last month yet → +100% growth branch.
    expect(stats.total_revenue.mom_change_pct).toBe(100);

    // Move the approval into last month → last-month>0 delta branch.
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1, 15);
    await PaymentReleaseModel.updateOne({ _id: hostRel!._id }, { $set: { reviewed_at: lastMonth } });
    stats = await breakdownService.dashboardStats();
    expect(stats.completed_payouts.last_month).toBeGreaterThanOrEqual(454.58);
    expect(stats.duncit_revenue.last_month).toBeGreaterThanOrEqual(122.88);
  });
});
