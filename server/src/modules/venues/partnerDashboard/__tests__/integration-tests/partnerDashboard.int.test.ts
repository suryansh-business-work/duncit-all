import { Types } from 'mongoose';
import { partnerDashboardService } from '../../partnerDashboard.service';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';

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
});
