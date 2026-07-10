import { Types } from 'mongoose';
import { partnerDashboardService } from '../../partnerDashboard.service';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { PaymentReleaseModel } from '@modules/finance/finance/paymentRelease.model';

const inDays = (d: number) => new Date(Date.now() + d * 86_400_000);

describe('partnerDashboardService integration', () => {
  it('returns zeroed metrics for a partner with no data', async () => {
    const result = await partnerDashboardService.get(new Types.ObjectId().toString(), {
      from: '2020-01-01',
      to: '2030-01-01',
    });

    expect(result.summary.number_of_pods).toBe(0);
    expect(result.summary.total_earning).toBe(0);
    expect(result.venue.venue_earning).toBe(0);
    expect(result.host.host_earning).toBe(0);
    expect(result.products.product_earning).toBe(0);
    expect(result.venue.added_slots).toBe(0);
    expect(new Date(result.from).getUTCFullYear()).toBe(2020);
  });

  it('counts only upcoming available slots in venue.added_slots', async () => {
    const ownerId = new Types.ObjectId().toString();
    const venue = await VenueModel.create({
      owner_user_id: ownerId,
      status: 'APPROVED',
      is_active: true,
      venue_name: 'Hall',
    });
    await VenueSlotModel.create([
      { venue_id: venue._id, owner_user_id: ownerId, start_at: inDays(2), end_at: inDays(2.1), status: 'AVAILABLE' },
      { venue_id: venue._id, owner_user_id: ownerId, start_at: inDays(3), end_at: inDays(3.1), status: 'AVAILABLE' },
      // Past slot — excluded.
      { venue_id: venue._id, owner_user_id: ownerId, start_at: inDays(-2), end_at: inDays(-1.9), status: 'AVAILABLE' },
      // Booked slot — excluded (no longer an open availability).
      { venue_id: venue._id, owner_user_id: ownerId, start_at: inDays(4), end_at: inDays(4.1), status: 'BOOKED' },
    ]);

    const result = await partnerDashboardService.get(ownerId, { from: '2020-01-01', to: '2030-01-01' });
    expect(result.venue.added_slots).toBe(2);
  });

  it('nets product earning by the Duncit commission (settled basis, not gross)', async () => {
    const ownerId = new Types.ObjectId().toString();
    const productId = new Types.ObjectId();
    await InventoryProductModel.collection.insertOne({
      _id: productId,
      listing_submitted_by_id: ownerId,
      listing_review_status: 'APPROVED',
      commission_pct: 20,
    } as never);
    await PodModel.collection.insertOne({
      _id: new Types.ObjectId(),
      pod_title: 'Jam',
      pod_date_time: new Date('2025-06-01T00:00:00Z'),
      product_requests: [{ product_id: productId, unit_cost: 100, quantity: 2, total_cost: 200 }],
    } as never);

    const result = await partnerDashboardService.get(ownerId, { from: '2020-01-01', to: '2030-01-01' });
    // Gross ₹200 minus the 20% product commission = ₹160 net earning.
    expect(result.products.product_earning).toBe(160);
    expect(result.summary.product_earning).toBe(160);
  });

  it('bases venue earning on the pod date, not the release review date', async () => {
    const ownerId = new Types.ObjectId().toString();
    const venue = await VenueModel.create({
      owner_user_id: ownerId,
      status: 'APPROVED',
      is_active: true,
      venue_name: 'Hall',
    });
    const inRangePod = new Types.ObjectId();
    const outOfRangePod = new Types.ObjectId();
    await PodModel.collection.insertMany([
      { _id: inRangePod, club_id: new Types.ObjectId(), pod_title: 'June pod', pod_date_time: new Date('2025-06-15T00:00:00Z'), venue_id: venue._id },
      { _id: outOfRangePod, club_id: new Types.ObjectId(), pod_title: 'Aug pod', pod_date_time: new Date('2025-08-15T00:00:00Z'), venue_id: venue._id },
    ] as never);
    await PaymentReleaseModel.create([
      // Pod is in range → counted.
      {
        release_id: 'REL-IN', kind: 'VENUE_BILLING', status: 'APPROVED', pod_id: inRangePod, pod_title: 'June pod',
        venue_id: venue._id, beneficiary_name: 'V', beneficiary_email: 'v@x.io', amount_requested: 500, approved_amount: 500,
        reviewed_at: new Date('2025-06-20T00:00:00Z'),
      },
      // Pod is OUT of range but the release was reviewed inside the window — must
      // NOT be counted under the pod-date basis (the bug being fixed).
      {
        release_id: 'REL-OUT', kind: 'VENUE_BILLING', status: 'APPROVED', pod_id: outOfRangePod, pod_title: 'Aug pod',
        venue_id: venue._id, beneficiary_name: 'V', beneficiary_email: 'v@x.io', amount_requested: 999, approved_amount: 999,
        reviewed_at: new Date('2025-06-20T00:00:00Z'),
      },
    ]);

    const result = await partnerDashboardService.get(ownerId, { from: '2025-06-01', to: '2025-06-30' });
    expect(result.summary.venue_earning).toBe(500);
    expect(result.venue.venue_earning).toBe(500);
    expect(result.summary.total_earning).toBe(500);
  });

  it('counts a settled release even after its pod is reassigned to another venue', async () => {
    const ownerId = new Types.ObjectId().toString();
    const myVenue = await VenueModel.create({
      owner_user_id: ownerId,
      status: 'APPROVED',
      is_active: true,
      venue_name: 'Mine',
    });
    const reassignedPod = new Types.ObjectId();
    // The pod now points at a DIFFERENT (not-owned) venue, but the release was
    // stamped with myVenue as the beneficiary — the earning must still count.
    await PodModel.collection.insertOne({
      _id: reassignedPod, club_id: new Types.ObjectId(), pod_title: 'Reassigned',
      pod_date_time: new Date('2025-06-15T00:00:00Z'), venue_id: new Types.ObjectId(),
    } as never);
    await PaymentReleaseModel.create({
      release_id: 'REL-REASSIGN', kind: 'VENUE_BILLING', status: 'APPROVED', pod_id: reassignedPod,
      pod_title: 'Reassigned', venue_id: myVenue._id, beneficiary_name: 'V', beneficiary_email: 'v@x.io',
      amount_requested: 300, approved_amount: 300,
    });

    const result = await partnerDashboardService.get(ownerId, { from: '2025-06-01', to: '2025-06-30' });
    expect(result.summary.venue_earning).toBe(300);
  });
});
