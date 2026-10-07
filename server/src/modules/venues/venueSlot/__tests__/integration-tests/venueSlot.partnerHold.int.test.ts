/**
 * The slot a Pod Request holds: taken AVAILABLE → BOOKED in one conditional
 * write (refused when taken, started, on a venue holiday, or lost to a race),
 * freed only by its own request, handed to the pod in one write, and visible
 * among the venue's open slots only to that request's host once both sides
 * confirmed it.
 */
import { Types } from 'mongoose';
import { makeContext } from '@test/harness';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { venueLocalYmd } from '@modules/venues/autoExtend/slotGenerator';
import { PodPartnerRequestModel } from '@modules/venues/podPartnerRequest/podPartnerRequest.model';
import { VenueSlotModel } from '../../venueSlot.model';
import { venueSlotService } from '../../venueSlot.service';
import { venueSlotResolvers } from '../../venueSlot.resolver';
import {
  heldRequestFor,
  holdSlotForPartnerRequest,
  releasePartnerRequestSlot,
  transferPartnerRequestHold,
} from '../../venueSlot.partnerHold';

const ownerId = new Types.ObjectId().toString();
const hostId = new Types.ObjectId().toString();
const inDays = (d: number) => new Date(Date.now() + d * 86_400_000);
const newId = () => new Types.ObjectId().toString();

const codeOf = async (run: Promise<unknown>) => {
  try {
    await run;
    return 'OK';
  } catch (err) {
    return (err as { extensions?: { code?: string } }).extensions?.code ?? 'THROWN';
  }
};

let venueId: string;

async function seedSlot(over: Record<string, unknown> = {}) {
  const slot = await VenueSlotModel.create({
    venue_id: new Types.ObjectId(venueId),
    owner_user_id: new Types.ObjectId(ownerId),
    start_at: inDays(3),
    end_at: inDays(3.1),
    price: 400,
    status: 'AVAILABLE',
    ...over,
  });
  return String(slot._id);
}

async function seedRequest(status: string, host = hostId) {
  const doc = await PodPartnerRequestModel.create({
    direction: 'HOST_TO_VENUE',
    venue_id: venueId,
    venue_owner_user_id: ownerId,
    host_user_id: host,
    status,
  });
  return String(doc._id);
}

beforeEach(async () => {
  const venue = await VenueModel.create({ owner_user_id: ownerId, status: 'APPROVED', is_active: true, venue_name: 'Hold Hall' });
  venueId = String(venue._id);
});

