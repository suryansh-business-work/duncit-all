jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@observability/log', () => ({ logs: { server: { warn: jest.fn(), error: jest.fn(), info: jest.fn() } } }));

import { Types } from 'mongoose';
import { PodModel } from '@modules/pods/pod/pod.model';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';
import { TicketModel } from '@modules/pods/ticket/ticket.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { UserModel } from '@modules/access/user/user.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { WalletModel } from '@modules/finance/wallet/wallet.model';
import { PaymentReleaseModel } from '../../paymentRelease.model';
import { paymentReleaseService as svc } from '../../paymentRelease.service';
import { breakdownService } from '../../breakdown.service';
import { computePodSettlement, venueChargeForPod } from '../../settlement.service';
import { podCancellationService } from '../../podCancellation.service';

/**
 * A FREE pod moves no platform money: its host pays the venue off the
 * platform. Every finance path must stand down for it — and a PAID pod beside
 * it must come out exactly as before.
 */

let seq = 0;
const HOUR = 3_600_000;

async function seedHost() {
  seq += 1;
  return UserModel.create({ auth: { email: `free-host${seq}@x.com` }, profile: { first_name: 'Asha', last_name: 'Host' } });
}

async function seedVenueAndSlot(price: number) {
  const owner = await UserModel.create({
    auth: { email: `owner${(seq += 1)}@x.com` },
    profile: { first_name: 'Olu', last_name: 'Owner' },
  });
  const venue = await VenueModel.create({
    owner_user_id: owner._id,
    venue_name: 'Rooftop',
    owner_email: 'owner@x.com',
    status: 'APPROVED',
    is_active: true,
  });
  const slot = await VenueSlotModel.create({
    venue_id: venue._id,
    owner_user_id: owner._id,
    start_at: new Date(Date.now() - 3 * HOUR),
    end_at: new Date(Date.now() - 2 * HOUR),
    price,
    status: 'BOOKED',
  });
  return { venue, slot, owner };
}

async function seedPod(type: 'FREE' | 'PAID', over: Record<string, unknown> = {}) {
  seq += 1;
  return PodModel.create({
    pod_id: `free-fin-${seq}`,
    pod_title: `${type} pod`,
    pod_hosts_id: [],
    club_id: new Types.ObjectId(),
    pod_description: 'd',
    // Started an hour ago and ended — a pod that is ready to complete.
    pod_date_time: new Date(Date.now() - 3 * HOUR),
    pod_end_date_time: new Date(Date.now() - 2 * HOUR),
    pod_type: type,
    pod_amount: type === 'FREE' ? 0 : 500,
    no_of_spots: 10,
    ...over,
  });
}

/** A JOINED booking with a ticket — scanned in or not. */
async function seedBooking(podId: unknown, checkedIn: boolean) {
  const member = await PodMemberModel.create({
    pod_id: podId,
    user_id: new Types.ObjectId(),
    status: 'JOINED',
    source: 'FREE',
    refund_status: 'NONE',
  });
  await TicketModel.create({
    ticket_code: `T-${(seq += 1)}`,
    membership_id: member._id,
    pod_id: podId,
    user_id: member.user_id,
    status: checkedIn ? 'CHECKED_IN' : 'VALID',
    checked_in_at: checkedIn ? new Date() : null,
  });
  return member;
}

describe('settlement of a free pod', () => {
  it('owes the venue nothing, whatever its slot is priced at — a paid pod still owes the slot price', async () => {
    const { venue, slot } = await seedVenueAndSlot(4000);
    const free = { venue_id: venue._id, venue_slot_id: slot._id, pod_type: 'FREE' };
    expect(await venueChargeForPod(free, 900, true)).toMatchObject({
      slot_price: 0,
      slot_linked: false,
      bill: 0,
      slot_included: false,
      amount: 0,
      pricing_mode: 'FLAT',
      overtime_hours: 0,
      overtime_amount: 0,
    });
    expect((await venueChargeForPod({ ...free, pod_type: 'PAID' }, 0)).amount).toBe(4000);
  });

  it('computes a clean zero settlement: no venue party, no negative host figure', async () => {
    const host = await seedHost();
    const { venue, slot } = await seedVenueAndSlot(4000);
    const pod = await seedPod('FREE', { pod_hosts_id: [host._id], venue_id: venue._id, venue_slot_id: slot._id });

    const s = await computePodSettlement(String(pod._id), 1500, null, true);

    expect(s).toMatchObject({
      is_free: true,
      has_venue: false,
      venue: null,
      venue_bill: 0,
      venue_slot_price: 0,
      host_payout_amount: 0,
      collected_total: 0,
    });
    expect(s.waterfall.venue_amount).toBe(0);
    expect(s.waterfall.host_receives).toBe(0);
    expect(s.waterfall.host_amount).toBe(0);
  });

  it('keeps a paid pod on the same slot exactly as before (venue owed, host negative)', async () => {
    const host = await seedHost();
    const { venue, slot } = await seedVenueAndSlot(4000);
    const pod = await seedPod('PAID', { pod_hosts_id: [host._id], venue_id: venue._id, venue_slot_id: slot._id });

    const s = await computePodSettlement(String(pod._id), 0);

    expect(s.is_free).toBe(false);
    expect(s.has_venue).toBe(true);
    expect(s.waterfall.venue_amount).toBe(4000);
    expect(s.waterfall.host_receives).toBeLessThan(0);
  });
});

