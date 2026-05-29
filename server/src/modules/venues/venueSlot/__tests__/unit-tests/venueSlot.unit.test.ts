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
});
