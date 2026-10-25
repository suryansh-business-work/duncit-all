jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) }));

import { Types } from 'mongoose';
import {
  computePodSettlement,
  collectedForPod,
  venueAmountForPod,
  venueChargeForPod,
} from '../../settlement.service';
import { paymentReleaseService } from '../../paymentRelease.service';
import { PaymentReleaseModel } from '../../paymentRelease.model';
import { financeResolvers } from '../../finance.resolver';
import { sendEmail } from '@services/email/email.service';
import { walletService } from '@modules/finance/wallet/wallet.service';
import { WalletModel, WalletTransactionModel } from '@modules/finance/wallet/wallet.model';
import { makeContext } from '@test/harness';
import { PodModel } from '@modules/pods/pod/pod.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { UserModel } from '@modules/access/user/user.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';
import { TicketModel } from '@modules/pods/ticket/ticket.model';

let seq = 0;

async function seedHost(commissionPct = 10) {
  const u = await UserModel.create({
    auth: { email: `host${++seq}@x.com` },
    profile: { first_name: 'Asha', last_name: 'Host' },
    finance: { host_commission_pct: commissionPct },
  });
  return u;
}

async function seedVenue(ownerId: Types.ObjectId, commissionPct = 20) {
  return VenueModel.create({
    owner_user_id: ownerId,
    venue_name: 'Sunset Cafe',
    owner_email: `venue${++seq}@x.com`,
    venue_commission_pct: commissionPct,
  });
}