describe('holdSlotForPartnerRequest', () => {
  it('books an open slot under the request', async () => {
    const slotId = await seedSlot();
    const requestId = newId();
    const held = await holdSlotForPartnerRequest(slotId, venueId, requestId);
    expect(held).toMatchObject({ status: 'BOOKED' });
    expect(String(held.booked_by_partner_request_id)).toBe(requestId);
    expect(await VenueSlotModel.findById(slotId).lean()).toMatchObject({ status: 'BOOKED' });
  });

  it('refuses a malformed slot id', async () => {
    expect(await codeOf(holdSlotForPartnerRequest('nope', venueId, newId()))).toBe('BAD_USER_INPUT');
  });

  it('refuses a missing slot, a slot of another venue, and one that is not AVAILABLE', async () => {
    expect(await codeOf(holdSlotForPartnerRequest(newId(), venueId, newId()))).toBe('CONFLICT');
    const slotId = await seedSlot();
    expect(await codeOf(holdSlotForPartnerRequest(slotId, newId(), newId()))).toBe('CONFLICT');
    const booked = await seedSlot({ status: 'BOOKED' });
    await expect(holdSlotForPartnerRequest(booked, venueId, newId())).rejects.toThrow('This slot is no longer available. Pick another slot.');
  });

  it('refuses a slot that has already started', async () => {
    const started = await seedSlot({ start_at: inDays(-0.01), end_at: inDays(0.1) });
    await expect(holdSlotForPartnerRequest(started, venueId, newId())).rejects.toThrow('This slot has already started. Pick a later one.');
  });

  it("refuses a slot on one of the venue's holidays, leaving it open", async () => {
    const start = inDays(5);
    const slotId = await seedSlot({ start_at: start, end_at: inDays(5.1) });
    await VenueModel.updateOne({ _id: venueId }, { $set: { 'settings.holidays': [venueLocalYmd(start)] } });
    await expect(holdSlotForPartnerRequest(slotId, venueId, newId())).rejects.toThrow(
      'The venue is on leave on this date. Pick another slot.'
    );
    expect(await VenueSlotModel.findById(slotId).lean()).toMatchObject({ status: 'AVAILABLE' });
  });

  it('lets only one of two concurrent holds win the slot', async () => {
    const slotId = await seedSlot();
    const results = await Promise.allSettled([
      holdSlotForPartnerRequest(slotId, venueId, newId()),
      holdSlotForPartnerRequest(slotId, venueId, newId()),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const lost = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(lost.reason.extensions.code).toBe('CONFLICT');
  });
});

describe('releasePartnerRequestSlot', () => {
  it("frees the request's own hold and nothing held by anyone else", async () => {
    const requestId = newId();
    const slotId = await seedSlot();
    await holdSlotForPartnerRequest(slotId, venueId, requestId);

    await releasePartnerRequestSlot(slotId, newId());
    expect(await VenueSlotModel.findById(slotId).lean()).toMatchObject({ status: 'BOOKED' });

    await releasePartnerRequestSlot(slotId, requestId);
    expect(await VenueSlotModel.findById(slotId).lean()).toMatchObject({ status: 'AVAILABLE', booked_by_partner_request_id: null });
  });
});

describe('transferPartnerRequestHold', () => {
  it('hands the hold to the pod, approved, in one write', async () => {
    const requestId = newId();
    const podId = newId();
    const slotId = await seedSlot();
    await holdSlotForPartnerRequest(slotId, venueId, requestId);

    await transferPartnerRequestHold(slotId, requestId, podId);
    const slot = await VenueSlotModel.findById(slotId).lean();
    expect(slot).toMatchObject({ status: 'BOOKED', booked_by_partner_request_id: null, decision: 'APPROVED' });
    expect(String(slot?.booked_by_pod_id)).toBe(podId);
    expect(String(slot?.decided_pod_id)).toBe(podId);
    expect(slot?.decided_at).toBeInstanceOf(Date);
  });

  it('refuses when the slot is not held for that request', async () => {
    const slotId = await seedSlot();
    expect(await codeOf(transferPartnerRequestHold(slotId, newId(), newId()))).toBe('CONFLICT');
    expect(await VenueSlotModel.findById(slotId).lean()).toMatchObject({ status: 'AVAILABLE', booked_by_pod_id: null });
  });
});

describe('heldRequestFor', () => {
  it("returns the request id only for the request's own host at SLOT_CONFIRMED", async () => {
    const confirmed = await seedRequest('SLOT_CONFIRMED');
    const requested = await seedRequest('SLOT_REQUESTED', newId());
    expect(await heldRequestFor(hostId, confirmed)).toBe(confirmed);
    expect(await heldRequestFor(ownerId, confirmed)).toBeNull();
    expect(await heldRequestFor(newId(), requested)).toBeNull();
    expect(await heldRequestFor(hostId, newId())).toBeNull();
  });

  it('returns null for malformed ids without a lookup', async () => {
    const exists = jest.spyOn(PodPartnerRequestModel, 'exists');
    expect(await heldRequestFor(hostId, 'nope')).toBeNull();
    expect(await heldRequestFor('nope', newId())).toBeNull();
    expect(exists).not.toHaveBeenCalled();
    exists.mockRestore();
  });
});

describe('venueAvailableSlots with a Pod Request', () => {
  const listed = (slots: { id: string }[]) => slots.map((s) => s.id);
  const query = venueSlotResolvers.Query.venueAvailableSlots;

  async function heldForConfirmed() {
    const requestId = await seedRequest('SLOT_CONFIRMED');
    const heldSlot = await seedSlot({ start_at: inDays(2), end_at: inDays(2.1) });
    await holdSlotForPartnerRequest(heldSlot, venueId, requestId);
    const openSlot = await seedSlot({ start_at: inDays(4), end_at: inDays(4.1) });
    await seedSlot({ start_at: inDays(6), end_at: inDays(6.1), status: 'BOOKED' });
    return { requestId, heldSlot, openSlot };
  }

  it("lists the request's held slot alongside the open ones, in time order", async () => {
    const { requestId, heldSlot, openSlot } = await heldForConfirmed();
    expect(listed(await venueSlotService.listAvailable(venueId, null, requestId))).toEqual([heldSlot, openSlot]);
    expect(listed(await venueSlotService.listAvailable(venueId))).toEqual([openSlot]);
  });

  it("shows the held slot to the request's host only, through the resolver", async () => {
    const { requestId, heldSlot, openSlot } = await heldForConfirmed();
    const asHost = await query(null, { venue_id: venueId, partner_request_id: requestId }, makeContext({ id: hostId }));
    expect(listed(asHost)).toEqual([heldSlot, openSlot]);
    const asStranger = await query(null, { venue_id: venueId, partner_request_id: requestId }, makeContext({ id: newId() }));
    expect(listed(asStranger)).toEqual([openSlot]);
    const plain = await query(null, { venue_id: venueId }, makeContext({ id: hostId }));
    expect(listed(plain)).toEqual([openSlot]);
  });
});
