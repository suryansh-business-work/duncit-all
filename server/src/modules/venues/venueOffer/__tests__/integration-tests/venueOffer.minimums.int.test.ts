/**
 * The venue's minimums hold every set of terms a HOST sends, end to end
 * against the database — Create Pod's live quote and opening offer, a counter
 * back, and an edit of that counter — and none of the terms the venue names
 * itself: its own counter, or the flows it prices (Auto Pods, Pod Requests,
 * change requests). The minimum spend is held against the offer's own amount
 * at the fewest guests; nothing is ever topped up.
 */
import { venueOfferService } from '../../venueOffer.service';
import { venueOfferReviseService } from '../../venueOffer.revise';
import { VenueModel } from '../../../venue/venue.model';
import { announced, loadSlot, placeOffer, request, seedWorld, stubOfferMessages, type OfferMessages, type World } from './offerWorld.fixture';

jest.setTimeout(30_000);

let messages: OfferMessages;

beforeEach(() => {
  messages = stubOfferMessages();
});

afterEach(() => {
  jest.restoreAllMocks();
});

/** The fixture's venue takes 6 guests at least; this gives it a ₹5,000 minimum spend and a ₹400-a-guest floor. */
async function withMinimums(w: World, minSpend = 5000) {
  await VenueModel.updateOne(
    { _id: w.venueId },
    { $set: { 'settings.offers.min_spend': minSpend, 'settings.offers.min_business': [{ model: 'PER_GUEST', amount: 400 }] } }
  );
}

const HOST_OPENING = { atVenueMinimum: true, allowFree: true, hostTerms: true };

describe("Create Pod's opening offer", () => {
  it('is refused below the minimum spend at the fewest guests, with the reason and the shortfall', async () => {
    const w = await seedWorld();
    await withMinimums(w);
    // ₹500 × 6 guests = ₹3,000 against a ₹5,000 minimum.
    await expect(venueOfferService.preview(w.venueId, request({ min_guests: undefined }), undefined, HOST_OPENING)).resolves.toEqual({
      ok: false,
      reason: 'BELOW_MIN_SPEND',
      message: "This venue's minimum spend is 5000 per booking — your offer comes to 3000, 2000 short. Raise your offer",
      quote: null,
      quote_min: null,
    });
    await expect(venueOfferService.prepare(w.venueId, request(), undefined, { hostTerms: true })).rejects.toMatchObject({
      extensions: { reason: 'BELOW_MIN_SPEND', min: 5000, offered: 3000, shortfall: 2000 },
    });
  });

  it('is priced once it reaches the minimum spend, with no top-up anywhere in the price', async () => {
    const w = await seedWorld();
    await withMinimums(w);
    const ok = await venueOfferService.preview(w.venueId, request({ rate: 850, min_guests: undefined }), undefined, HOST_OPENING);
    expect(ok).toMatchObject({ ok: true, reason: null, quote_min: { pax: 6, base: 5100, venue_price: 5100 } });
    expect(ok.quote_min).not.toHaveProperty('min_spend_top_up');
  });

  it("is refused below the venue's amount on its basis before the minimum spend is weighed", async () => {
    const w = await seedWorld();
    await withMinimums(w, 0);
    await expect(venueOfferService.preview(w.venueId, request({ rate: 350 }), undefined, HOST_OPENING)).resolves.toMatchObject({
      ok: false,
      reason: 'BELOW_MIN_BUSINESS',
    });
  });

  it('asks nothing of a free venue, whose price is nothing', async () => {
    const w = await seedWorld();
    await withMinimums(w);
    await VenueModel.updateOne({ _id: w.venueId }, { $set: { 'settings.offers.free_booking': true } });
    await expect(
      venueOfferService.preview(w.venueId, request({ model: 'FREE', rate: 0 }), undefined, HOST_OPENING)
    ).resolves.toMatchObject({ ok: true, quote: { total: 0 } });
  });

  it('refuses a free ask to a venue that is not open to free bookings, and lets priced offers through', async () => {
    const w = await seedWorld();
    await withMinimums(w);
    await expect(
      venueOfferService.preview(w.venueId, request({ model: 'FREE', rate: 0 }), undefined, HOST_OPENING)
    ).resolves.toMatchObject({ ok: false, reason: 'FREE_BOOKING_OFF' });
    await expect(venueOfferService.prepare(w.venueId, request({ model: 'FREE', rate: 0 }), undefined, HOST_OPENING)).rejects.toMatchObject({
      extensions: { code: 'BAD_USER_INPUT', reason: 'FREE_BOOKING_OFF' },
    });
    await expect(venueOfferService.preview(w.venueId, request({ rate: 850, min_guests: undefined }), undefined, HOST_OPENING)).resolves.toMatchObject({
      ok: true,
    });
  });
});

