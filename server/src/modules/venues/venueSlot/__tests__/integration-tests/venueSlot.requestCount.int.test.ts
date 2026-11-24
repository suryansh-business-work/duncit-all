/**
 * The Partners console's sidebar badge on Workshop & Event Requests: how many
 * booking requests wait on the venue owner's answer. It must never count a
 * request the owner cannot act on, and never count someone else's.
 */
import { Types } from 'mongoose';
import { venueSlotService } from '../../venueSlot.service';
import { VenueSlotModel } from '../../venueSlot.model';
import { VenueModel } from '@modules/venues/venue/venue.model';

const ownerId = new Types.ObjectId().toString();
const otherOwnerId = new Types.ObjectId().toString();
const inDays = (d: number) => new Date(Date.now() + d * 86_400_000);

async function seedVenue(owner = ownerId) {
  const v = await VenueModel.create({ owner_user_id: owner, status: 'APPROVED', is_active: true, venue_name: 'Test Pay' });
  return String(v._id);
}

interface RequestSeed {
  venueId: string;
  days?: number;
  owner?: string;
  status?: 'PENDING' | 'BOOKED' | 'AVAILABLE';
  pod?: boolean;
  /** The offer's status, written raw: only whose move it is matters here. */
  offerStatus?: 'SENT' | 'COUNTERED' | 'ACCEPTED' | 'REJECTED';
}

async function seedRequest({ venueId, days = 3, owner = ownerId, status = 'PENDING', pod = true, offerStatus }: RequestSeed) {
  const slot = await VenueSlotModel.create({
    venue_id: new Types.ObjectId(venueId),
    owner_user_id: new Types.ObjectId(owner),
    start_at: inDays(days),
    end_at: inDays(days + 0.05),
    price: 599,
    status,
    booked_by_pod_id: pod ? new Types.ObjectId() : null,
  });
  if (offerStatus) {
    await VenueSlotModel.collection.updateOne({ _id: slot._id }, { $set: { offer: { status: offerStatus } } });
  }
  return String(slot._id);
}

describe('venueSlotService.countAwaitingRequests', () => {
  it('is zero for an owner with nothing to answer', async () => {
    await expect(venueSlotService.countAwaitingRequests(ownerId)).resolves.toBe(0);
  });

  it('counts a host offer the venue has not answered, and an old request with no offer', async () => {
    const venueId = await seedVenue();
    await seedRequest({ venueId, offerStatus: 'SENT' });
    await seedRequest({ venueId });

    await expect(venueSlotService.countAwaitingRequests(ownerId)).resolves.toBe(2);
  });

  it('leaves out a counter the venue sent, which waits on the host', async () => {
    const venueId = await seedVenue();
    await seedRequest({ venueId, offerStatus: 'COUNTERED' });
    await seedRequest({ venueId, offerStatus: 'SENT' });

    await expect(venueSlotService.countAwaitingRequests(ownerId)).resolves.toBe(1);
  });

  it('leaves out a request whose slot has already begun', async () => {
    const venueId = await seedVenue();
    await seedRequest({ venueId, days: -1, offerStatus: 'SENT' });

    await expect(venueSlotService.countAwaitingRequests(ownerId)).resolves.toBe(0);
  });

  it('leaves out booked slots and pending slots with no pod on them', async () => {
    const venueId = await seedVenue();
    await seedRequest({ venueId, status: 'BOOKED', offerStatus: 'ACCEPTED' });
    await seedRequest({ venueId, pod: false });

    await expect(venueSlotService.countAwaitingRequests(ownerId)).resolves.toBe(0);
  });

  it('never counts another owner’s requests', async () => {
    const theirs = await seedVenue(otherOwnerId);
    await seedRequest({ venueId: theirs, owner: otherOwnerId, offerStatus: 'SENT' });

    await expect(venueSlotService.countAwaitingRequests(ownerId)).resolves.toBe(0);
    await expect(venueSlotService.countAwaitingRequests(otherOwnerId)).resolves.toBe(1);
  });

  it('narrows to one venue when asked', async () => {
    const first = await seedVenue();
    const second = await seedVenue();
    await seedRequest({ venueId: first, offerStatus: 'SENT' });
    await seedRequest({ venueId: second, offerStatus: 'SENT' });
    await seedRequest({ venueId: second });

    await expect(venueSlotService.countAwaitingRequests(ownerId, first)).resolves.toBe(1);
    await expect(venueSlotService.countAwaitingRequests(ownerId, second)).resolves.toBe(2);
  });

  it('refuses a venue id that is not one', async () => {
    await expect(venueSlotService.countAwaitingRequests(ownerId, 'not-an-id')).rejects.toThrow('Invalid venue_id');
  });
});
