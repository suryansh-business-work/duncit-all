import { Types } from 'mongoose';
import { venueSlotService } from '../../venueSlot.service';
import { venueSlotResolvers } from '../../venueSlot.resolver';
import { makeContext } from '@test/harness';

describe('venueSlot unit', () => {
  it('create rejects an invalid venue id', async () => {
    await expect(
      venueSlotService.create(new Types.ObjectId().toString(), { venue_id: 'bad', slots: [] })
    ).rejects.toThrow(/invalid venue_id/i);
  });

  it('listAvailable rejects an invalid venue id', async () => {
    await expect(venueSlotService.listAvailable('bad')).rejects.toThrow(/invalid venue_id/i);
  });

  it('venueSlots query requires authentication', () => {
    expect(() =>
      (venueSlotResolvers.Query as any).venueSlots({}, { venue_id: 'x' }, makeContext(null))
    ).toThrow(/not authenticated/i);
  });

  it('admin slot operations are role-gated (reject anonymous callers)', () => {
    const anon = makeContext(null);
    expect(() =>
      (venueSlotResolvers.Query as any).adminVenueSlots({}, { venue_id: 'x' }, anon)
    ).toThrow();
    expect(() =>
      (venueSlotResolvers.Mutation as any).adminCreateVenueSlots({}, { input: {} }, anon)
    ).toThrow();
    expect(() =>
      (venueSlotResolvers.Mutation as any).adminUpdateVenueSlot({}, { slot_id: 'x', input: {} }, anon)
    ).toThrow();
    expect(() =>
      (venueSlotResolvers.Mutation as any).adminDeleteVenueSlot({}, { slot_id: 'x' }, anon)
    ).toThrow();
  });

  it('admin create rejects an invalid venue id', async () => {
    await expect(
      venueSlotService.adminCreate({ venue_id: 'bad', slots: [] })
    ).rejects.toThrow(/invalid venue_id/i);
  });

  it('admin list rejects an invalid venue id', async () => {
    await expect(venueSlotService.adminListForVenue('bad')).rejects.toThrow(/invalid venue_id/i);
  });

  it('admin update + delete reject an invalid slot id', async () => {
    await expect(venueSlotService.adminUpdate('bad', {})).rejects.toThrow(/invalid slot_id/i);
    await expect(venueSlotService.adminRemove('bad')).rejects.toThrow(/invalid slot_id/i);
  });
});
