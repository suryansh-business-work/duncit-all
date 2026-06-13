jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) }));

import { Types } from 'mongoose';
import { computePodSettlement, collectedForPod } from '../../settlement.service';
import { paymentReleaseService } from '../../paymentRelease.service';
import { PaymentReleaseModel } from '../../paymentRelease.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { UserModel } from '@modules/access/user/user.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';

let seq = 0;

async function seedHost(sharePct = 60, commissionPct = 10) {
  const u = await UserModel.create({
    auth: { email: `host${++seq}@x.com` },
    profile: { first_name: 'Asha', last_name: 'Host' },
    finance: { host_share_pct: sharePct, host_commission_pct: commissionPct },
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

async function seedPod(hostId: Types.ObjectId, venueId?: Types.ObjectId) {
  return PodModel.create({
    pod_id: `pod-${++seq}`,
    pod_title: 'Sunset Pod',
    pod_hosts_id: [hostId],
    club_id: new Types.ObjectId(),
    venue_id: venueId ?? null,
    pod_description: 'desc',
    pod_date_time: new Date(),
    pod_type: 'NON_NATIVE_PAID',
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

describe('pod settlement (reconciled split)', () => {
  it('computes host + venue lines that reconcile to money collected', async () => {
    const host = await seedHost(60, 10);
    const venue = await seedVenue(host._id, 20);
    const pod = await seedPod(host._id, venue._id);
    await seedPayment(pod._id, 3000);
    await seedPayment(pod._id, 2000);

    expect(await collectedForPod(pod._id)).toBe(5000);

    const s = await computePodSettlement(String(pod._id), 1500);
    expect(s.collected_total).toBe(5000);
    expect(s.has_venue).toBe(true);

    // Host statement: net 2870; host gross 60% = 1722; Duncit commission 10% of
    // that = 172.2; host keeps 1549.8.
    expect(s.host.gst_amount).toBe(630); // 18% of (5000 - 1500)
    expect(s.host.payout_amount).toBe(1549.8);
    expect(s.host.duncit_amount).toBe(1320.2);
    // Reconciles back to the money collected.
    expect(s.host.venue_bill + s.host.gst_amount + s.host.duncit_amount + s.host.payout_amount).toBe(5000);

    // Venue statement
    expect(s.venue?.gst_amount).toBe(270); // 18% of 1500
    expect(s.venue?.duncit_amount).toBe(246); // 20% of 1230
    expect(s.venue?.payout_amount).toBe(984); // 1230 - 246
  });

  it('falls back to global default percentages when host/venue have none', async () => {
    const host = await seedHost(0, 0); // 0 -> defaults 60 / 10
    const venue = await seedVenue(host._id, 0); // 0 -> default 10
    const pod = await seedPod(host._id, venue._id);
    await seedPayment(pod._id, 5000);

    const s = await computePodSettlement(String(pod._id), 1500);
    expect(s.host_share_pct).toBe(60);
    expect(s.host_commission_pct).toBe(10);
    expect(s.venue_commission_pct).toBe(10);
  });

  it('rejects a venue bill larger than what the pod collected', async () => {
    const host = await seedHost();
    const pod = await seedPod(host._id, (await seedVenue(host._id))._id);
    await seedPayment(pod._id, 1000);
    await expect(computePodSettlement(String(pod._id), 5000)).rejects.toThrow(/cannot exceed/i);
  });
});

describe('completePod + Finance approval flow', () => {
  it('creates host + venue releases PENDING and marks the pod complete on approval', async () => {
    const host = await seedHost(60, 10);
    const venue = await seedVenue(host._id, 20);
    const pod = await seedPod(host._id, venue._id);
    await seedPayment(pod._id, 5000);

    const result = await paymentReleaseService.completePod(
      {
        pod_id: String(pod._id),
        venue_bill_amount: 1500,
        bill_url: 'https://x.com/bill.pdf',
        evidence_media: [{ url: 'https://x.com/party.jpg' }],
      },
      { id: String(host._id), isAdmin: false }
    );

    expect(result.releases).toHaveLength(2);
    const hostRel = result.releases.find((r) => r.kind === 'HOST_PAYMENT')!;
    const venueRel = result.releases.find((r) => r.kind === 'VENUE_BILLING')!;
    expect(hostRel.amount_requested).toBe(1549.8);
    expect(hostRel.status).toBe('PENDING');
    expect(hostRel.breakdown?.payout_amount).toBe(1549.8);
    expect(venueRel.amount_requested).toBe(984);

    // Not complete until Finance approves.
    expect((await PodModel.findById(pod._id))!.completed_at).toBeNull();

    const reviewed = await paymentReleaseService.review(
      hostRel.id,
      { status: 'APPROVED', approval_type: 'FULL' },
      new Types.ObjectId().toString()
    );
    expect(reviewed.status).toBe('APPROVED');
    expect((await PodModel.findById(pod._id))!.completed_at).not.toBeNull();

    const mine = await paymentReleaseService.listMine(String(host._id));
    expect(mine).toHaveLength(1);
    expect(mine[0].kind).toBe('HOST_PAYMENT');
  });

  it('blocks a non-host and a double completion', async () => {
    const host = await seedHost();
    const pod = await seedPod(host._id, (await seedVenue(host._id))._id);
    await seedPayment(pod._id, 5000);

    await expect(
      paymentReleaseService.completePod(
        { pod_id: String(pod._id), venue_bill_amount: 1000, bill_url: 'https://x.com/b.pdf', evidence_media: [{ url: 'https://x.com/p.jpg' }] },
        { id: new Types.ObjectId().toString(), isAdmin: false }
      )
    ).rejects.toThrow(/only a host/i);

    const input = {
      pod_id: String(pod._id),
      venue_bill_amount: 1000,
      bill_url: 'https://x.com/b.pdf',
      evidence_media: [{ url: 'https://x.com/p.jpg' }],
    };
    await paymentReleaseService.completePod(input, { id: String(host._id), isAdmin: false });
    await expect(
      paymentReleaseService.completePod(input, { id: String(host._id), isAdmin: false })
    ).rejects.toThrow(/already been submitted/i);
  });

  it('requires party media and (for venue pods) a bill upload', async () => {
    const host = await seedHost();
    const pod = await seedPod(host._id, (await seedVenue(host._id))._id);
    await seedPayment(pod._id, 5000);

    await expect(
      paymentReleaseService.completePod(
        { pod_id: String(pod._id), venue_bill_amount: 1000, bill_url: 'https://x.com/b.pdf', evidence_media: [] },
        { id: String(host._id), isAdmin: false }
      )
    ).rejects.toThrow(/party photos or videos/i);

    await expect(
      paymentReleaseService.completePod(
        { pod_id: String(pod._id), venue_bill_amount: 1000, bill_url: '', evidence_media: [{ url: 'https://x.com/p.jpg' }] },
        { id: String(host._id), isAdmin: false }
      )
    ).rejects.toThrow(/venue bill/i);
  });

  it('completes a virtual pod (no venue) with only a host release', async () => {
    const host = await seedHost(40);
    const pod = await seedPod(host._id); // no venue
    await seedPayment(pod._id, 1000);

    const result = await paymentReleaseService.completePod(
      { pod_id: String(pod._id), venue_bill_amount: 0, evidence_media: [{ url: 'https://x.com/p.jpg' }] },
      { id: String(host._id), isAdmin: false }
    );
    expect(result.settlement.has_venue).toBe(false);
    expect(result.releases).toHaveLength(1);
    expect(result.releases[0].kind).toBe('HOST_PAYMENT');
  });
});
