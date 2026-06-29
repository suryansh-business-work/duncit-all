import { Types } from 'mongoose';
import { autoExtendService } from '../../autoExtend.service';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { SlotTemplateModel } from '@modules/venues/slotTemplate/slotTemplate.model';
import { venueSlotService } from '@modules/venues/venueSlot/venueSlot.service';

const ownerId = new Types.ObjectId().toString();

async function seedTemplate(over: Record<string, unknown> = {}) {
  return SlotTemplateModel.create({
    owner_user_id: new Types.ObjectId(ownerId),
    name: 'Daily 1pm',
    is_default: true,
    config: {
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      start_time: '13:00',
      end_time: '14:00',
      default_price: 399,
      per_day_price: [],
      skip_weekly_off: false,
      skip_holidays: false,
    },
    ...over,
  });
}

async function seedVenue(autoExtend: Record<string, unknown>, over: Record<string, unknown> = {}) {
  const v = await VenueModel.create({
    owner_user_id: ownerId,
    status: 'APPROVED',
    is_active: true,
    venue_name: 'Hall',
    settings: { auto_extend: autoExtend },
    ...over,
  });
  return String(v._id);
}

describe('autoExtendService integration', () => {
  it('rolls the default template forward up to the horizon and is idempotent', async () => {
    await seedTemplate();
    const venueId = await seedVenue({ enabled: true, horizon_days: 10 });

    const created = await autoExtendService.runForVenue(venueId);
    expect(created).toBeGreaterThanOrEqual(9);
    expect(created).toBeLessThanOrEqual(11);

    // Re-running creates nothing new (overlaps are skipped).
    expect(await autoExtendService.runForVenue(venueId)).toBe(0);
    const after = await venueSlotService.listForVenue(ownerId, venueId);
    expect(after.length).toBe(created);
  });

  it('caps generation at the `until` date', async () => {
    await seedTemplate();
    const until = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const venueId = await seedVenue({ enabled: true, horizon_days: 30, until });

    const created = await autoExtendService.runForVenue(venueId);
    expect(created).toBeGreaterThan(0);
    expect(created).toBeLessThanOrEqual(4);
  });

  it('does nothing when disabled, not approved, or without a template', async () => {
    await seedTemplate();
    const disabled = await seedVenue({ enabled: false, horizon_days: 10 });
    expect(await autoExtendService.runForVenue(disabled)).toBe(0);

    const notApproved = await seedVenue({ enabled: true, horizon_days: 10 }, { status: 'SUBMITTED' });
    expect(await autoExtendService.runForVenue(notApproved)).toBe(0);

    // Different owner with no default template → nothing to roll forward.
    const otherOwner = new Types.ObjectId().toString();
    const orphan = await VenueModel.create({
      owner_user_id: otherOwner,
      status: 'APPROVED',
      is_active: true,
      venue_name: 'Orphan',
      settings: { auto_extend: { enabled: true, horizon_days: 10 } },
    });
    expect(await autoExtendService.runForVenue(String(orphan._id))).toBe(0);
  });

  it('runAll sweeps only enabled+approved+active venues', async () => {
    await seedTemplate();
    await seedVenue({ enabled: true, horizon_days: 7 });
    await seedVenue({ enabled: false, horizon_days: 7 });

    const res = await autoExtendService.runAll();
    expect(res.venues).toBe(1);
    expect(res.created).toBeGreaterThan(0);
  });
});
