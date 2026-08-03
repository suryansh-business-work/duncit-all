jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) }));

import { Types } from 'mongoose';
import { computePodSettlement, collectedForPod, venueAmountForPod } from '../../settlement.service';
import { paymentReleaseService } from '../../paymentRelease.service';
import { PaymentReleaseModel } from '../../paymentRelease.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { UserModel } from '@modules/access/user/user.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';

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

async function seedPayment(podId: Types.ObjectId, total: number) {
  return PaymentModel.create({
    payment_id: `pay-${++seq}`,
    user_id: new Types.ObjectId(),
    user_name: 'Buyer',
    user_email: 'buyer@x.com',
    subtotal: total,
    total,
    status: 'SUCCESS',
    pod_id: podId,
  });
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

    // Waterfall: GST 5000×18/118=762.71; net 4237.29; fee 5%=211.86;
    // pool 4025.43; venue price 1500 (−20% comm 300 → 1200);
    // host remainder 2525.43 (−10% comm 252.54 → 2272.89); Duncit 764.40.
    const w = s.waterfall;
    expect(w.version).toBe(2);
    expect(w.gst_amount).toBe(762.71);
    expect(w.net_amount).toBe(4237.29);
    expect(w.platform_fee_amount).toBe(211.86);
    expect(w.pool_amount).toBe(4025.43);
    expect(w.venue_amount).toBe(1500);
    expect(w.venue_commission_amount).toBe(300);
    expect(w.venue_receives).toBe(1200);
    expect(w.host_amount).toBe(2525.43);
    expect(w.host_commission_amount).toBe(252.54);
    expect(w.host_receives).toBe(2272.89);
    expect(w.duncit_revenue).toBe(764.4);
    expect(w.host_earn_pct).toBe(45.46);
    // Invariant: GST + host + venue + Duncit === customer payments.
    expect(
      Math.round((w.gst_amount + w.host_receives + w.venue_receives + w.duncit_revenue) * 100) / 100
    ).toBe(5000);

    // Legacy party lines derive from the waterfall.
    expect(s.host.gst_amount).toBe(762.71);
    expect(s.host.payout_amount).toBe(2272.89);
    expect(s.host.duncit_amount).toBe(252.54);
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

    // Canonical ₹1000 + ₹300 slot: pool 805.09 → venue 300 (−10% → 270),
    // host 505.09 (−10% → 454.58), Duncit 122.88.
    const s = await computePodSettlement(String(pod._id), 0);
    expect(s.waterfall.venue_amount).toBe(300);
    expect(s.waterfall.venue_receives).toBe(270);
    expect(s.waterfall.host_receives).toBe(454.58);
    expect(s.waterfall.duncit_revenue).toBe(122.88);
    expect(s.waterfall.host_earn_pct).toBe(45.46);
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

  it('clamps a venue bill larger than the collection to the pool (never blocks)', async () => {
    const host = await seedHost();
    const pod = await seedPod(host._id, (await seedVenue(host._id))._id);
    await seedPayment(pod._id, 1000);
    // The bill is evidence — offline venue costs may exceed a small pod's
    // collection. The paise engine clamps the venue amount to the pool, so a
    // large bill never creates money and the host side never goes negative.
    const s = await computePodSettlement(String(pod._id), 5000);
    expect(s.venue_bill).toBe(5000);
    expect(s.waterfall.venue_amount).toBe(s.waterfall.pool_amount);
    expect(s.waterfall.host_amount).toBe(0);
    expect(s.waterfall.host_receives).toBe(0);
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
      expect(s.waterfall.host_amount).toBe(1000); // whole pool, no venue
      expect(s.has_venue).toBe(false);
    } finally {
      await FinanceSettingsModel.updateOne(
        { singleton_key: 'finance' },
        { $set: { gst_pct: 18, platform_fee_pct: 5 } }
      );
    }
  });
});