describe('terms the venue names itself', () => {
  it('are priced as they are: Auto Pods, Pod Requests and change requests are the venue’s own price', async () => {
    const w = await seedWorld();
    await withMinimums(w);
    await expect(venueOfferService.preview(w.venueId, request({ rate: 100 }))).resolves.toMatchObject({ ok: true, quote_min: { base: 600 } });
  });
});

describe('a counter', () => {
  it("lets the venue go below its own minimums, but never the host's counter back", async () => {
    const w = await seedWorld();
    await withMinimums(w);
    const slotId = await placeOffer(messages, w, { rate: 900 });

    // The venue's own choice: ₹600 × 6 = ₹3,600, under its ₹5,000.
    await venueOfferService.counter(w.ownerId, slotId, { model: 'PER_GUEST', rate: 600 }, '', 1);
    await announced(messages, w, slotId, { event: 'COUNTER', round: 2, notified: 'HOST_VENUE_COUNTER_OFFER' });

    await expect(venueOfferService.hostCounterPreview(w.hostId, w.podId, { model: 'PER_GUEST', rate: 700 })).resolves.toMatchObject({
      ok: false,
      reason: 'BELOW_MIN_SPEND',
    });
    await expect(venueOfferService.hostCounter(w.hostId, w.podId, { model: 'PER_GUEST', rate: 700 }, '', 2)).rejects.toMatchObject({
      extensions: { code: 'BAD_USER_INPUT', reason: 'BELOW_MIN_SPEND', min: 5000, offered: 4200, shortfall: 800 },
    });
    // Nothing was written by the refused move.
    expect((await loadSlot(slotId))?.offer).toMatchObject({ status: 'COUNTERED', round: 2 });

    const view = await venueOfferService.hostCounter(w.hostId, w.podId, { model: 'PER_GUEST', rate: 850 }, '', 2);
    expect(view.status).toBe('SENT');
  });

  it("refuses a host's counter that asks for fewer guests than the venue takes", async () => {
    const w = await seedWorld();
    const slotId = await placeOffer(messages, w, { rate: 900 });
    await venueOfferService.counter(w.ownerId, slotId, { model: 'PER_GUEST', rate: 950 }, '', 1);
    await announced(messages, w, slotId, { event: 'COUNTER', round: 2, notified: 'HOST_VENUE_COUNTER_OFFER' });

    await expect(
      venueOfferService.hostCounter(w.hostId, w.podId, { model: 'PER_GUEST', rate: 950, min_guests: 3 }, '', 2)
    ).rejects.toMatchObject({ extensions: { reason: 'BELOW_VENUE_MINIMUM', min_guests: 6 } });
  });

  it("holds the host's edit of their own counter to the same minimums", async () => {
    const w = await seedWorld();
    await withMinimums(w);
    const slotId = await placeOffer(messages, w, { rate: 900 });
    await venueOfferService.counter(w.ownerId, slotId, { model: 'PER_GUEST', rate: 600 }, '', 1);
    await announced(messages, w, slotId, { event: 'COUNTER', round: 2, notified: 'HOST_VENUE_COUNTER_OFFER' });
    await venueOfferService.hostCounter(w.hostId, w.podId, { model: 'PER_GUEST', rate: 850 }, '', 2);
    await announced(messages, w, slotId, { event: 'COUNTER', round: 3, notified: 'VENUE_OFFER_RECEIVED' });

    await expect(venueOfferReviseService.editPreview(w.hostId, w.podId, { model: 'PER_GUEST', rate: 700 })).resolves.toMatchObject({
      ok: false,
      reason: 'BELOW_MIN_SPEND',
    });
    await expect(
      venueOfferReviseService.editCounter(w.hostId, w.podId, { model: 'PER_GUEST', rate: 700 }, '', 3)
    ).rejects.toMatchObject({ extensions: { reason: 'BELOW_MIN_SPEND' } });
  });
});
