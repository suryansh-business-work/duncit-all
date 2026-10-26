/**
 * Every counter, end to end against the database: it records where the offer
 * stood before it (what withdrawing it puts back), carries the photos its mover
 * attached into the booking and the chat, and counts against its side's share
 * of the counters Pod Settings allow — half the total each. Past that share a
 * side may only accept or reject; a withdrawn counter gives its side the
 * counter back, and an edited one is still the same counter.
 */
import { Types } from 'mongoose';
import { venueOfferService } from '../../venueOffer.service';
import { venueOfferReviseService } from '../../venueOffer.revise';
import { VenueSlotModel } from '../../../venueSlot/venueSlot.model';
import { venueSlotService } from '../../../venueSlot/venueSlot.service';
import { settingsService } from '@modules/platform/settings/settings.service';
import { announced, lineFor, loadSlot, placeOffer, seedWorld, stubOfferMessages, type OfferMessages, type World } from './offerWorld.fixture';

// A negotiation of several announced moves runs past jest's default 5 s on a busy runner.
jest.setTimeout(30_000);

let messages: OfferMessages;

beforeEach(() => {
  messages = stubOfferMessages();
});

afterEach(() => {
  jest.restoreAllMocks();
});

const photo = (name: string) => `https://ik.imagekit.io/duncit/staging/offer/${name}.jpg`;
const LIMIT = { extensions: { code: 'BAD_REQUEST', reason: 'COUNTER_LIMIT' } };

const venueCounter = async (w: World, slotId: string, rate: number, round: number) => {
  await venueOfferService.counter(w.ownerId, slotId, { model: 'PER_GUEST', rate }, '', round);
  await announced(messages, w, slotId, { event: 'COUNTER', round: round + 1, notified: 'HOST_VENUE_COUNTER_OFFER' });
};

const hostCounter = async (w: World, slotId: string, rate: number, round: number) => {
  await venueOfferService.hostCounter(w.hostId, w.podId, { model: 'PER_GUEST', rate }, '', round);
  await announced(messages, w, slotId, { event: 'COUNTER', round: round + 1, notified: 'VENUE_OFFER_RECEIVED' });
};

describe('a counter', () => {
  it('records where the offer stood before it, and carries its photos into the booking and the chat', async () => {
    const w = await seedWorld();
    const slotId = await placeOffer(messages, w);
    const opening = await loadSlot(slotId);

    const view = await venueOfferService.counter(
      w.ownerId,
      slotId,
      { model: 'PER_GUEST', rate: 600, images: [photo('terrace'), photo('terrace'), photo('bar')] },
      'See the terrace',
      1
    );

    expect(view.counter?.images).toEqual([photo('terrace'), photo('bar')]);
    const stored = await loadSlot(slotId);
    expect(stored?.offer?.counter?.images).toEqual([photo('terrace'), photo('bar')]);
    expect(stored?.offer?.prior).toMatchObject({
      status: 'SENT',
      round: 1,
      counter: null,
      expires_at: opening?.offer?.expires_at,
      host: { model: 'PER_GUEST', rate: 500, min_guests: 6, offerings: ['Projector', 'Snacks for 20'], note: 'Keep the AC on', images: [] },
    });
    await announced(messages, w, slotId, { event: 'COUNTER', round: 2, notified: 'HOST_VENUE_COUNTER_OFFER' });
    expect(await lineFor(w.podId, 'COUNTER', 2)).toMatchObject({ offer: { images: [photo('terrace'), photo('bar')] } });
  });

  it("a host's counter-back records the venue's counter as what it answered, and keeps the host's own photos", async () => {
    const w = await seedWorld();
    const slotId = await placeOffer(messages, w);
    await venueCounter(w, slotId, 600, 1);
    const venueTurn = await loadSlot(slotId);

    const view = await venueOfferService.hostCounter(w.hostId, w.podId, { model: 'PER_GUEST', rate: 550, images: [photo('stage')] }, '', 2);

    expect(view).toMatchObject({ status: 'SENT', images: [photo('stage')], counter: null });
    expect((await loadSlot(slotId))?.offer?.prior).toMatchObject({
      status: 'COUNTERED',
      round: 2,
      expires_at: venueTurn?.offer?.expires_at,
      counter: { model: 'PER_GUEST', rate: 600 },
      host: { rate: 500, images: [] },
    });
    await announced(messages, w, slotId, { event: 'COUNTER', round: 3, notified: 'VENUE_OFFER_RECEIVED' });
  });

  it('on an offer from before minimums and deadlines, records it as it was, so withdrawing puts it back unchanged', async () => {
    const w = await seedWorld();
    const slotId = await placeOffer(messages, w);
    await VenueSlotModel.collection.updateOne(
      { _id: new Types.ObjectId(slotId) },
      { $set: { 'offer.min_guests': 0, 'offer.quote_min': null, 'offer.charges': null, 'offer.expires_at': null } }
    );

    await venueCounter(w, slotId, 600, 1);
    expect((await loadSlot(slotId))?.offer?.prior).toMatchObject({
      expires_at: null,
      host: { min_guests: 0, quote_min: null, charges: null },
    });

    const view = await venueOfferReviseService.withdrawCounter(w.ownerId, w.podId, 2);
    // An offer from before minimums reads its guests as both ends; it still has no deadline.
    expect(view).toMatchObject({ status: 'SENT', round: 3, min_guests: 20, expires_at: null, counter: null });
    expect((await loadSlot(slotId))?.offer).toMatchObject({ min_guests: 0, quote_min: null, charges: null, expires_at: null });
  });

  it('refuses photos that were not uploaded from a device, or too many, writing nothing', async () => {
    const w = await seedWorld();
    const slotId = await placeOffer(messages, w);

    await expect(
      venueOfferService.counter(w.ownerId, slotId, { model: 'PER_GUEST', rate: 600, images: ['https://images.unsplash.com/photo-1'] }, '', 1)
    ).rejects.toMatchObject({ message: 'Attach photos uploaded from your device', extensions: { code: 'BAD_USER_INPUT' } });
    await expect(
      venueOfferService.counter(w.ownerId, slotId, { model: 'PER_GUEST', rate: 600, images: ['a', 'b', 'c', 'd', 'e'].map(photo) }, '', 1)
    ).rejects.toMatchObject({ message: 'Attach at most 4 photos' });

    expect((await loadSlot(slotId))?.offer).toMatchObject({ status: 'SENT', round: 1, counter: null, prior: null });
  });
});

