jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) }));

import { Types } from 'mongoose';
import { breakdownService } from '../../breakdown.service';
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

async function seedHost() {
  return UserModel.create({
    auth: { email: `pehost${++seq}@x.com` },
    profile: { first_name: 'Meera', last_name: 'Host' },
  });
}

async function seedVenue(ownerId: Types.ObjectId) {
  return VenueModel.create({
    owner_user_id: ownerId,
    venue_name: 'Shortfall Hall',
    owner_email: `pevenue${++seq}@x.com`,
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
    pod_id: `pepod-${++seq}`,
    pod_title: 'Economics Pod',
    pod_hosts_id: hostIds,
    club_id: new Types.ObjectId(),
    venue_id: venueId ?? null,
    venue_slot_id: venueSlotId ?? null,
    pod_description: 'desc',
    pod_date_time: new Date(),
    pod_type: 'NON_NATIVE_PAID',
  });
}

async function seedPayment(podId: Types.ObjectId, total: number) {
  return PaymentModel.create({
    payment_id: `pepay-${++seq}`,
    user_id: new Types.ObjectId(),
    user_name: 'Buyer',
    user_email: 'buyer@x.com',
    subtotal: total,
    total,
    gst_amount: 0,
    status: 'SUCCESS',
    pod_id: podId,
  });
}

const setHostCommission = (pct: number) =>
  FinanceSettingsModel.updateOne(
    { singleton_key: 'finance' },
    { $set: { default_host_commission_pct: pct } },
    { upsert: true }
  );

describe('potentialPodEarnings — the preview never auto-reduces the venue price', () => {
  it('keeps the venue full price and reports negative host earnings on a shortfall', async () => {
    const host = await seedHost();
    const venue = await seedVenue(host._id);
    // 2 spots → 1 payable → ₹1,000 gross; pool 805.09 ≪ venue price 5,000.
    const { waterfall: w } = await breakdownService.potentialPodEarnings(
      String(host._id),
      1000,
      2,
      String(venue._id),
      5000
    );
    expect(w.pool_amount).toBe(805.09);
    expect(w.venue_amount).toBe(5000); // NOT clamped to the pool
    expect(w.venue_receives).toBe(4500); // full price − 10% commission
    expect(w.host_amount).toBe(-4194.91); // the honest shortfall
    expect(w.host_receives).toBe(-4194.91); // no commission on a shortfall
    expect(w.host_earn_pct).toBeLessThan(0);
  });

  it('is unchanged while the pool covers the venue price', async () => {
    const host = await seedHost();
    const venue = await seedVenue(host._id);
    const { waterfall: w } = await breakdownService.potentialPodEarnings(
      String(host._id),
      1000,
      2,
      String(venue._id),
      300
    );
    expect(w.venue_amount).toBe(300);
    expect(w.host_amount).toBe(505.09);
    expect(w.host_receives).toBe(454.58);
  });
});

describe('breakdownService.suggestedTicketPrices', () => {
  it('returns the first five ₹x99 candidates with strictly positive host payout (no venue)', async () => {
    const host = await seedHost();
    // 2 spots → 1 payable; ₹99 already earns the host ₹71.73.
    const rows = await breakdownService.suggestedTicketPrices(String(host._id), 2);
    expect(rows.map((r) => r.price)).toEqual([99, 199, 299, 399, 499]);
    expect(rows[0]!.host_receives).toBe(71.73);
    for (const row of rows) expect(row.host_receives).toBeGreaterThan(0);
  });

  it('starts at the first candidate that clears the venue price', async () => {
    const host = await seedHost();
    const venue = await seedVenue(host._id);
    // 1 payable spot vs a ₹300 venue price: 99/199/299 leave the host negative;
    // ₹399 is the first strictly positive payout.
    const rows = await breakdownService.suggestedTicketPrices(String(host._id), 2, String(venue._id), 300);
    expect(rows.map((r) => r.price)).toEqual([399, 499, 599, 699, 799]);
    expect(rows[0]!.host_receives).toBe(19.11);
    for (const row of rows) expect(row.host_receives).toBeGreaterThan(0);
  });

  it('returns an empty list when nothing is billable (unset spots or a host-only pod)', async () => {
    const host = await seedHost();
    expect(await breakdownService.suggestedTicketPrices(String(host._id), 0)).toEqual([]);
    expect(await breakdownService.suggestedTicketPrices(String(host._id), 1)).toEqual([]);
  });

  it('returns an empty list when no candidate under the ₹99,999 cap is positive', async () => {
    const host = await seedHost();
    const venue = await seedVenue(host._id);
    // Even the ₹99,999 cap pools ≈ ₹80,509 — far below a ₹200,000 venue price.
    const rows = await breakdownService.suggestedTicketPrices(
      String(host._id),
      2,
      String(venue._id),
      200000
    );
    expect(rows).toEqual([]);
  });

  it('excludes candidates whose payout is exactly ₹0 (100% host commission)', async () => {
    const host = await seedHost();
    await setHostCommission(100); // host_receives is exactly 0 for every price
    expect(await breakdownService.suggestedTicketPrices(String(host._id), 2)).toEqual([]);
    await setHostCommission(10);
  });

  it('rejects bad input exactly like potentialPodEarnings', async () => {
    const host = await seedHost();
    await expect(breakdownService.suggestedTicketPrices(String(host._id), -1)).rejects.toThrow(/spots/i);
    await expect(
      breakdownService.suggestedTicketPrices(String(host._id), 2, 'bad-id')
    ).rejects.toThrow(/invalid venue/i);
    await expect(
      breakdownService.suggestedTicketPrices(String(host._id), 2, null, -1)
    ).rejects.toThrow(/venue amount/i);
  });
});

