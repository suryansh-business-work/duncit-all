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

  it('stores a per-slot price and exposes it (defaulting to 0)', async () => {
    const venueId = await seedVenue();
    const created = await venueSlotService.create(ownerId, {
      venue_id: venueId,
      slots: [
        { start_at: inDays(3), end_at: inDays(3.1), price: 500 },
        { start_at: inDays(4), end_at: inDays(4.1) },
      ],
    });
    const byStart = [...created].sort((a, b) => a.start_at.localeCompare(b.start_at));
    expect(byStart[0].price).toBe(500);
    expect(byStart[1].price).toBe(0);
  });

  it('updates a slot price and rejects a negative price', async () => {
    const venueId = await seedVenue();
    const [slot] = await venueSlotService.create(ownerId, {
      venue_id: venueId,
      slots: [{ start_at: inDays(5), end_at: inDays(5.1), price: 100 }],
    });
    const updated = await venueSlotService.update(ownerId, slot.id, { price: 250 });
    expect(updated.price).toBe(250);
    await expect(
      venueSlotService.update(ownerId, slot.id, { price: -5 })
    ).rejects.toThrow(/0 or more/i);
    await expect(
      venueSlotService.update(ownerId, slot.id, { price: 1_000_001 })
    ).rejects.toThrow(/or less/i);
  });

  it('rejects slots scheduled more than 60 days ahead', async () => {
    const venueId = await seedVenue();
    await expect(
      venueSlotService.create(ownerId, { venue_id: venueId, slots: [{ start_at: inDays(61), end_at: inDays(61.1) }] })
    ).rejects.toThrow(/60 days/i);
  });
});
