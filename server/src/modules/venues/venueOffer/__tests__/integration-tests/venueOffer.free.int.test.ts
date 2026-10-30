/**
 * A free venue, end to end against the database: the host asks for the window
 * for nothing, with a justification; it is held at no money, told to the venue
 * as a free request, and the venue may only accept or decline it — neither side
 * counters it. The same holds for any offer on a free pod.
 */
import { Types } from 'mongoose';
import { venueOfferService } from '../../venueOffer.service';
import { venueSlotService } from '../../../venueSlot/venueSlot.service';
import { PodModel } from '@modules/pods/pod/pod.model';
import type { FreeJustification, VenueOfferRequest } from '../../venueOffer.types';
import { announced, lineFor, loadSlot, request, seedWorld, stubOfferMessages, type OfferMessages, type World } from './offerWorld.fixture';

jest.setTimeout(30_000);

let messages: OfferMessages;

beforeEach(() => {
  messages = stubOfferMessages();
});

afterEach(() => {
  jest.restoreAllMocks();
});

const NO_COUNTER = { extensions: { code: 'BAD_REQUEST', reason: 'FREE_NO_COUNTER' } };

const justification = (w: World): FreeJustification => ({
  reason: 'PROMOTIONAL',
  details: 'Launch week',
  accepted_at: new Date(),
  accepted_by: new Types.ObjectId(w.hostId),
});

/** The host's offer, held, pointed at by the pod and announced — free unless `over` says otherwise. */
async function place(
  w: World,
  over: Partial<VenueOfferRequest>,
  free: Parameters<typeof venueOfferService.place>[4]
): Promise<string> {
  const slot = await venueOfferService.place(w.podId, w.venueId, request(over), false, free);
  await PodModel.updateOne({ _id: w.podId }, { $set: { venue_slot_id: slot._id } });
  venueOfferService.announcePlaced(slot);
  const slotId = String(slot._id);
  await announced(messages, w, slotId, { event: 'OFFER', round: 1, notified: 'VENUE_OFFER_RECEIVED' });
  return slotId;
}

describe('a free venue', () => {
  it('is held at no money, with the reason the host gave', async () => {
    const w = await seedWorld();
    const slotId = await place(w, { model: 'FREE', rate: 750 }, { justification: justification(w) });

    const offer = (await loadSlot(slotId))?.offer;
    expect(offer).toMatchObject({ model: 'FREE', rate: 0, status: 'SENT', free_pod: false });
    expect(offer?.quote).toMatchObject({ venue_payout: 0, platform_fee: 0, total: 0 });
    expect(offer?.free_justification).toMatchObject({ reason: 'PROMOTIONAL', details: 'Launch week' });
    expect(offer?.history[0]).toMatchObject({ by: 'HOST', action: 'OFFER', model: 'FREE', total: 0 });

    // The venue reads it as a free request, never as "₹0 … venue receives ₹0".
    const line = await lineFor(w.podId, 'OFFER', 1);
    expect(line?.text).toContain('free venue');
    expect(line?.text).not.toContain('venue receives');

    await expect(venueOfferService.forPod(w.ownerId, w.podId)).resolves.toMatchObject({
      model: 'FREE',
      free_pod: false,
      free_justification: { reason: 'PROMOTIONAL', details: 'Launch week' },
    });
  });

  it('is refused without its justification', async () => {
    const w = await seedWorld();
    await expect(venueOfferService.place(w.podId, w.venueId, request({ model: 'FREE' }), false)).rejects.toThrow(/ask for the venue free/);
  });

  it('can only be accepted or declined — the venue cannot counter it', async () => {
    const w = await seedWorld();
    const slotId = await place(w, { model: 'FREE', rate: 0 }, { justification: justification(w) });

    await expect(venueOfferService.counter(w.ownerId, slotId, { model: 'FLAT', rate: 4000 }, '', 1)).rejects.toMatchObject(NO_COUNTER);
    await expect(venueOfferService.counterPreview(w.ownerId, slotId, { model: 'FLAT', rate: 4000 })).resolves.toMatchObject({
      ok: false,
      message: expect.stringMatching(/accept or decline/),
    });

    await venueSlotService.approveRequest(w.ownerId, slotId, 1);
    const accepted = await loadSlot(slotId);
    expect(accepted?.status).toBe('BOOKED');
    expect(accepted?.offer?.status).toBe('ACCEPTED');
    expect(accepted?.price_snapshot).toMatchObject({ venue_payout: 0, total: 0 });
  });

  it('is priced live at nothing for Create Pod, and refused where a price is needed', async () => {
    const w = await seedWorld();
    const free = request({ model: 'FREE', rate: 0 });
    await expect(venueOfferService.preview(w.venueId, free, undefined, true, true)).resolves.toMatchObject({
      ok: true,
      quote: { total: 0, venue_payout: 0 },
      quote_min: { total: 0 },
    });
    await expect(venueOfferService.preview(w.venueId, free)).resolves.toMatchObject({ ok: false });
  });
});

describe('an offer on a free pod', () => {
  it('names a price, yet nobody counters it', async () => {
    const w = await seedWorld();
    const slotId = await place(w, { model: 'FLAT', rate: 3000 }, { freePod: true });

    const offer = (await loadSlot(slotId))?.offer;
    expect(offer).toMatchObject({ model: 'FLAT', rate: 3000, free_pod: true });
    // A priced offer carries no free justification, even if one was handed in.
    expect(offer?.free_justification ?? null).toBeNull();
    await expect(venueOfferService.counter(w.ownerId, slotId, { model: 'FLAT', rate: 4500 }, '', 1)).rejects.toMatchObject(NO_COUNTER);
  });
});
