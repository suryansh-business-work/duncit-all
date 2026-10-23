/**
 * The booking a Pod Request holds: let go only by its own request (a window
 * proposed for the request is deleted, a published slot picked before goes
 * back on sale), handed to the pod in one write, and visible among the venue's
 * open slots only to that request's host once both sides confirmed it.
 * Proposing the window itself is covered with the request service.
 */
import { Types } from 'mongoose';
import { makeContext } from '@test/harness';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { PodPartnerRequestModel } from '@modules/venues/podPartnerRequest/podPartnerRequest.model';
import { VenueSlotModel } from '../../venueSlot.model';
import { venueSlotService } from '../../venueSlot.service';
import { venueSlotResolvers } from '../../venueSlot.resolver';
import {
  heldRequestFor,
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

/** The slot held under the request, as a proposal or an earlier pick left it. */
async function holdFor(slotId: string, requestId: string) {
  await VenueSlotModel.updateOne(
    { _id: slotId },
    { $set: { status: 'BOOKED', booked_by_partner_request_id: new Types.ObjectId(requestId) } }
  );
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

describe('releasePartnerRequestSlot', () => {
  it('deletes a window proposed for the request, never freeing it for sale', async () => {
    const requestId = newId();
    const slotId = await seedSlot({ requested_by_host: true });
    await holdFor(slotId, requestId);

    await releasePartnerRequestSlot(slotId, newId());
    expect(await VenueSlotModel.findById(slotId).lean()).toMatchObject({ status: 'BOOKED' });

    await releasePartnerRequestSlot(slotId, requestId);
    expect(await VenueSlotModel.findById(slotId).lean()).toBeNull();
  });

  it("frees a published slot the request picked before, and nothing held by anyone else", async () => {
    const requestId = newId();
    const slotId = await seedSlot();
    await holdFor(slotId, requestId);

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
    await holdFor(slotId, requestId);

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
    await holdFor(heldSlot, requestId);
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