describe('completePod — the single trigger: releases auto-approve and wallets credit', () => {
  it('creates host + venue releases APPROVED, stamps completion and credits both wallets', async () => {
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
    // v2 waterfall on 5000 with venue bill 1500: host remainder 2525.43 −10%
    // = 2272.89; venue 1500 −20% = 1200. Snapshots frozen at version 2.
    expect(hostRel.amount_requested).toBe(2272.89);
    expect(hostRel.status).toBe('APPROVED');
    expect(hostRel.approval_reason).toBe('Auto-approved on pod completion');
    expect(hostRel.breakdown?.payout_amount).toBe(2272.89);
    expect(hostRel.breakdown?.version).toBe(2);
    expect(hostRel.breakdown?.share_amount).toBe(2525.43);
    expect(hostRel.breakdown?.share_pct).toBe(62.74); // of the pool, derived
    expect(hostRel.breakdown?.duncit_revenue).toBe(764.4);
    expect(venueRel.status).toBe('APPROVED');
    expect(venueRel.amount_requested).toBe(1200);
    expect(venueRel.breakdown?.version).toBe(2);
    expect(venueRel.breakdown?.share_amount).toBe(1500);
    expect(venueRel.breakdown?.commission_amount).toBe(300);

    // Completion IS the trigger: the pod is stamped complete right away…
    expect((await PodModel.findById(pod._id))!.completed_at).not.toBeNull();

    // …and the money is already in both wallets, transaction rows included.
    const { WalletModel, WalletTransactionModel } = await import(
      '@modules/finance/wallet/wallet.model'
    );
    const hostWallet = await WalletModel.findOne({ user_id: host._id });
    const ownerWallet = await WalletModel.findOne({ user_id: owner._id });
    expect(hostWallet!.balance).toBe(2272.89);
    expect(ownerWallet!.balance).toBe(1200);
    const venueTxn = await WalletTransactionModel.findOne({ user_id: owner._id });
    expect(venueTxn!.source).toBe('POD_COMPLETION');
    expect(venueTxn!.reason).toContain('Venue payout');

    const mine = await paymentReleaseService.listMine(String(host._id));
    expect(mine).toHaveLength(1);
    expect(mine[0].kind).toBe('HOST_PAYMENT');
  });

  it('pays the club-admin cut into the club admin wallet automatically', async () => {
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
      expect(clubRel.status).toBe('APPROVED');
      expect(clubRel.amount_requested).toBe(80.51);
      expect(clubRel.breakdown?.club_admin_amount).toBe(80.51);
      expect(clubRel.breakdown?.share_amount).toBe(80.51);

      const { WalletModel, WalletTransactionModel } = await import(
        '@modules/finance/wallet/wallet.model'
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

  it('requires party media', async () => {
    const host = await seedHost();
    const pod = await seedPod(host._id, (await seedVenue(host._id))._id);
    await seedPayment(pod._id, 5000);

    await expect(
      paymentReleaseService.completePod(
        { pod_id: String(pod._id), venue_bill_amount: 1000, evidence_media: [] },
        { id: String(host._id), isAdmin: false }
      )
    ).rejects.toThrow(/party photos or videos/i);
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
    // No bill document is asked for any more, so the stored value is blank…
    expect(result.releases.every((r) => r.bill_url === '')).toBe(true);
    const stored = await PaymentReleaseModel.find({ pod_id: pod._id });
    expect(stored.map((doc) => doc.bill_url)).toEqual(['', '']);
    // …while the entered venue bill AMOUNT still drives the venue's payout
    // (no venue_slot_id → venueAmountForPod falls back to 1500, −20% = 1200).
    const venueRel = result.releases.find((r) => r.kind === 'VENUE_BILLING')!;
    expect(venueRel.amount_requested).toBe(1200);
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
    // Whole pool 805.09 to the host, −10% commission → 724.58.
    expect(result.releases[0].amount_requested).toBe(724.58);
  });
});