describe("each side's share of the counters", () => {
  it("refuses the venue's counter once it has used its share; accepting is still open", async () => {
    await settingsService.updateAppSettings({ venue_offer_max_counters: 2 });
    const w = await seedWorld();
    const slotId = await placeOffer(messages, w);
    await venueCounter(w, slotId, 600, 1);
    await hostCounter(w, slotId, 550, 2);

    await expect(venueOfferService.counter(w.ownerId, slotId, { model: 'PER_GUEST', rate: 580 }, '', 3)).rejects.toMatchObject({
      message: "You have used all 1 of your counter offers — accept or reject the host's terms",
      extensions: { ...LIMIT.extensions, limit: 1 },
    });
    expect((await loadSlot(slotId))?.offer).toMatchObject({ status: 'SENT', round: 3, move: 2 });

    await venueSlotService.approveRequest(w.ownerId, slotId, 3);
    expect(await loadSlot(slotId)).toMatchObject({ status: 'BOOKED', price_basis: { rate: 550 } });
  });

  it("refuses the host's counter-back once the host has used its share, as Pod Settings say now", async () => {
    const w = await seedWorld();
    const slotId = await placeOffer(messages, w);
    await venueCounter(w, slotId, 600, 1);
    await hostCounter(w, slotId, 550, 2);
    await venueCounter(w, slotId, 580, 3);
    // The default (3 each) allowed all of that; an admin then lowers the total to 2.
    await settingsService.updateAppSettings({ venue_offer_max_counters: 2 });

    await expect(venueOfferService.hostCounter(w.hostId, w.podId, { model: 'PER_GUEST', rate: 560 }, '', 4)).rejects.toMatchObject({
      message: "You have used all 1 of your counter offers — accept or reject the venue's terms",
      extensions: { ...LIMIT.extensions, limit: 1 },
    });
    await expect(venueOfferService.hostAccept(w.hostId, w.podId, 4)).resolves.toMatchObject({ status: 'ACCEPTED' });
    expect((await loadSlot(slotId))?.price_basis).toMatchObject({ rate: 580 });
  });

  it('lets each side counter up to its share under the default of 3 each, and shows how many each has used', async () => {
    const w = await seedWorld();
    const slotId = await placeOffer(messages, w);
    await venueCounter(w, slotId, 600, 1);
    await hostCounter(w, slotId, 550, 2);
    await venueCounter(w, slotId, 590, 3);
    await hostCounter(w, slotId, 560, 4);
    await venueCounter(w, slotId, 580, 5);
    await hostCounter(w, slotId, 570, 6);

    await expect(venueOfferService.forPod(w.hostId, w.podId)).resolves.toMatchObject({ round: 7, host_counters_used: 3, venue_counters_used: 3 });
    await expect(venueOfferService.counter(w.ownerId, slotId, { model: 'PER_GUEST', rate: 575 }, '', 7)).rejects.toMatchObject({
      extensions: { ...LIMIT.extensions, limit: 3 },
    });
  });

  it('a withdrawn counter gives its side the counter back; an edited one is still the same counter', async () => {
    await settingsService.updateAppSettings({ venue_offer_max_counters: 2 });
    const w = await seedWorld();
    const slotId = await placeOffer(messages, w);
    await venueCounter(w, slotId, 600, 1);

    await expect(venueOfferReviseService.editCounter(w.ownerId, w.podId, { model: 'PER_GUEST', rate: 610 }, '', 2)).resolves.toMatchObject({
      round: 3,
      venue_counters_used: 1,
    });
    await expect(venueOfferService.counter(w.ownerId, slotId, { model: 'PER_GUEST', rate: 620 }, '', 3)).rejects.toMatchObject(LIMIT);

    await expect(venueOfferReviseService.withdrawCounter(w.ownerId, w.podId, 3)).resolves.toMatchObject({ round: 4, venue_counters_used: 0 });
    await expect(venueOfferService.counter(w.ownerId, slotId, { model: 'PER_GUEST', rate: 590 }, '', 4)).resolves.toMatchObject({
      status: 'COUNTERED',
      round: 5,
      venue_counters_used: 1,
      counter: { rate: 590 },
    });
    await announced(messages, w, slotId, { event: 'COUNTER', round: 5, notified: 'HOST_VENUE_COUNTER_OFFER' });
  });
});
