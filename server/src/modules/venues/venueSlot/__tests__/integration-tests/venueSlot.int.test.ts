import { Types } from 'mongoose';
import { venueSlotService } from '../../venueSlot.service';
import { VenueModel } from '@modules/venues/venue/venue.model';

const ownerId = new Types.ObjectId().toString();
const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

async function seedVenue() {
  const v = await VenueModel.create({ owner_user_id: ownerId, status: 'APPROVED', is_active: true, venue_name: 'Hall' });
  return String(v._id);
}

describe('venueSlotService integration', () => {
  it('creates slots and lists them for the owner and as available', async () => {
    const venueId = await seedVenue();
    const created = await venueSlotService.create(ownerId, {
      venue_id: venueId,
      slots: [{ start_at: inDays(1), end_at: inDays(1.1) }],
    });
    expect(created).toHaveLength(1);
    expect(created[0].status).toBe('AVAILABLE');

    expect(await venueSlotService.listForVenue(ownerId, venueId)).toHaveLength(1);
    expect(await venueSlotService.listAvailable(venueId)).toHaveLength(1);
  });

  it('rejects empty slot lists and past windows', async () => {
    const venueId = await seedVenue();
    await expect(venueSlotService.create(ownerId, { venue_id: venueId, slots: [] })).rejects.toThrow(/at least one slot/i);
    await expect(
      venueSlotService.create(ownerId, { venue_id: venueId, slots: [{ start_at: inDays(-2), end_at: inDays(-1) }] })
    ).rejects.toThrow(/in the past/i);
  });

  it('rejects overlapping slots', async () => {
    const venueId = await seedVenue();
    await venueSlotService.create(ownerId, { venue_id: venueId, slots: [{ start_at: inDays(2), end_at: inDays(2.2) }] });
    await expect(
      venueSlotService.create(ownerId, { venue_id: venueId, slots: [{ start_at: inDays(2.1), end_at: inDays(2.3) }] })
    ).rejects.toThrow();
  });

  it('forbids a non-owner from listing all slots', async () => {
    const venueId = await seedVenue();
    await expect(
      venueSlotService.listForVenue(new Types.ObjectId().toString(), venueId)
    ).rejects.toThrow(/only the venue owner/i);
  });
});