async function seedPod(hostId: Types.ObjectId, venueId?: Types.ObjectId, venueSlotId?: Types.ObjectId) {
  return PodModel.create({
    pod_id: `pod-${++seq}`,
    pod_title: 'Sunset Pod',
    pod_hosts_id: [hostId],
    club_id: new Types.ObjectId(),
    venue_id: venueId ?? null,
    venue_slot_id: venueSlotId ?? null,
    pod_description: 'desc',
    pod_date_time: new Date(),
    pod_type: 'PAID',
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

/**
 * A paid booking whose guest the host MARKED PRESENT.
 *
 * The waterfall settles on attendance, not on what was collected: money from a
 * no-show is kept but never paid out. So a payment on its own is worth nothing
 * to the engine — it needs the JOINED membership that links it, and the
 * CHECKED_IN ticket that says somebody walked through the door. Every figure
 * asserted below is for a pod where everyone who paid turned up, which is what
 * makes the collected total and the settlement basis the same number.
 */
async function seedPayment(podId: Types.ObjectId, total: number, attended = true) {
  const payment = await PaymentModel.create({
    payment_id: `pay-${++seq}`,
    user_id: new Types.ObjectId(),
    user_name: 'Buyer',
    user_email: 'buyer@x.com',
    subtotal: total,
    total,
    status: 'SUCCESS',
    pod_id: podId,
  });
  const member = await PodMemberModel.create({
    pod_id: podId,
    user_id: payment.user_id,
    status: 'JOINED',
    payment_id: payment._id,
  });
  if (attended) {
    await TicketModel.create({
      ticket_code: `T-SETTLE-${seq}`,
      membership_id: member._id,
      pod_id: podId,
      user_id: payment.user_id,
      status: 'CHECKED_IN',
      checked_in_at: new Date(),
    });
  }
  return payment;
}

/** How many times a wallet has actually been paid — the CREDIT rows behind it. */
const creditCount = (userId: Types.ObjectId) =>
  WalletTransactionModel.countDocuments({ user_id: userId, type: 'CREDIT' });

/** The payout statements mailed so far, by recipient. */
const statementRecipients = () =>
  (sendEmail as jest.Mock).mock.calls
    .map(([mail]) => mail)
    .filter((mail) => mail.template === 'payout-statement')
    .map((mail) => String(mail.to))
    .sort((a, b) => a.localeCompare(b));

const BILL_URL = 'https://ik.imagekit.io/duncit/venue-bill.pdf';

/** Host (10%) + a venue owned by somebody else (10%) + a booked ₹300 slot + one
 * attended ₹1000 booking — the canonical pod the bill rules are read against. */
async function seedSlotPod(slotPrice = 300) {
  const owner = await seedHost();
  const host = await seedHost(10);
  const venue = await seedVenue(owner._id, 10);
  const slot = await seedSlot(venue, slotPrice);
  const pod = await seedPod(host._id, venue._id, slot._id);
  await seedPayment(pod._id, 1000);
  return { owner, host, venue, slot, pod };
}

describe('pod settlement (engine v2: venue slot price off the pool, host keeps the rest)', () => {
  it('computes the GST-inclusive waterfall that reconciles to money collected', async () => {
    const host = await seedHost(10);
    const venue = await seedVenue(host._id, 20);
    const pod = await seedPod(host._id, venue._id);
    await seedPayment(pod._id, 3000);
    await seedPayment(pod._id, 2000);

    expect(await collectedForPod(pod._id)).toBe(5000);

    // No slot linked → the host-entered venue bill (1500) is the venue amount.
    // This fallback is why the bill AMOUNT survives the bill-document removal.
    expect(pod.venue_slot_id).toBeNull();
    expect(await venueAmountForPod(pod, 1500)).toBe(1500);
    const s = await computePodSettlement(String(pod._id), 1500);
    expect(s.collected_total).toBe(5000);
    expect(s.has_venue).toBe(true);
    // …and the settlement says so: no slot behind the venue's money.
    expect(s.venue_slot_linked).toBe(false);
    expect(s.venue_slot_price).toBe(0);
    expect(s.include_slot_price).toBe(false);

    // Waterfall: GST 5000×18/118=762.71; net 4237.29; fee 5%=211.86;
    // pool 4025.43; club admin 3% (shipped default) 120.76 → 3904.67 to split;
    // venue price 1500 (−20% comm 300 → 1200);
    // host remainder 2404.67 (−10% comm 240.47 → 2164.20);
    // Duncit 211.86 + 300 + 240.47 + 120.76 = 873.09.
    const w = s.waterfall;
    expect(w.version).toBe(2);
    expect(w.gst_amount).toBe(762.71);
    expect(w.net_amount).toBe(4237.29);
    expect(w.platform_fee_amount).toBe(211.86);
    expect(w.pool_amount).toBe(4025.43);
    expect(w.club_admin_pct).toBe(3);
    expect(w.club_admin_amount).toBe(120.76);
    expect(w.venue_amount).toBe(1500);
    expect(w.venue_commission_amount).toBe(300);
    expect(w.venue_receives).toBe(1200);
    expect(w.host_amount).toBe(2404.67);
    expect(w.host_commission_amount).toBe(240.47);
    expect(w.host_receives).toBe(2164.2);
    expect(w.duncit_revenue).toBe(873.09);
    expect(w.host_earn_pct).toBe(43.28);
    // Invariant: GST + host + venue + Duncit === customer payments.
    expect(
      Math.round((w.gst_amount + w.host_receives + w.venue_receives + w.duncit_revenue) * 100) / 100
    ).toBe(5000);

    // Legacy party lines derive from the waterfall.
    expect(s.host.gst_amount).toBe(762.71);
    expect(s.host.payout_amount).toBe(2164.2);
    expect(s.host.duncit_amount).toBe(240.47);
    expect(s.venue?.gst_amount).toBe(0);
    expect(s.venue?.duncit_amount).toBe(300);
    expect(s.venue?.payout_amount).toBe(1200);
  });

  it('uses the booked venue slot price (Partners portal) over the entered bill', async () => {
    const host = await seedHost(10);
    const venue = await seedVenue(host._id, 10);
    const slot = await seedSlot(venue, 300);
    const pod = await seedPod(host._id, venue._id, slot._id);
    await seedPayment(pod._id, 1000);

    expect(await venueAmountForPod(pod, 999)).toBe(300);

    // Canonical ₹1000 + ₹300 slot: pool 805.09 − 3% club admin 24.15 → venue
    // 300 (−10% → 270),
    // host 480.94 (−10% → 432.85), Duncit 144.61.
    const s = await computePodSettlement(String(pod._id), 0);
    expect(s.waterfall.venue_amount).toBe(300);
    expect(s.waterfall.venue_receives).toBe(270);
    expect(s.waterfall.host_receives).toBe(432.85);
    expect(s.waterfall.duncit_revenue).toBe(144.61);
    expect(s.waterfall.host_earn_pct).toBe(43.29);
    expect(s.venue_slot_price).toBe(300);
    expect(s.venue_slot_linked).toBe(true);
    expect(s.include_slot_price).toBe(false);
  });

  /*
    The venue's final bill, three ways. Which one applies is decided by the
    third argument and by nothing else:

      left out → the caller is an app build from before a bill could move
                 money. The amount is recorded and the slot price still stands.
      false    → the bill REPLACES the slot price.
      true     → the bill is paid on top of the slot price.
  */
  it('venueChargeForPod: no venue owes nothing, whatever is entered', async () => {
    const host = await seedHost();
    const pod = await seedPod(host._id);
    expect(await venueChargeForPod(pod, 500, true)).toMatchObject({
      slot_price: 0,
      slot_linked: false,
      bill: 0,
      slot_included: false,
      amount: 0,
      pricing_mode: 'FLAT',
      overtime_hours: 0,
      overtime_amount: 0,
    });
  });

  it('venueChargeForPod: with no bill the booked slot price stands in every mode', async () => {
    const { pod } = await seedSlotPod(300);
    const slotPriceStands = {
      slot_price: 300,
      pricing_mode: 'FLAT',
      pax: 0,
      overtime_hours: 0,
      overtime_amount: 0,
      slot_linked: true,
      bill: 0,
      slot_included: false,
      amount: 300,
      // A slot booked before offers: no snapshot (so no commission on top), no minimum, no agreed terms.
      commission_on_top: null,
      min_guests: 0,
      extra: 0,
      agreed_model: null,
      agreed_rate: null,
    };
    expect(await venueChargeForPod(pod, 0)).toEqual(slotPriceStands);
    expect(await venueChargeForPod(pod, 0, false)).toEqual(slotPriceStands);
    // "Include the slot price" with nothing to add it to is not an inclusion.
    expect(await venueChargeForPod(pod, 0, true)).toEqual(slotPriceStands);
    // A negative bill is no bill.
    expect(await venueChargeForPod(pod, -50, false)).toEqual(slotPriceStands);
  });

  it('venueChargeForPod: a bill is evidence only when the caller names no mode', async () => {
    const { pod } = await seedSlotPod(300);
    const evidenceOnly = {
      slot_price: 300,
      pricing_mode: 'FLAT',
      pax: 0,
      overtime_hours: 0,
      overtime_amount: 0,
      slot_linked: true,
      bill: 450,
      slot_included: false,
      amount: 300,
      commission_on_top: null,
      min_guests: 0,
      extra: 0,
      agreed_model: null,
      agreed_rate: null,
    };
    expect(await venueChargeForPod(pod, 450)).toEqual(evidenceOnly);
    expect(await venueChargeForPod(pod, 450, null)).toEqual(evidenceOnly);
    expect(await venueAmountForPod(pod, 450)).toBe(300);
  });

  it('venueChargeForPod: a bill replaces the slot price, or is paid on top of it', async () => {
    const { pod } = await seedSlotPod(300);
    expect(await venueChargeForPod(pod, 450, false)).toMatchObject({
      slot_price: 300,
      slot_linked: true,
      bill: 450,
      slot_included: false,
      amount: 450,
      pricing_mode: 'FLAT',
      overtime_hours: 0,
      overtime_amount: 0,
    });
    expect(await venueChargeForPod(pod, 450, true)).toMatchObject({
      slot_price: 300,
      slot_linked: true,
      bill: 450,
      slot_included: true,
      amount: 750,
      pricing_mode: 'FLAT',
      overtime_hours: 0,
      overtime_amount: 0,
    });
  });

  it('venueChargeForPod: a free slot has nothing to include, so the bill is the whole amount', async () => {
    const { pod } = await seedSlotPod(0);
    expect(await venueChargeForPod(pod, 450, true)).toMatchObject({
      slot_price: 0,
      slot_linked: true,
      bill: 450,
      slot_included: false,
      amount: 450,
      pricing_mode: 'FLAT',
      overtime_hours: 0,
      overtime_amount: 0,
    });
    // Still a linked slot, so a caller that names no mode cannot move it off ₹0.
    expect((await venueChargeForPod(pod, 450)).amount).toBe(0);
  });

  it('venueChargeForPod: a legacy pod with no slot link is charged its bill in every mode', async () => {
    const host = await seedHost();
    const venue = await seedVenue(host._id);
    const pod = await seedPod(host._id, venue._id);
    const billOnly = { slot_price: 0, slot_linked: false, bill: 450, slot_included: false, amount: 450 };
    expect(await venueChargeForPod(pod, 450)).toEqual(billOnly);
    expect(await venueChargeForPod(pod, 450, false)).toEqual(billOnly);
    expect(await venueChargeForPod(pod, 450, true)).toEqual(billOnly);
    // No bill and no slot: nothing to charge — completePod refuses this pod.
    expect((await venueChargeForPod(pod, 0, false)).amount).toBe(0);

    // A slot id that no longer resolves is the same case, not a ₹0 slot.
    const dangling = await seedPod(host._id, venue._id, new Types.ObjectId());
    expect(await venueChargeForPod(dangling, 450)).toEqual(billOnly);
  });

  it('settles a slot pod on the slot price when the bill is evidence only', async () => {
    const { pod } = await seedSlotPod(300);
    // No 4th argument — the bill is reported, the venue's money does not move.
    const s = await computePodSettlement(String(pod._id), 999);
    expect(s.venue_bill).toBe(999);
    expect(s.venue_slot_price).toBe(300);
    expect(s.include_slot_price).toBe(false);
    expect(s.waterfall.venue_amount).toBe(300);
    expect(s.waterfall.venue_receives).toBe(270);
    expect(s.waterfall.host_receives).toBe(432.85);
  });

  it('settles a slot pod on the bill when it replaces the slot price', async () => {
    const { pod } = await seedSlotPod(300);
    // Pool 805.09 − club admin 24.15 = 780.94; venue 450 (−10% → 405);
    // host 330.94 (−10% → 297.85).
    const s = await computePodSettlement(String(pod._id), 450, null, false);
    expect(s.venue_bill).toBe(450);
    expect(s.venue_slot_price).toBe(300);
    expect(s.venue_slot_linked).toBe(true);
    expect(s.include_slot_price).toBe(false);
    expect(s.waterfall.venue_amount).toBe(450);
    expect(s.waterfall.venue_receives).toBe(405);
    expect(s.waterfall.host_amount).toBe(330.94);
    expect(s.waterfall.host_receives).toBe(297.85);
    expect(s.venue?.payout_amount).toBe(405);
    expect(s.host_payout_amount).toBe(297.85);
  });

  it('settles a slot pod on slot price + bill when the bill is paid on top', async () => {
    const { pod } = await seedSlotPod(300);
    // Venue 300 + 450 = 750 (−10% → 675); host 780.94 − 750 = 30.94 (−10% → 27.85).
    const s = await computePodSettlement(String(pod._id), 450, null, true);
    expect(s.venue_bill).toBe(450);
    expect(s.venue_slot_price).toBe(300);
    expect(s.include_slot_price).toBe(true);
    expect(s.waterfall.venue_amount).toBe(750);
    expect(s.waterfall.venue_receives).toBe(675);
    expect(s.waterfall.host_amount).toBe(30.94);
    expect(s.waterfall.host_receives).toBe(27.85);
    // Still reconciles to what the guests paid.
    const w = s.waterfall;
    expect(
      Math.round((w.gst_amount + w.host_receives + w.venue_receives + w.duncit_revenue) * 100) / 100
    ).toBe(1000);
  });

  it('falls back to global default commissions when host/venue have none', async () => {
    const host = await seedHost(0); // 0 -> default 10
    const venue = await seedVenue(host._id, 0); // 0 -> default 10
    const pod = await seedPod(host._id, venue._id);
    await seedPayment(pod._id, 5000);

    const s = await computePodSettlement(String(pod._id), 1500);
    expect(s.host_commission_pct).toBe(10);
    expect(s.venue_commission_pct).toBe(10);
  });

  /*
    A venue bill larger than the pool is NOT clamped, and that is the point.

    The venue is owed the price it agreed for holding the room, whatever the pod
    took at the door — clamping it to the pool is what used to pay a venue less
    than its own price, quietly, and settling on attendance only makes the pool
    smaller. Unclamped, the shortfall lands where it belongs: on the host's
    side, as a negative host amount somebody can see and ask about.
  */
  it('never trims a venue bill larger than the pool — the shortfall shows on the host side', async () => {
    const host = await seedHost();
    const pod = await seedPod(host._id, (await seedVenue(host._id))._id);
    await seedPayment(pod._id, 1000);

    const s = await computePodSettlement(String(pod._id), 5000);
    expect(s.venue_bill).toBe(5000);
    expect(s.waterfall.venue_amount).toBe(5000);
    expect(s.waterfall.venue_amount).toBeGreaterThan(s.waterfall.pool_amount);
    expect(s.waterfall.host_amount).toBeLessThan(0);
  });

  it('rejects an invalid pod id and a missing pod', async () => {
    await expect(computePodSettlement('nope', 0)).rejects.toThrow(/invalid pod/i);
    await expect(computePodSettlement(new Types.ObjectId().toString(), 0)).rejects.toThrow(
      /not found/i
    );
  });

  it('handles a hostless pod and zero-configured rates (defaults + clamps)', async () => {
    const { FinanceSettingsModel } = await import('../../finance.model');
    await FinanceSettingsModel.updateOne(
      { singleton_key: 'finance' },
      { $set: { gst_pct: 0, platform_fee_pct: 0 } },
      { upsert: true }
    );
    try {
      const pod = await PodModel.create({
        pod_id: `pod-${++seq}`,
        pod_title: 'Hostless Pod',
        pod_hosts_id: [],
        club_id: new Types.ObjectId(),
        pod_description: 'desc',
        pod_date_time: new Date(),
        pod_type: 'PAID',
      });
      await seedPayment(pod._id, 1000);
      const s = await computePodSettlement(String(pod._id), 0);
      expect(s.waterfall.gst_amount).toBe(0);
      expect(s.waterfall.platform_fee_amount).toBe(0);
      expect(s.host_commission_pct).toBe(10); // global default (no host doc)
      // The club-admin default (3%) still applies: 1000 − 30 is the host's, no venue.
      expect(s.waterfall.club_admin_amount).toBe(30);
      expect(s.waterfall.host_amount).toBe(970);
      expect(s.has_venue).toBe(false);
    } finally {
      await FinanceSettingsModel.updateOne(
        { singleton_key: 'finance' },
        { $set: { gst_pct: 18, platform_fee_pct: 5 } }
      );
    }
  });
});

describe('completePod — one PENDING request; nothing is paid until Finance approves', () => {
  it('creates host + venue releases PENDING under one batch, stamps completion and credits nobody', async () => {
    const owner = await seedHost();
    const host = await seedHost(10);
    const venue = await seedVenue(owner._id, 20);
    const pod = await seedPod(host._id, venue._id);
    await seedPayment(pod._id, 5000);

    const result = await paymentReleaseService.completePod(
      {
        pod_id: String(pod._id),
        venue_bill_amount: 1500,
        evidence_media: [{ url: 'https://x.com/party.jpg' }],
      },
      { id: String(host._id), isAdmin: false }
    );

    expect(result.releases).toHaveLength(2);
    const hostRel = result.releases.find((r) => r.kind === 'HOST_PAYMENT')!;
    const venueRel = result.releases.find((r) => r.kind === 'VENUE_BILLING')!;
    // v2 waterfall on 5000 with venue bill 1500 and the 3% club-admin cut:
    // host remainder 2404.67 −10%
    // = 2164.20; venue 1500 −20% = 1200. Snapshots frozen at version 2.
    expect(hostRel.amount_requested).toBe(2164.2);
    expect(hostRel.status).toBe('PENDING');
    expect(hostRel.approval_type).toBeNull();
    expect(hostRel.approved_amount).toBeNull();
    expect(hostRel.approval_reason).toBe('');
    expect(hostRel.reviewed_by).toBeNull();
    expect(hostRel.reviewed_at).toBeNull();
    expect(hostRel.breakdown?.payout_amount).toBe(2164.2);
    expect(hostRel.breakdown?.version).toBe(2);
    expect(hostRel.breakdown?.share_amount).toBe(2404.67);
    expect(hostRel.breakdown?.share_pct).toBe(59.74); // of the pool, derived
    expect(hostRel.breakdown?.duncit_revenue).toBe(873.09);
    expect(venueRel.status).toBe('PENDING');
    expect(venueRel.amount_requested).toBe(1200);
    expect(venueRel.breakdown?.version).toBe(2);
    expect(venueRel.breakdown?.share_amount).toBe(1500);
    expect(venueRel.breakdown?.commission_amount).toBe(300);

    // One submission, one request: both payouts carry the same batch id, and it
    // can never be read as the pod id legacy rows group by.
    expect(hostRel.batch_id).toMatch(/^set_[a-z0-9]+$/);
    expect(venueRel.batch_id).toBe(hostRel.batch_id);
    expect(Types.ObjectId.isValid(String(hostRel.batch_id))).toBe(false);

    // Submitting IS what completes the pod: it is stamped complete right away…
    expect((await PodModel.findById(pod._id))!.completed_at).not.toBeNull();

    // …but its money has not moved: no wallet, no ledger row, no statement.
    expect(await WalletModel.findOne({ user_id: host._id })).toBeNull();
    expect(await WalletModel.findOne({ user_id: owner._id })).toBeNull();
    expect(await WalletTransactionModel.countDocuments({})).toBe(0);
    expect(statementRecipients()).toEqual([]);

    const mine = await paymentReleaseService.listMine(String(host._id));
    expect(mine).toHaveLength(1);
    expect(mine[0].kind).toBe('HOST_PAYMENT');
    expect(mine[0].status).toBe('PENDING');
  });

  it('approveGroup pays each beneficiary exactly once, and a second approval pays nobody again', async () => {
    const owner = await seedHost();
    const host = await seedHost(10);
    const venue = await seedVenue(owner._id, 20);
    const pod = await seedPod(host._id, venue._id);
    await seedPayment(pod._id, 5000);
    const reviewer = new Types.ObjectId().toString();

    const { releases } = await paymentReleaseService.completePod(
      {
        pod_id: String(pod._id),
        venue_bill_amount: 1500,
        evidence_media: [{ url: 'https://x.com/party.jpg' }],
      },
      { id: String(host._id), isAdmin: false }
    );
    const batch = String(releases[0].batch_id);
    const completedAt = (await PodModel.findById(pod._id))!.completed_at;

    await paymentReleaseService.approveGroup(batch, reviewer);

    // Every payout on the request is approved in full, by the reviewer.
    const stored = await PaymentReleaseModel.find({ batch_id: batch });
    expect(stored).toHaveLength(2);
    for (const doc of stored) {
      expect(doc.status).toBe('APPROVED');
      expect(doc.approval_type).toBe('FULL');
      expect(doc.approved_amount).toBe(doc.amount_requested);
      expect(doc.approval_reason).toBe('');
      expect(String(doc.reviewed_by)).toBe(reviewer);
      expect(doc.reviewed_at).toBeInstanceOf(Date);
    }

    // The money is in both wallets now, transaction rows included.
    const hostWallet = await WalletModel.findOne({ user_id: host._id });
    const ownerWallet = await WalletModel.findOne({ user_id: owner._id });
    expect(hostWallet!.balance).toBe(2164.2);
    expect(ownerWallet!.balance).toBe(1200);
    const venueTxn = await WalletTransactionModel.findOne({ user_id: owner._id });
    expect(venueTxn!.source).toBe('POD_COMPLETION');
    expect(venueTxn!.reason).toContain('Venue payout');
    expect(await creditCount(host._id)).toBe(1);
    expect(await creditCount(owner._id)).toBe(1);
    // Each beneficiary is told once, and only now.
    expect(statementRecipients()).toEqual(
      releases.map((r) => r.beneficiary_email).sort((a, b) => a.localeCompare(b))
    );
    // Approval does not re-complete the pod — submission already stamped it.
    expect((await PodModel.findById(pod._id))!.completed_at).toEqual(completedAt);

    // Idempotent: nothing is left to approve, so nothing is paid twice.
    await expect(paymentReleaseService.approveGroup(batch, reviewer)).rejects.toThrow(
      'Nothing on this request is waiting for approval'
    );
    expect((await WalletModel.findOne({ user_id: host._id }))!.balance).toBe(2164.2);
    expect((await WalletModel.findOne({ user_id: owner._id }))!.balance).toBe(1200);
    expect(await WalletTransactionModel.countDocuments({})).toBe(2);
    expect(statementRecipients()).toHaveLength(2);
  });

  it('approveGroup refuses a request that does not exist or was turned down in full', async () => {
    const reviewer = new Types.ObjectId().toString();
    await expect(paymentReleaseService.approveGroup('set_missing', reviewer)).rejects.toMatchObject({
      message: 'Nothing on this request is waiting for approval',
      extensions: { code: 'BAD_USER_INPUT' },
    });

    const host = await seedHost();
    const pod = await seedPod(host._id);
    await seedPayment(pod._id, 1000);
    const { releases } = await paymentReleaseService.completePod(
      { pod_id: String(pod._id), venue_bill_amount: 0, evidence_media: [] },
      { id: String(host._id), isAdmin: false }
    );
    await paymentReleaseService.review(
      releases[0].id,
      { status: 'REJECTED', approval_reason: 'wrong pod' },
      reviewer
    );
    await expect(
      paymentReleaseService.approveGroup(String(releases[0].batch_id), reviewer)
    ).rejects.toThrow('Nothing on this request is waiting for approval');
    expect(await WalletTransactionModel.countDocuments({})).toBe(0);
  });

  /*
    A payout whose wallet credit fails must not be left APPROVED with no money
    behind it. It goes back to PENDING, the others still go through, and the
    reviewer is told which one to retry — the credit is idempotent per release,
    so the retry pays the one that failed and nobody else.
  */
  it('returns a release to PENDING when its credit fails, pays the others, and a retry finishes it', async () => {
    const owner = await seedHost();
    const host = await seedHost(10);
    const venue = await seedVenue(owner._id, 20);
    const pod = await seedPod(host._id, venue._id);
    await seedPayment(pod._id, 5000);
    const reviewer = new Types.ObjectId().toString();
    const { releases } = await paymentReleaseService.completePod(
      { pod_id: String(pod._id), venue_bill_amount: 1500, evidence_media: [] },
      { id: String(host._id), isAdmin: false }
    );
    const batch = String(releases[0].batch_id);

    const credit = jest
      .spyOn(walletService, 'creditPodPayout')
      .mockRejectedValueOnce(new Error('wallet down'));
    try {
      const failure = await paymentReleaseService
        .approveGroup(batch, reviewer)
        .then(() => null, (error: Error) => error);

      const after = await PaymentReleaseModel.find({ batch_id: batch });
      const stillPending = after.filter((doc) => doc.status === 'PENDING');
      const approved = after.filter((doc) => doc.status === 'APPROVED');
      expect(stillPending).toHaveLength(1);
      expect(approved).toHaveLength(1);
      // The failed one is named, and reads exactly like a release nobody reviewed.
      expect(failure).toMatchObject({ extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      expect(failure!.message).toContain(stillPending[0].release_id);
      expect(failure!.message).not.toContain(approved[0].release_id);
      expect(stillPending[0].approval_type).toBeNull();
      expect(stillPending[0].approved_amount).toBeNull();
      expect(stillPending[0].reviewed_by).toBeNull();
      expect(stillPending[0].reviewed_at).toBeNull();
      // Only the other beneficiary has been paid, and only they were told.
      expect(await WalletTransactionModel.countDocuments({ type: 'CREDIT' })).toBe(1);
      const paid = await WalletTransactionModel.findOne({ type: 'CREDIT' });
      expect(paid!.release_id).toBe(approved[0].release_id);
      expect(statementRecipients()).toEqual([approved[0].beneficiary_email]);

      // Approving again is the retry: it pays the one that failed, once.
      await paymentReleaseService.approveGroup(batch, reviewer);
    } finally {
      credit.mockRestore();
    }

    const settled = await PaymentReleaseModel.find({ batch_id: batch });
    expect(settled.map((doc) => doc.status)).toEqual(['APPROVED', 'APPROVED']);
    expect((await WalletModel.findOne({ user_id: host._id }))!.balance).toBe(2164.2);
    expect((await WalletModel.findOne({ user_id: owner._id }))!.balance).toBe(1200);
    expect(await creditCount(host._id)).toBe(1);
    expect(await creditCount(owner._id)).toBe(1);
  });

  /*
    Releases written before batches existed (and manual ones) carry no batch
    id. Finance still reviews them as one request — addressed by the pod — and
    a batched release that happens to sit on the same pod is not part of it.
  */
  it('approveGroup addresses a legacy unbatched request by its pod id', async () => {
    const owner = await seedHost();
    const host = await seedHost();
    const other = await seedHost();
    const venue = await seedVenue(owner._id);
    const pod = await seedPod(host._id, venue._id);
    const reviewer = new Types.ObjectId().toString();
    const legacy = {
      status: 'PENDING',
      pod_id: pod._id,
      pod_title: pod.pod_title,
      beneficiary_name: 'Legacy',
      beneficiary_email: 'legacy@x.com',
    };
    await PaymentReleaseModel.create([
      {
        ...legacy,
        release_id: `rel-legacy-${++seq}`,
        kind: 'HOST_PAYMENT',
        host_user_id: host._id,
        amount_requested: 500,
      },
      {
        ...legacy,
        release_id: `rel-legacy-${++seq}`,
        kind: 'VENUE_BILLING',
        venue_id: venue._id,
        amount_requested: 200,
      },
      {
        ...legacy,
        release_id: `rel-batched-${++seq}`,
        batch_id: 'set_other',
        kind: 'CLUB_ADMIN',
        host_user_id: other._id,
        amount_requested: 70,
      },
    ]);

    await paymentReleaseService.approveGroup(String(pod._id), reviewer);

    expect((await WalletModel.findOne({ user_id: host._id }))!.balance).toBe(500);
    expect((await WalletModel.findOne({ user_id: owner._id }))!.balance).toBe(200);
    expect(await WalletModel.findOne({ user_id: other._id })).toBeNull();
    const batched = await PaymentReleaseModel.findOne({ batch_id: 'set_other' });
    expect(batched!.status).toBe('PENDING');
    expect(
      await PaymentReleaseModel.countDocuments({ pod_id: pod._id, batch_id: null, status: 'APPROVED' })
    ).toBe(2);

    // The pod id now has nothing pending behind it; the batch still does.
    await expect(paymentReleaseService.approveGroup(String(pod._id), reviewer)).rejects.toThrow(
      'Nothing on this request is waiting for approval'
    );
    await paymentReleaseService.approveGroup('set_other', reviewer);
    expect((await WalletModel.findOne({ user_id: other._id }))!.balance).toBe(70);
    expect((await WalletModel.findOne({ user_id: host._id }))!.balance).toBe(500);
  });

  it('pays the club-admin cut into the club admin wallet once the request is approved', async () => {
    const { FinanceSettingsModel } = await import('../../finance.model');
    await FinanceSettingsModel.updateOne(
      { singleton_key: 'finance' },
      { $set: { default_club_admin_pct: 10 } },
      { upsert: true }
    );
    try {
      const clubAdmin = await seedHost();
      const host = await seedHost(10);
      const { ClubModel } = await import('@modules/clubs/club/club.model');
      const club = await ClubModel.create({
        club_id: `club-${++seq}`,
        club_name: `Club ${seq}`,
        admin_user_ids: [clubAdmin._id],
      });
      const pod = await PodModel.create({
        pod_id: `pod-${++seq}`,
        pod_title: 'Club Pod',
        pod_hosts_id: [host._id],
        club_id: club._id,
        pod_description: 'desc',
        pod_date_time: new Date(),
        pod_type: 'PAID',
      });
      await seedPayment(pod._id, 1000);

      const result = await paymentReleaseService.completePod(
        { pod_id: String(pod._id), venue_bill_amount: 0, evidence_media: [{ url: 'https://x.com/p.jpg' }] },
        { id: String(host._id), isAdmin: false }
      );

      // ₹1000 → net 847.46 → fee 42.37 → pool 805.09 → club admin 10% = 80.51.
      const clubRel = result.releases.find((r) => r.kind === 'CLUB_ADMIN')!;
      expect(clubRel.status).toBe('PENDING');
      expect(clubRel.amount_requested).toBe(80.51);
      expect(clubRel.breakdown?.club_admin_amount).toBe(80.51);
      expect(clubRel.breakdown?.share_amount).toBe(80.51);
      // It rides the same request as the host's payout, and waits with it.
      expect(clubRel.batch_id).toBe(result.releases.find((r) => r.kind === 'HOST_PAYMENT')!.batch_id);
      expect(await WalletModel.findOne({ user_id: clubAdmin._id })).toBeNull();

      await paymentReleaseService.approveGroup(
        String(clubRel.batch_id),
        new Types.ObjectId().toString()
      );
      const wallet = await WalletModel.findOne({ user_id: clubAdmin._id });
      expect(wallet!.balance).toBe(80.51);
      const txn = await WalletTransactionModel.findOne({ user_id: clubAdmin._id });
      expect(txn!.reason).toContain('Club admin payout');

      // The host still gets the remainder after the club-admin cut.
      const hostRel = result.releases.find((r) => r.kind === 'HOST_PAYMENT')!;
      expect(hostRel.amount_requested).toBe(652.12); // (805.09 − 80.51) × 0.9
    } finally {
      await FinanceSettingsModel.updateOne(
        { singleton_key: 'finance' },
        { $set: { default_club_admin_pct: 0 } }
      );
    }
  });

  it('skips the club-admin release when the club has no admin user', async () => {
    const { FinanceSettingsModel } = await import('../../finance.model');
    await FinanceSettingsModel.updateOne(
      { singleton_key: 'finance' },
      { $set: { default_club_admin_pct: 10 } },
      { upsert: true }
    );
    try {
      const host = await seedHost();
      const pod = await seedPod(host._id); // club_id points at no real club doc
      await seedPayment(pod._id, 1000);
      const result = await paymentReleaseService.completePod(
        { pod_id: String(pod._id), venue_bill_amount: 0, evidence_media: [{ url: 'https://x.com/p.jpg' }] },
        { id: String(host._id), isAdmin: false }
      );
      // The cut stays inside Duncit revenue; completion is never blocked.
      expect(result.releases.map((r) => r.kind)).toEqual(['HOST_PAYMENT']);
    } finally {
      await FinanceSettingsModel.updateOne(
        { singleton_key: 'finance' },
        { $set: { default_club_admin_pct: 0 } }
      );
    }
  });

  it('blocks a non-host and a double completion', async () => {
    const host = await seedHost();
    const pod = await seedPod(host._id, (await seedVenue(host._id))._id);
    await seedPayment(pod._id, 5000);

    await expect(
      paymentReleaseService.completePod(
        { pod_id: String(pod._id), venue_bill_amount: 1000, evidence_media: [{ url: 'https://x.com/p.jpg' }] },
        { id: new Types.ObjectId().toString(), isAdmin: false }
      )
    ).rejects.toThrow(/only a host/i);

    const input = {
      pod_id: String(pod._id),
      venue_bill_amount: 1000,
      evidence_media: [{ url: 'https://x.com/p.jpg' }],
    };
    await paymentReleaseService.completePod(input, { id: String(host._id), isAdmin: false });
    await expect(
      paymentReleaseService.completePod(input, { id: String(host._id), isAdmin: false })
    ).rejects.toThrow(/already been submitted/i);
  });

  /*
    Completion does NOT require party media — a pod with no photos still owes
    its host the money it took. Passing none falls back to the pod's own media
    (what the host uploaded and what guests sent in), so the release still
    carries whatever evidence exists. The upload requirement lives on the
    request-host-payment path, which is a different thing being asked for.
  */
  it('completes without evidence, carrying the pod’s own media onto the release', async () => {
    const host = await seedHost();
    const pod = await seedPod(host._id, (await seedVenue(host._id))._id);
    await seedPayment(pod._id, 5000);
    await PodModel.updateOne(
      { _id: pod._id },
      { $set: { pod_party_media: [{ url: 'https://ik.imagekit.io/duncit/party.jpg' }] } }
    );

    const result = await paymentReleaseService.completePod(
      { pod_id: String(pod._id), venue_bill_amount: 1000, evidence_media: [] },
      { id: String(host._id), isAdmin: false }
    );

    const hostRelease = result.releases.find((r) => r.kind === 'HOST_PAYMENT')!;
    expect(hostRelease.evidence_media.map((m: any) => m.url)).toEqual([
      'https://ik.imagekit.io/duncit/party.jpg',
    ]);
  });

  it('completes a venue pod with no bill document — both releases store a blank bill_url', async () => {
    const owner = await seedHost();
    const host = await seedHost(10);
    const venue = await seedVenue(owner._id, 20);
    const pod = await seedPod(host._id, venue._id); // venue, no booked slot
    await seedPayment(pod._id, 5000);

    const result = await paymentReleaseService.completePod(
      {
        pod_id: String(pod._id),
        venue_bill_amount: 1500,
        evidence_media: [{ url: 'https://x.com/party.jpg' }],
      },
      { id: String(host._id), isAdmin: false }
    );

    expect(result.settlement.has_venue).toBe(true);
    expect(result.releases.map((r) => r.kind).sort((a, b) => a.localeCompare(b))).toEqual([
      'HOST_PAYMENT',
      'VENUE_BILLING',
    ]);
    // A caller that names no bill mode sends no document, so the stored value is blank…
    expect(result.releases.every((r) => r.bill_url === '')).toBe(true);
    const stored = await PaymentReleaseModel.find({ pod_id: pod._id });
    expect(stored.map((doc) => doc.bill_url)).toEqual(['', '']);
    // …while the entered venue bill AMOUNT still drives the venue's payout
    // (no venue_slot_id → venueAmountForPod falls back to 1500, −20% = 1200).
    const venueRel = result.releases.find((r) => r.kind === 'VENUE_BILLING')!;
    expect(venueRel.amount_requested).toBe(1200);
  });

  /*
    An installed app build from before a bill could move money still sends an
    amount with no document and no `include_slot_price`. It must keep
    completing pods — and must not be able to change what the venue is paid
    with a number nobody can check.
  */
  it('accepts a bill with no document from a caller that names no mode, and pays the slot price', async () => {
    const { host, pod } = await seedSlotPod(300);

    const result = await paymentReleaseService.completePod(
      { pod_id: String(pod._id), venue_bill_amount: 999, evidence_media: [] },
      { id: String(host._id), isAdmin: false }
    );

    expect(result.settlement.venue_bill).toBe(999);
    expect(result.settlement.include_slot_price).toBe(false);
    const hostRel = result.releases.find((r) => r.kind === 'HOST_PAYMENT')!;
    const venueRel = result.releases.find((r) => r.kind === 'VENUE_BILLING')!;
    // The slot's ₹300 (−10% → 270), not the ₹999 that was typed in.
    expect(venueRel.amount_requested).toBe(270);
    expect(hostRel.amount_requested).toBe(432.85);
    expect(venueRel.bill_url).toBe('');
    expect(hostRel.bill_url).toBe('');
    // The entered amount is kept beside the price that was actually paid.
    for (const rel of [hostRel, venueRel]) {
      expect(rel.breakdown?.venue_bill).toBe(999);
      expect(rel.breakdown?.venue_slot_price).toBe(300);
      expect(rel.breakdown?.include_slot_price).toBe(false);
    }
  });

  it('pays the bill instead of the slot price and files the document on the venue release', async () => {
    const { host, pod } = await seedSlotPod(300);

    const result = await paymentReleaseService.completePod(
      {
        pod_id: String(pod._id),
        venue_bill_amount: 450,
        venue_bill_url: `  ${BILL_URL}  `,
        include_slot_price: false,
        evidence_media: [],
      },
      { id: String(host._id), isAdmin: false }
    );

    const hostRel = result.releases.find((r) => r.kind === 'HOST_PAYMENT')!;
    const venueRel = result.releases.find((r) => r.kind === 'VENUE_BILLING')!;
    expect(venueRel.amount_requested).toBe(405); // 450 − 10%
    expect(hostRel.amount_requested).toBe(297.85);
    // The document sits with the payout it justifies, once, trimmed.
    expect(venueRel.bill_url).toBe(BILL_URL);
    expect(hostRel.bill_url).toBe('');
    for (const rel of [hostRel, venueRel]) {
      expect(rel.status).toBe('PENDING');
      expect(rel.breakdown?.venue_bill).toBe(450);
      expect(rel.breakdown?.venue_slot_price).toBe(300);
      expect(rel.breakdown?.include_slot_price).toBe(false);
    }
  });

  it('pays the bill on top of the slot price when asked to include it', async () => {
    const { host, pod } = await seedSlotPod(300);

    const result = await paymentReleaseService.completePod(
      {
        pod_id: String(pod._id),
        venue_bill_amount: 450,
        venue_bill_url: BILL_URL,
        include_slot_price: true,
        evidence_media: [],
      },
      { id: String(host._id), isAdmin: false }
    );

    expect(result.settlement.include_slot_price).toBe(true);
    const hostRel = result.releases.find((r) => r.kind === 'HOST_PAYMENT')!;
    const venueRel = result.releases.find((r) => r.kind === 'VENUE_BILLING')!;
    expect(venueRel.amount_requested).toBe(675); // (300 + 450) − 10%
    expect(venueRel.breakdown?.share_amount).toBe(750);
    expect(hostRel.amount_requested).toBe(27.85);
    expect(venueRel.bill_url).toBe(BILL_URL);
    for (const rel of [hostRel, venueRel]) {
      expect(rel.breakdown?.venue_bill).toBe(450);
      expect(rel.breakdown?.venue_slot_price).toBe(300);
      expect(rel.breakdown?.include_slot_price).toBe(true);
    }
  });

  it('files the bill on the host release when the venue is owed nothing of its own', async () => {
    const owner = await seedHost();
    const host = await seedHost(10);
    // 100% commission: the venue's whole amount is Duncit's, so it has no release.
    const venue = await seedVenue(owner._id, 100);
    const pod = await seedPod(host._id, venue._id, (await seedSlot(venue, 300))._id);
    await seedPayment(pod._id, 1000);

    const result = await paymentReleaseService.completePod(
      {
        pod_id: String(pod._id),
        venue_bill_amount: 450,
        venue_bill_url: BILL_URL,
        include_slot_price: false,
        evidence_media: [],
      },
      { id: String(host._id), isAdmin: false }
    );

    expect(result.settlement.venue?.payout_amount).toBe(0);
    expect(result.releases.map((r) => r.kind)).toEqual(['HOST_PAYMENT']);
    // The document still has to reach Finance, so it rides the only release there is.
    expect(result.releases[0].bill_url).toBe(BILL_URL);
    expect(result.releases[0].breakdown?.venue_bill).toBe(450);
  });

  it('refuses a bill amount with no document once the caller names a mode', async () => {
    const { host, pod } = await seedSlotPod(300);
    const actor = { id: String(host._id), isAdmin: false };
    const input = { pod_id: String(pod._id), venue_bill_amount: 450, evidence_media: [] };

    for (const include_slot_price of [false, true]) {
      await expect(
        paymentReleaseService.completePod({ ...input, include_slot_price }, actor)
      ).rejects.toMatchObject({
        message: 'Upload the venue bill for the amount you entered',
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    // A blank document is no document.
    await expect(
      paymentReleaseService.completePod(
        { ...input, include_slot_price: false, venue_bill_url: '   ' },
        actor
      )
    ).rejects.toThrow('Upload the venue bill for the amount you entered');

    // A refusal leaves nothing behind: no request, and the pod is not complete.
    expect(await PaymentReleaseModel.countDocuments({ pod_id: pod._id })).toBe(0);
    expect((await PodModel.findById(pod._id))!.completed_at ?? null).toBeNull();

    // No amount, no document needed — the booked slot price simply stands.
    const result = await paymentReleaseService.completePod(
      { ...input, venue_bill_amount: 0, include_slot_price: true },
      actor
    );
    const venueRel = result.releases.find((r) => r.kind === 'VENUE_BILLING')!;
    expect(venueRel.amount_requested).toBe(270);
    expect(venueRel.bill_url).toBe('');
    expect(venueRel.breakdown?.include_slot_price).toBe(false);
  });

  it('refuses a venue pod with no booked slot and no bill — its venue would be paid nothing', async () => {
    const owner = await seedHost();
    const host = await seedHost(10);
    const venue = await seedVenue(owner._id, 20);
    const pod = await seedPod(host._id, venue._id); // venue, no booked slot
    await seedPayment(pod._id, 5000);
    const actor = { id: String(host._id), isAdmin: false };
    const input = { pod_id: String(pod._id), venue_bill_amount: 0, evidence_media: [] };

    // Whatever the caller knows about bill modes, there is no price to fall back on.
    for (const mode of [{}, { include_slot_price: false }, { include_slot_price: true }]) {
      await expect(
        paymentReleaseService.completePod({ ...input, ...mode }, actor)
      ).rejects.toMatchObject({
        message: 'Enter the venue bill amount — this pod has no booked slot price',
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    expect(await PaymentReleaseModel.countDocuments({ pod_id: pod._id })).toBe(0);
    expect((await PodModel.findById(pod._id))!.completed_at ?? null).toBeNull();

    // The same pod completes once the bill is entered, and the bill is its price.
    const result = await paymentReleaseService.completePod(
      { ...input, venue_bill_amount: 1500, venue_bill_url: BILL_URL, include_slot_price: true },
      actor
    );
    const venueRel = result.releases.find((r) => r.kind === 'VENUE_BILLING')!;
    expect(venueRel.amount_requested).toBe(1200); // 1500 − 20%, no slot price to add
    expect(venueRel.bill_url).toBe(BILL_URL);
    expect(venueRel.breakdown?.venue_slot_price).toBe(0);
    expect(venueRel.breakdown?.include_slot_price).toBe(false);
  });

  it('completes a virtual pod (no venue) with only a host release', async () => {
    const host = await seedHost();
    const pod = await seedPod(host._id); // no venue
    await seedPayment(pod._id, 1000);

    const result = await paymentReleaseService.completePod(
      { pod_id: String(pod._id), venue_bill_amount: 0, evidence_media: [{ url: 'https://x.com/p.jpg' }] },
      { id: String(host._id), isAdmin: false }
    );
    expect(result.settlement.has_venue).toBe(false);
    expect(result.releases).toHaveLength(1);
    expect(result.releases[0].kind).toBe('HOST_PAYMENT');
    // Pool 805.09 − 3% club admin = 780.94 to the host, −10% commission → 702.85.
    expect(result.releases[0].amount_requested).toBe(702.85);
  });
});

describe('pod payment release resolvers', () => {
  const Q = financeResolvers.Query as any;
  const M = financeResolvers.Mutation as any;

  it('podSettlementPreview prices the bill mode it is asked for, and creates nothing', async () => {
    const { host, pod } = await seedSlotPod(300);
    const ctx = makeContext({ id: String(host._id), roles: ['USER'] });
    const args = { pod_id: String(pod._id), venue_bill_amount: 450 };

    const evidenceOnly = await Q.podSettlementPreview({}, args, ctx);
    expect(evidenceOnly.waterfall.venue_amount).toBe(300);
    expect(evidenceOnly.include_slot_price).toBe(false);
    const replaced = await Q.podSettlementPreview({}, { ...args, include_slot_price: false }, ctx);
    expect(replaced.waterfall.venue_amount).toBe(450);
    expect(replaced.include_slot_price).toBe(false);
    const onTop = await Q.podSettlementPreview({}, { ...args, include_slot_price: true }, ctx);
    expect(onTop.waterfall.venue_amount).toBe(750);
    expect(onTop.include_slot_price).toBe(true);

    expect(await PaymentReleaseModel.countDocuments({})).toBe(0);
    await expect(
      Q.podSettlementPreview({}, args, makeContext({ roles: ['USER'] }))
    ).rejects.toThrow(/only a host/i);
  });

  it('approvePodPaymentRelease pays the request as the signed-in finance user and returns it settled', async () => {
    const { owner, host, pod } = await seedSlotPod(300);
    const { releases } = await paymentReleaseService.completePod(
      { pod_id: String(pod._id), venue_bill_amount: 0, evidence_media: [] },
      { id: String(host._id), isAdmin: false }
    );
    const batch = String(releases[0].batch_id);
    const reviewer = new Types.ObjectId().toString();

    // A host cannot approve their own request.
    await expect(
      M.approvePodPaymentRelease(
        {},
        { id: batch },
        makeContext({ id: String(host._id), roles: ['USER'] })
      )
    ).rejects.toThrow(/access denied/i);
    expect(await WalletTransactionModel.countDocuments({})).toBe(0);

    const detail = await M.approvePodPaymentRelease(
      {},
      { id: batch },
      makeContext({ id: reviewer, roles: ['FINANCE_MANAGER'] })
    );
    expect(detail.summary.id).toBe(batch);
    expect(detail.summary.status).toBe('APPROVED');
    expect(detail.summary.total_requested).toBe(702.85); // host 432.85 + venue 270
    expect(detail.releases).toHaveLength(2);
    for (const rel of detail.releases) {
      expect(rel.status).toBe('APPROVED');
      expect(rel.reviewed_by).toBe(reviewer);
    }
    expect((await WalletModel.findOne({ user_id: host._id }))!.balance).toBe(432.85);
    expect((await WalletModel.findOne({ user_id: owner._id }))!.balance).toBe(270);
  });
});