describe('breakdownService.assertViablePodEconomics', () => {
  it('exempts free pods entirely (even with a venue price attached)', async () => {
    const host = await seedHost();
    const venue = await seedVenue(host._id);
    await expect(
      breakdownService.assertViablePodEconomics({
        hostUserId: String(host._id),
        podAmount: 0,
        noOfSpots: 10,
        venueId: String(venue._id),
        venueAmount: 5000,
      })
    ).resolves.toBeUndefined();
  });

  it('passes a healthy paid pod', async () => {
    const host = await seedHost();
    const venue = await seedVenue(host._id);
    await expect(
      breakdownService.assertViablePodEconomics({
        hostUserId: String(host._id),
        podAmount: 1000,
        noOfSpots: 2,
        venueId: String(venue._id),
        venueAmount: 300,
      })
    ).resolves.toBeUndefined();
  });

  it('rejects when the total pod value is below the venue price', async () => {
    const host = await seedHost();
    const venue = await seedVenue(host._id);
    await expect(
      breakdownService.assertViablePodEconomics({
        hostUserId: String(host._id),
        podAmount: 1000,
        noOfSpots: 2, // total ₹1,000 < ₹5,000 venue price
        venueId: String(venue._id),
        venueAmount: 5000,
      })
    ).rejects.toThrow(/venue price/i);
  });

  it('rejects when deductions leave the host ≤ ₹0 even though the venue is covered', async () => {
    const host = await seedHost();
    const venue = await seedVenue(host._id);
    // Total exactly equals the venue price: the venue check passes but the
    // pool (after GST + fee) can no longer cover it → host goes negative.
    await expect(
      breakdownService.assertViablePodEconomics({
        hostUserId: String(host._id),
        podAmount: 1000,
        noOfSpots: 2,
        venueId: String(venue._id),
        venueAmount: 1000,
      })
    ).rejects.toThrow(/earnings/i);
  });

  it('rejects a paid pod with exactly-₹0 earnings and one with nothing billable', async () => {
    const host = await seedHost();
    await setHostCommission(100); // every rupee of the host side is commission
    await expect(
      breakdownService.assertViablePodEconomics({
        hostUserId: String(host._id),
        podAmount: 1000,
        noOfSpots: 2,
      })
    ).rejects.toThrow(/earnings/i);
    await setHostCommission(10);
    await expect(
      breakdownService.assertViablePodEconomics({
        hostUserId: String(host._id),
        podAmount: 1000,
        noOfSpots: 1, // host-only pod: 0 payable spots → ₹0 earnings
      })
    ).rejects.toThrow(/earnings/i);
  });
});

describe('legacy settlement — completePod keeps the clamp for shortfall pods', () => {
  it('settles a legacy pod whose collection is below the venue price exactly as before', async () => {
    const host = await seedHost();
    const venue = await seedVenue(host._id);
    const slot = await seedSlot(venue, 5000); // booked price ≫ what the pod collected
    const pod = await seedPod([host._id], venue._id, slot._id);
    await seedPayment(pod._id, 1000);

    await paymentReleaseService.completePod(
      {
        pod_id: String(pod._id),
        venue_bill_amount: 0,
        bill_url: 'https://x.com/bill.pdf',
        evidence_media: [{ url: 'https://x.com/party.jpg' }],
      },
      { id: String(host._id), isAdmin: false }
    );

    // SETTLEMENT stays clamped: the venue absorbs the whole pool, the host
    // payout is 0 — never negative, never an error.
    const hostRelease = await PaymentReleaseModel.findOne({ pod_id: pod._id, kind: 'HOST_PAYMENT' });
    expect(hostRelease!.amount_requested).toBe(0);
    const venueRelease = await PaymentReleaseModel.findOne({ pod_id: pod._id, kind: 'VENUE_BILLING' });
    expect(venueRelease!.amount_requested).toBe(724.58); // pool 805.09 − 10%

    // The frozen breakdown view mirrors the clamped settlement numbers.
    const view = await breakdownService.podFinanceBreakdown(String(pod._id));
    expect(view.frozen).toBe(true);
    expect(view.waterfall.venue_amount).toBe(805.09); // clamped to the pool
    expect(view.waterfall.host_receives).toBe(0);
    expect(view.waterfall.venue_receives).toBe(724.58);
  });
});

describe('suggestedTicketPrices resolver', () => {
  const Q = financeResolvers.Query as any;

  it('resolves for the signed-in user and rejects anonymous callers', async () => {
    const host = await seedHost();
    const rows = await Q.suggestedTicketPrices(
      {},
      { no_of_spots: 2 },
      makeContext({ id: String(host._id), roles: ['USER'] })
    );
    expect(rows.map((r: { price: number }) => r.price)).toEqual([99, 199, 299, 399, 499]);

    await expect(Q.suggestedTicketPrices({}, { no_of_spots: 2 }, makeContext(null))).rejects.toThrow();
  });
});