describe('completing a free pod', () => {
  it('completes it with NO payout release, no wallet credit and a SETTLED zero breakdown', async () => {
    const host = await seedHost();
    const { venue, slot } = await seedVenueAndSlot(4000);
    const pod = await seedPod('FREE', { pod_hosts_id: [host._id], venue_id: venue._id, venue_slot_id: slot._id });
    await seedBooking(pod._id, true);

    const out = await svc.completePod(
      { pod_id: String(pod._id), venue_bill_amount: 2500, venue_bill_url: 'https://cdn.test/b.pdf', include_slot_price: true },
      { id: String(host._id), isAdmin: false }
    );

    expect(out.releases).toEqual([]);
    expect(out.settlement.is_free).toBe(true);
    expect(await PaymentReleaseModel.countDocuments()).toBe(0);
    expect(await WalletModel.countDocuments()).toBe(0);
    expect((await PodModel.findById(pod._id))!.completed_at).toBeInstanceOf(Date);

    const view = await breakdownService.podFinanceBreakdown(String(pod._id));
    expect(view).toMatchObject({ is_free: true, settlement_status: 'SETTLED', frozen: false });
    expect(view.waterfall.venue_amount).toBe(0);
    expect(view.waterfall.host_receives).toBe(0);

    // A second submit is refused, like a paid pod's — never a second completion.
    await expect(
      svc.completePod({ pod_id: String(pod._id), venue_bill_amount: 0 }, { id: String(host._id), isAdmin: false })
    ).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });
  });

  it('completes a free pod nobody booked without any scan', async () => {
    const host = await seedHost();
    const pod = await seedPod('FREE', { pod_hosts_id: [host._id] });
    const out = await svc.completePod({ pod_id: String(pod._id), venue_bill_amount: 0 }, { id: String(host._id), isAdmin: false });
    expect(out.releases).toEqual([]);
  });

  it('still asks for attendance on a booked free pod — completing locks the roster — without mentioning a payout', async () => {
    const host = await seedHost();
    const pod = await seedPod('FREE', { pod_hosts_id: [host._id] });
    await seedBooking(pod._id, false);

    const refusal = svc.completePod({ pod_id: String(pod._id), venue_bill_amount: 0 }, { id: String(host._id), isAdmin: false });
    await expect(refusal).rejects.toMatchObject({ extensions: { code: 'ATTENDANCE_REQUIRED' } });
    await expect(
      svc.completePod({ pod_id: String(pod._id), venue_bill_amount: 0 }, { id: String(host._id), isAdmin: false })
    ).rejects.not.toThrow(/payout/);
    expect((await PodModel.findById(pod._id))!.completed_at).toBeNull();
  });

  it('lets an expired free pod complete without a scan, so it can never be stranded', async () => {
    const host = await seedHost();
    const pod = await seedPod('FREE', {
      pod_hosts_id: [host._id],
      pod_date_time: new Date(Date.now() - 30 * 24 * HOUR),
      pod_end_date_time: new Date(Date.now() - 30 * 24 * HOUR + HOUR),
    });
    await seedBooking(pod._id, false);
    const out = await svc.completePod({ pod_id: String(pod._id), venue_bill_amount: 0 }, { id: String(host._id), isAdmin: false });
    expect(out.releases).toEqual([]);
  });

  it('refuses a hand-raised payout release against a free pod', async () => {
    const pod = await seedPod('FREE');
    await expect(
      svc.create({ kind: 'HOST_PAYMENT', amount_requested: 10, pod_id: pod._id, evidence_media: ['https://cdn.test/a.jpg'] })
    ).rejects.toMatchObject({ extensions: { code: 'FREE_POD_NO_PAYOUT' } });
    expect(await PaymentReleaseModel.countDocuments()).toBe(0);
  });

  it('completes a paid pod exactly as before: a PENDING host + venue release', async () => {
    const host = await seedHost();
    const { venue, slot } = await seedVenueAndSlot(300);
    const pod = await seedPod('PAID', { pod_hosts_id: [host._id], venue_id: venue._id, venue_slot_id: slot._id });
    const member = await seedBooking(pod._id, true);
    const payment = await PaymentModel.create({
      payment_id: `pay-${(seq += 1)}`,
      user_id: member.user_id,
      user_name: 'A',
      user_email: 'a@x.com',
      pod_id: pod._id,
      subtotal: 1000,
      total: 1000,
      currency_symbol: '₹',
      status: 'SUCCESS',
    } as never);
    await PodMemberModel.updateOne({ _id: member._id }, { $set: { payment_id: payment._id } });

    const out = await svc.completePod({ pod_id: String(pod._id), venue_bill_amount: 0 }, { id: String(host._id), isAdmin: false });

    expect(out.settlement.is_free).toBe(false);
    expect(out.releases.map((r) => r.kind).sort()).toEqual(['HOST_PAYMENT', 'VENUE_BILLING']);
    expect(out.releases.every((r) => r.status === 'PENDING')).toBe(true);
  });
});

