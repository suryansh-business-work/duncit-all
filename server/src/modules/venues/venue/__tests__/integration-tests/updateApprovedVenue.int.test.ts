import { Types } from 'mongoose';
import { venueService } from '../../venue.service';
import { VenueModel } from '../../venue.model';
import { partnerDashboardService } from '@modules/venues/partnerDashboard/partnerDashboard.service';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';

const ownerId = new Types.ObjectId().toString();
const inDays = (d: number) => new Date(Date.now() + d * 86_400_000);

async function seedApprovedVenue(over: Record<string, unknown> = {}) {
  const v = await VenueModel.create({
    owner_user_id: ownerId,
    status: 'APPROVED',
    is_active: true,
    venue_name: 'Hall',
    description: 'Old description',
    capacity: 50,
    capacity_items: [{ label: 'Main hall', capacity: 50 }],
    documents: [{ type: 'GST Certificate', url: 'https://x/gst.pdf', uploaded_at: new Date() }],
    ...over,
  });
  return String(v._id);
}

describe('updateApprovedVenue (owner edit of an approved venue)', () => {
  it('updates only the whitelisted fields and appends documents', async () => {
    const venueId = await seedApprovedVenue();
    const updated = await venueService.updateApproved(ownerId, venueId, {
      description: 'New description',
      gallery: ['https://x/1.jpg'],
      capacity_items: [
        { label: 'Main hall', capacity: 80 },
        { label: 'Terrace', capacity: 20 },
      ],
      add_documents: [{ type: 'Trade License', url: 'https://x/license.pdf' }],
      owner_phone: '+919999999999',
    });

    expect(updated.description).toBe('New description');
    expect(updated.gallery).toEqual(['https://x/1.jpg']);
    expect(updated.capacity).toBe(100);
    expect(updated.capacity_items).toHaveLength(2);
    // Existing document preserved, new one appended — never replaced.
    expect(updated.documents.map((d: any) => d.type)).toEqual(['GST Certificate', 'Trade License']);
    expect(updated.owner_phone).toBe('+919999999999');
    expect(updated.status).toBe('APPROVED');
  });

  it('rejects non-approved venues and foreign owners', async () => {
    const draftId = await seedApprovedVenue({ status: 'DRAFT' });
    await expect(
      venueService.updateApproved(ownerId, draftId, { description: 'x' })
    ).rejects.toThrow(/only approved venues/i);

    const venueId = await seedApprovedVenue();
    await expect(
      venueService.updateApproved(new Types.ObjectId().toString(), venueId, { description: 'x' })
    ).rejects.toThrow(/not your venue/i);
  });

  it('refuses an empty capacity list', async () => {
    const venueId = await seedApprovedVenue();
    await expect(
      venueService.updateApproved(ownerId, venueId, { capacity_items: [] })
    ).rejects.toThrow(/at least one capacity/i);
  });
});

describe('venueRegistrationConfig catalogs', () => {
  it('serves amenities, facilities and security lists', () => {
    const config = venueService.registrationConfig();
    expect(config.amenities.length).toBeGreaterThan(0);
    expect(config.facilities.length).toBeGreaterThan(0);
    expect(config.security.length).toBeGreaterThan(0);
  });
});

describe('venueOwnerStats', () => {
  it('aggregates capacity and upcoming slot value per scope', async () => {
    const venueA = await seedApprovedVenue();
    const venueB = await seedApprovedVenue({ capacity: 30, capacity_items: [{ label: 'Room', capacity: 30 }] });

    await VenueSlotModel.create([
      { venue_id: venueA, owner_user_id: ownerId, start_at: inDays(1), end_at: inDays(1.05), price: 100, status: 'AVAILABLE' },
      { venue_id: venueA, owner_user_id: ownerId, start_at: inDays(2), end_at: inDays(2.05), price: 300, status: 'BOOKED' },
      { venue_id: venueB, owner_user_id: ownerId, start_at: inDays(3), end_at: inDays(3.05), price: 50, status: 'PENDING' },
      // Past slot — never counted.
      { venue_id: venueB, owner_user_id: ownerId, start_at: inDays(-2), end_at: inDays(-1.9), price: 999, status: 'AVAILABLE' },
    ]);

    const all = await partnerDashboardService.venueStats(ownerId);
    expect(all.total_venues).toBe(2);
    expect(all.approved_venues).toBe(2);
    expect(all.total_capacity).toBe(80);
    expect(all.potential_earning).toBe(450);
    expect(all.booked_earning).toBe(300);
    expect(all.upcoming_slots).toBe(3);
    expect(all.booked_slots).toBe(1);
    expect(all.pending_requests).toBe(1);

    const onlyB = await partnerDashboardService.venueStats(ownerId, venueB);
    expect(onlyB.total_venues).toBe(1);
    expect(onlyB.total_capacity).toBe(30);
    expect(onlyB.potential_earning).toBe(50);

    await expect(
      partnerDashboardService.venueStats(new Types.ObjectId().toString(), venueB)
    ).rejects.toThrow(/not found or not yours/i);
  });
});
