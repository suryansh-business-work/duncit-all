import { Types } from 'mongoose';
import { venueSlotService } from '../../venueSlot.service';
import { VenueSlotModel } from '../../venueSlot.model';
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

  it('allows two different spaces to share a time window but rejects same-space overlap', async () => {
    const venueId = await seedVenue();
    const created = await venueSlotService.create(ownerId, {
      venue_id: venueId,
      slots: [
        { start_at: inDays(2), end_at: inDays(2.1), price: 899, space_label: 'Banquet hall', capacity: 120 },
        { start_at: inDays(2), end_at: inDays(2.1), price: 499, space_label: 'Rooftop', capacity: 40 },
      ],
    });
    expect(created).toHaveLength(2);
    const banquet = created.find((s) => s.space_label === 'Banquet hall');
    expect(banquet?.capacity).toBe(120);
    expect(banquet?.price).toBe(899);

    // A third slot overlapping the SAME space (Rooftop) is rejected...
    await expect(
      venueSlotService.create(ownerId, {
        venue_id: venueId,
        slots: [{ start_at: inDays(2.05), end_at: inDays(2.15), space_label: 'Rooftop', capacity: 40 }],
      })
    ).rejects.toThrow(/overlaps/i);
    // ...while a new space at the same time is allowed.
    const lawn = await venueSlotService.create(ownerId, {
      venue_id: venueId,
      slots: [{ start_at: inDays(2), end_at: inDays(2.1), space_label: 'Lawn', capacity: 200 }],
    });
    expect(lawn).toHaveLength(1);
  });

  it('defaults space_label to "" and capacity to 0 for whole-venue slots', async () => {
    const venueId = await seedVenue();
    const [slot] = await venueSlotService.create(ownerId, {
      venue_id: venueId,
      slots: [{ start_at: inDays(5), end_at: inDays(5.1) }],
    });
    expect(slot.space_label).toBe('');
    expect(slot.capacity).toBe(0);
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

  it('honors a venue-configured advance cap above the default 60', async () => {
    const v = await VenueModel.create({
      owner_user_id: ownerId,
      status: 'APPROVED',
      is_active: true,
      venue_name: 'Hall',
      settings: { rules: { max_advance_days: 90 } },
    });
    const venueId = String(v._id);
    const created = await venueSlotService.create(ownerId, {
      venue_id: venueId,
      slots: [{ start_at: inDays(75), end_at: inDays(75.1) }],
    });
    expect(created).toHaveLength(1);
    await expect(
      venueSlotService.create(ownerId, { venue_id: venueId, slots: [{ start_at: inDays(91), end_at: inDays(91.1) }] })
    ).rejects.toThrow(/90 days/i);
  });

  it('createSkippingOverlaps drops past, beyond-cap and overlapping slots', async () => {
    const venueId = await seedVenue();
    await venueSlotService.create(ownerId, { venue_id: venueId, slots: [{ start_at: inDays(3), end_at: inDays(3.1) }] });
    const n = await venueSlotService.createSkippingOverlaps(
      venueId,
      ownerId,
      [
        { start_at: inDays(-1), end_at: inDays(-0.9) }, // past → dropped
        { start_at: inDays(3.05), end_at: inDays(3.15) }, // overlaps existing → dropped
        { start_at: inDays(70), end_at: inDays(70.1) }, // beyond the 60-day cap → dropped
        { start_at: inDays(5), end_at: inDays(5.1) }, // ok
      ],
      60
    );
    expect(n).toBe(1);
    expect(await venueSlotService.listForVenue(ownerId, venueId)).toHaveLength(2);
  });

  it('bulk-deletes upcoming non-booked slots but never booked ones', async () => {
    const venueId = await seedVenue();
    await venueSlotService.create(ownerId, {
      venue_id: venueId,
      slots: [
        { start_at: inDays(1), end_at: inDays(1.1) },
        { start_at: inDays(2), end_at: inDays(2.1) },
      ],
    });
    const slots = await venueSlotService.listForVenue(ownerId, venueId);
    await VenueSlotModel.updateOne({ _id: slots[0].id }, { $set: { status: 'BOOKED' } });

    const res = await venueSlotService.bulkDelete(ownerId, { venue_id: venueId });
    expect(res.matched).toBe(1);
    expect(res.affected).toBe(1);
    const left = await venueSlotService.listForVenue(ownerId, venueId);
    expect(left).toHaveLength(1);
    expect(left[0].status).toBe('BOOKED');
  });

  it('bulk-sets price and toggles block on matching slots', async () => {
    const venueId = await seedVenue();
    await venueSlotService.create(ownerId, {
      venue_id: venueId,
      slots: [
        { start_at: inDays(3), end_at: inDays(3.1), price: 100 },
        { start_at: inDays(4), end_at: inDays(4.1), price: 200 },
      ],
    });
    const priced = await venueSlotService.bulkUpdate(ownerId, { venue_id: venueId, set_price: 777 });
    expect(priced.affected).toBe(2);
    expect((await venueSlotService.listForVenue(ownerId, venueId)).every((s) => s.price === 777)).toBe(true);

    const blocked = await venueSlotService.bulkUpdate(ownerId, { venue_id: venueId, block: true });
    expect(blocked.affected).toBe(2);
    expect(
      (await venueSlotService.listForVenue(ownerId, venueId)).every((s) => s.status === 'BLOCKED')
    ).toBe(true);

    await expect(venueSlotService.bulkUpdate(ownerId, { venue_id: venueId })).rejects.toThrow(/no bulk update/i);
  });

  it('bulk time-shift skips slots that would collide', async () => {
    const venueId = await seedVenue();
    const base = new Date(Date.now() + 10 * 86_400_000);
    base.setHours(10, 0, 0, 0);
    const hour = 3_600_000;
    await venueSlotService.create(ownerId, {
      venue_id: venueId,
      slots: [
        { start_at: new Date(base).toISOString(), end_at: new Date(base.getTime() + hour).toISOString() },
        { start_at: new Date(base.getTime() + hour).toISOString(), end_at: new Date(base.getTime() + 2 * hour).toISOString() },
      ],
    });
    const slots = await venueSlotService.listForVenue(ownerId, venueId);
    // Book the earlier slot (10–11) so it is excluded yet still blocks the shift.
    await VenueSlotModel.updateOne({ _id: slots[0].id }, { $set: { status: 'BOOKED' } });
    // Shifting the later slot (11–12) back an hour → 10–11, which collides with the booked one.
    const res = await venueSlotService.bulkUpdate(ownerId, { venue_id: venueId, shift_minutes: -60 });
    expect(res.matched).toBe(1);
    expect(res.affected).toBe(0);
    expect(res.skipped).toBe(1);
  });
});