describe('earnings projections for a free pod', () => {
  it('answers pod_type FREE with an all-zero projection flagged is_free', async () => {
    const host = await seedHost();
    const { venue } = await seedVenueAndSlot(4000);
    const p = await breakdownService.potentialPodEarnings(String(host._id), 0, 10, String(venue._id), 4000, 'FREE');
    expect(p).toMatchObject({ is_free: true, payable_spots: 0, venue_budget: 0, total_spots: 10 });
    expect(p.waterfall.venue_amount).toBe(0);
    expect(p.waterfall.host_receives).toBe(0);
  });

  it('keeps the paid projection when no type is named (old clients) — unchanged', async () => {
    const host = await seedHost();
    const { venue } = await seedVenueAndSlot(4000);
    const p = await breakdownService.potentialPodEarnings(String(host._id), 0, 10, String(venue._id), 4000);
    expect(p.is_free).toBe(false);
    expect(p.waterfall.venue_amount).toBe(4000);
    expect(p.waterfall.host_receives).toBeLessThan(0);
  });

  it('answers the admin projection for a free pod with zeros, never the slot price', async () => {
    const { venue, slot } = await seedVenueAndSlot(4000);
    const p = await breakdownService.adminPotentialPodEarnings({
      hostUserId: null,
      podAmount: 0,
      noOfSpots: 8,
      venueId: String(venue._id),
      venueSlotId: String(slot._id),
      podType: 'FREE',
    });
    expect(p.is_free).toBe(true);
    expect(p.waterfall.venue_amount).toBe(0);
  });

  it('marks an uncompleted free pod LIVE with a zero waterfall', async () => {
    const { venue, slot } = await seedVenueAndSlot(4000);
    const pod = await seedPod('FREE', { venue_id: venue._id, venue_slot_id: slot._id, pod_date_time: new Date(Date.now() + 24 * HOUR) });
    const view = await breakdownService.podFinanceBreakdown(String(pod._id));
    expect(view).toMatchObject({ is_free: true, settlement_status: 'LIVE' });
    expect(view.waterfall.host_receives).toBe(0);
  });
});

describe('cancelled free pod in Finance > Cancel & Refunds', () => {
  it('shows no venue amount for a free pod, and the slot price for a paid one', async () => {
    const { venue, slot } = await seedVenueAndSlot(4000);
    await seedPod('FREE', { venue_id: venue._id, venue_slot_id: slot._id, deleted_at: new Date() });
    await seedPod('PAID', { venue_id: venue._id, venue_slot_id: slot._id, deleted_at: new Date() });

    const rows = await podCancellationService.list();
    const byTitle = new Map(rows.map((r) => [r.pod_title, r.venue_amount]));
    expect(byTitle.get('FREE pod')).toBe(0);
    expect(byTitle.get('PAID pod')).toBe(4000);
  });
});
