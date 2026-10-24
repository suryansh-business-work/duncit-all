/**
 * The booking offer, end to end against the database: a host's offer holds the
 * window on the venue's response clock, priced from the venue's minimum up to
 * the pod's spots; the two sides bargain — counters both ways, each one a line
 * in the venue chat and a message to the other side — until one side accepts,
 * one rejects or the answer runs late; a move made on terms that have since
 * changed is refused; and accepting freezes the per-guest basis settlement
 * prices on.
 */
import { Types } from 'mongoose';
import { venueOfferService } from '../../venueOffer.service';
import { VenueSlotModel } from '../../../venueSlot/venueSlot.model';
import { venueSlotService } from '../../../venueSlot/venueSlot.service';
import { OFFER_EXPIRED_REASON, runSlotRequestExpirySweep } from '../../../venueSlot/venueSlot.expiry';
import { venueOfferStaffService } from '../../venueOffer.staff';
import { VenueModel } from '../../../venue/venue.model';
import { venueLocalYmd } from '../../../autoExtend/slotGenerator';
import { PodModel } from '@modules/pods/pod/pod.model';
import { UserModel } from '@modules/access/user/user.model';
import { VenueChatMessageModel } from '@microservices/chat/venue/venueChat.model';
import { notificationService } from '@modules/engagement/notification/notification.service';
import { whatsappService } from '@modules/platform/whatsapp/whatsapp.service';
import * as notify from '@services/notify/notify.service';
import type { VenueOfferRequest } from '../../venueOffer.types';

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
/** `days` ahead at `hhmm` venue time — inside the default opening hours. */
const at = (days: number, hhmm: string) => new Date(`${venueLocalYmd(new Date(Date.now() + days * DAY_MS))}T${hhmm}:00+05:30`);
const START = () => at(3, '18:00');
const END = () => at(3, '20:00');

const SENT = { status: 'SENT', reason: '', message_id: 'wa-1' };

let inApp: jest.SpyInstance;
let event: jest.SpyInstance;
let waSend: jest.SpyInstance;

beforeEach(() => {
  inApp = jest.spyOn(notificationService, 'create').mockResolvedValue({} as never);
  event = jest.spyOn(notify, 'notifyEvent').mockResolvedValue({ wa: SENT, mail: null } as never);
  jest.spyOn(notify, 'notifyEach').mockResolvedValue(undefined as never);
  waSend = jest.spyOn(whatsappService, 'send').mockResolvedValue(SENT as never);
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

/** The moves' messages go out after the response; wait until they have. */
async function eventually(check: () => Promise<void> | void, ms = 4000) {
  const until = Date.now() + ms;
  for (;;) {
    try {
      await check();
      return;
    } catch (error) {
      if (Date.now() > until) throw error;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
}

interface World {
  ownerId: string;
  hostId: string;
  venueId: string;
  podId: string;
}

async function seedWorld(over: { offers?: Record<string, number>; ownerIsHost?: boolean } = {}): Promise<World> {
  const owner = await UserModel.create({
    auth: { email: `owner-${new Types.ObjectId()}@x.com`, phone: { extension: '+91', number: '9812345678' } },
    profile: { first_name: 'Olu', last_name: 'Owner' },
  });
  const host = over.ownerIsHost
    ? owner
    : await UserModel.create({
        auth: { email: `host-${new Types.ObjectId()}@x.com`, phone: { extension: '+91', number: '9876500000' } },
        profile: { first_name: 'Meera', last_name: 'Nair' },
      });
  const venue = await VenueModel.create({
    owner_user_id: owner._id,
    status: 'APPROVED',
    is_active: true,
    venue_name: 'Sky Deck',
    capacity: 30,
    owner_email: 'deck@x.com',
    owner_phone: '+919800000000',
    settings: { offers: over.offers ?? { min_guests: 6, response_hours: 12 } },
  });
  const pod = await PodModel.create({
    pod_id: `pod-${new Types.ObjectId().toString()}`,
    pod_title: 'Rooftop Jam',
    pod_hosts_id: [host._id],
    club_id: new Types.ObjectId(),
    pod_description: 'Acoustic evening under the stars',
    pod_date_time: START(),
    pod_type: 'PAID',
    pod_amount: 800,
    no_of_spots: 20,
    pod_images_and_videos: [{ url: 'https://img.example/pod.jpg', type: 'IMAGE' }],
    venue_id: venue._id,
    is_active: false,
    venue_approval_status: 'PENDING',
  });
  return { ownerId: String(owner._id), hostId: String(host._id), venueId: String(venue._id), podId: String(pod._id) };
}

const request = (over: Partial<VenueOfferRequest> = {}): VenueOfferRequest => ({
  start_at: START().toISOString(),
  end_at: END().toISOString(),
  space_label: '',
  pax: 20,
  pets: false,
  model: 'PER_GUEST',
  rate: 500,
  min_guests: 6,
  offerings: ['Projector', 'Snacks for 20'],
  note: 'Keep the AC on & lights <low>',
  ...over,
});

/** A host's offer, held and announced exactly as Create Pod does (the host's own venue hears nothing). */
async function placeOffer(w: World, over: Partial<VenueOfferRequest> = {}, own = false) {
  const slot = await venueOfferService.place(w.podId, w.venueId, request(over), own);
  await PodModel.updateOne({ _id: w.podId }, { $set: { venue_slot_id: slot._id } });
  if (!own) venueOfferService.announcePlaced(slot);
  return String(slot._id);
}

/** Read plain: Mongoose's own arrays and subdocuments do not compare as plain values. */
const loadSlot = async (id: string) => VenueSlotModel.findById(id).lean();
const lines = (podId: string) => VenueChatMessageModel.find({ pod_id: podId, type: 'OFFER' }).sort({ createdAt: 1 }).lean();
/** One move's line. Each is posted after its move returns, so lines are found by what they record, not by order. */
const lineFor = async (podId: string, event: string, round?: number) =>
  (await lines(podId)).find((l) => l.offer?.event === event && (round === undefined || l.offer?.round === round));
const eventCall = (key: string) => event.mock.calls.map(([input]) => input).find((input) => input.event === key);

describe('a host’s offer', () => {
  it('holds the window on the venue’s clock, priced from the venue’s minimum up to the pod’s spots', async () => {
    const w = await seedWorld();
    const before = Date.now();
    const slotId = await placeOffer(w);
    const slot = await loadSlot(slotId);

    expect(slot?.status).toBe('PENDING');
    expect(slot?.offer).toMatchObject({
      status: 'SENT',
      round: 1,
      move: 0,
      min_guests: 6,
      offerings: ['Projector', 'Snacks for 20'],
      note: 'Keep the AC on & lights <low>',
      quote: { pax: 20, base: 10_000 },
      quote_min: { pax: 6, base: 3000 },
    });
    expect(slot?.offer?.charges).toEqual(expect.objectContaining({ slots: [], operating_hours: [] }));
    const expires = slot?.offer?.expires_at?.getTime() ?? 0;
    expect(expires).toBeGreaterThanOrEqual(before + 12 * HOUR_MS);
    expect(expires).toBeLessThanOrEqual(Date.now() + 12 * HOUR_MS);
  });

  it('is posted to the venue chat and told to the venue with the whole offer, the host’s text escaped for email', async () => {
    const w = await seedWorld();
    const slotId = await placeOffer(w);

    await eventually(async () => {
      const [line] = await lines(w.podId);
      expect(line).toMatchObject({ side: 'HOST', user_id: w.hostId, offer: { event: 'OFFER', by: 'HOST', round: 1, min_guests: 6, max_guests: 20 } });
      expect(line?.text).toMatch(/^Booking offer: ₹500 per guest · 6–20 guests · venue receives /);
      expect(eventCall('VENUE_OFFER_RECEIVED')).toBeDefined();
    });

    expect(inApp).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'New booking offer', target_user_ids: [w.ownerId], link_url: `/venue-chat/${w.podId}` })
    );
    const sent = eventCall('VENUE_OFFER_RECEIVED');
    expect(sent.entityId).toBe(`${slotId}:r1`);
    expect(sent.email).toBe('deck@x.com');
    expect(sent.params).toHaveLength(12);
    expect(sent.params.slice(0, 7)).toEqual([
      'Olu Owner',
      'Rooftop Jam',
      expect.any(String),
      expect.stringMatching(/ – /),
      'Meera Nair',
      '₹500 per guest',
      '6–20 guests',
    ]);
    expect(sent.params[8]).toBe('Projector; Snacks for 20');
    expect(sent.params[9]).toBe('Keep the AC on & lights <low>');
    expect(sent.params[11]).toMatch(new RegExp(`^https?://[^/]+/venues/pods/${w.podId}/chat$`));
    expect(sent.vars).toMatchObject({
      offerings_html: '<ul style="margin:0;padding-left:18px"><li>Projector</li><li>Snacks for 20</li></ul>',
      request_note: 'Keep the AC on &amp; lights &lt;low&gt;',
      request: 'Keep the AC on &amp; lights &lt;low&gt;',
      contact_phone: '+919876500000',
    });
    // The detailed message went out, so the shorter one is not sent as well.
    expect(waSend).not.toHaveBeenCalled();
  });

  it('falls back to the shorter WhatsApp a venue already receives while the detailed template is not live', async () => {
    event.mockResolvedValue({ wa: { status: 'FAILED', reason: 'No AiSensy campaign named "venue_offer_received"', message_id: '' }, mail: null });
    const w = await seedWorld();
    const slotId = await placeOffer(w, { note: '', offerings: [] });

    await eventually(() => expect(waSend).toHaveBeenCalled());
    expect(waSend.mock.calls[0][0]).toMatchObject({ event: 'VENUE_SLOT_REQUESTED', entityId: slotId });
    expect(eventCall('VENUE_OFFER_RECEIVED').params.slice(8, 10)).toEqual(['No special request', 'No special request']);
  });

  it('is refused for fewer guests than the minimum it names, and previewed with the reason instead of thrown', async () => {
    const w = await seedWorld();
    await expect(venueOfferService.preview(w.venueId, request({ min_guests: 25 }))).resolves.toEqual({
      ok: false,
      message: 'The fewest guests cannot be more than the 20 spots booked',
      quote: null,
      quote_min: null,
    });
    const ok = await venueOfferService.preview(w.venueId, request());
    expect(ok).toMatchObject({ ok: true, message: null, quote: { pax: 20, confirmed_at: null }, quote_min: { pax: 6, confirmed_at: null } });
  });

  it('confirms at once at the host’s own venue, with the per-guest basis frozen and no clock running', async () => {
    const w = await seedWorld({ ownerIsHost: true });
    const slotId = await placeOffer(w, {}, true);
    const slot = await loadSlot(slotId);
    expect(slot?.status).toBe('BOOKED');
    expect(slot?.offer).toMatchObject({ status: 'ACCEPTED', expires_at: null });
    expect(slot?.price_snapshot).toMatchObject({ pax: 20 });
    expect(slot?.price_basis).toMatchObject({ model: 'PER_GUEST', rate: 500, min_guests: 6 });
  });
});

describe('bargaining', () => {
  it('the venue counters with its own minimum, points and note; the host answers on a fresh clock', async () => {
    const w = await seedWorld();
    const slotId = await placeOffer(w);
    const view = await venueOfferService.counter(
      w.ownerId,
      slotId,
      { model: 'PER_GUEST', rate: 600, min_guests: 8, offerings: ['Projector'] },
      'Snacks are extra',
      1
    );

    expect(view).toMatchObject({
      status: 'COUNTERED',
      round: 2,
      awaiting: 'HOST',
      counter: { model: 'PER_GUEST', rate: 600, min_guests: 8, offerings: ['Projector'], note: 'Snacks are extra', quote_min: { pax: 8 } },
    });
    expect(view.history.at(-1)).toMatchObject({ by: 'VENUE', action: 'COUNTER', rate: 600, min_guests: 8, note: 'Snacks are extra' });
    await eventually(async () => {
      expect(await lineFor(w.podId, 'OFFER', 1)).toMatchObject({ side: 'HOST' });
      expect(await lineFor(w.podId, 'COUNTER', 2)).toMatchObject({ side: 'VENUE', user_id: w.ownerId });
      expect(eventCall('HOST_VENUE_COUNTER_OFFER')).toBeDefined();
    });
    const told = eventCall('HOST_VENUE_COUNTER_OFFER');
    expect(told.entityId).toBe(`${slotId}:r2`);
    expect(told.params[4]).toBe('Sky Deck');
    expect(told.params[11]).toMatch(new RegExp(`^https?://[^/]+/venue-chat/${w.podId}$`));
    expect(told.vars).toMatchObject({ contact_phone: '+919800000000', contact_email: 'deck@x.com' });
    expect(inApp).toHaveBeenCalledWith(expect.objectContaining({ title: 'The venue sent a counter offer', target_user_ids: [w.hostId] }));
  });

  it('an older client that sends only a price carries the minimum and points over', async () => {
    const w = await seedWorld();
    const slotId = await placeOffer(w);
    const view = await venueOfferService.counter(w.ownerId, slotId, { model: 'FLAT', rate: 9000 });
    expect(view.counter).toMatchObject({ model: 'FLAT', rate: 9000, min_guests: 6, offerings: ['Projector', 'Snacks for 20'], note: '' });
  });

  it('refuses a move made on a round that has since changed — and the venue cannot take its own counter', async () => {
    const w = await seedWorld();
    const slotId = await placeOffer(w);
    await venueOfferService.counter(w.ownerId, slotId, { model: 'PER_GUEST', rate: 600 }, '', 1);

    await expect(venueSlotService.approveRequest(w.ownerId, slotId, 1)).rejects.toMatchObject({
      message: 'The host is answering your counter offer',
    });
    await expect(venueOfferService.hostAccept(w.hostId, w.podId, 1)).rejects.toMatchObject({
      extensions: { code: 'CONFLICT', reason: 'OFFER_CHANGED' },
    });
    await expect(venueOfferService.counter(w.ownerId, slotId, { model: 'PER_GUEST', rate: 650 }, '', 1)).rejects.toMatchObject({
      extensions: { reason: 'OFFER_CHANGED' },
    });
  });

  it('the host counters back: the venue’s counter is answered and the host’s terms are on the table again', async () => {
    event.mockResolvedValue({ wa: { status: 'FAILED', reason: 'Template is PENDING', message_id: '' }, mail: null });
    const w = await seedWorld();
    const slotId = await placeOffer(w);
    await venueOfferService.counter(w.ownerId, slotId, { model: 'PER_GUEST', rate: 600, min_guests: 8, offerings: ['Projector'] }, '', 1);
    await eventually(() => expect(eventCall('HOST_VENUE_COUNTER_OFFER')).toBeDefined());
    waSend.mockClear();

    const view = await venueOfferService.hostCounter(w.hostId, w.podId, { model: 'PER_GUEST', rate: 550, min_guests: 7 }, 'Meet halfway?', 2);
    expect(view).toMatchObject({
      status: 'SENT',
      round: 3,
      awaiting: 'VENUE',
      counter: null,
      rate: 550,
      min_guests: 7,
      offerings: ['Projector'],
      note: 'Meet halfway?',
    });
    await eventually(async () => {
      expect(await lineFor(w.podId, 'COUNTER', 3)).toMatchObject({ side: 'HOST', user_id: w.hostId });
      expect(event.mock.calls.some(([input]) => input.event === 'VENUE_OFFER_RECEIVED' && input.entityId === `${slotId}:r3`)).toBe(true);
    });
    expect(inApp).toHaveBeenCalledWith(expect.objectContaining({ title: 'The host countered your terms' }));
    // Only a NEW offer falls back to the shorter message; a counter does not.
    expect(waSend).not.toHaveBeenCalled();
  });

  it('the venue accepts: the agreed per-guest terms are frozen with the basis settlement prices on, and the pod goes live', async () => {
    const w = await seedWorld();
    const slotId = await placeOffer(w);
    await venueOfferService.counter(w.ownerId, slotId, { model: 'PER_GUEST', rate: 600 }, '', 1);
    await venueOfferService.hostCounter(w.hostId, w.podId, { model: 'PER_GUEST', rate: 550, min_guests: 7 }, '', 2);

    await venueSlotService.approveRequest(w.ownerId, slotId, 3);

    const slot = await loadSlot(slotId);
    expect(slot).toMatchObject({ status: 'BOOKED', decision: 'APPROVED' });
    expect(slot?.offer).toMatchObject({ status: 'ACCEPTED', expires_at: null, move: 3 });
    expect(slot?.price_snapshot).toMatchObject({ pax: 20, base: 11_000 });
    expect(slot?.price_basis).toMatchObject({ model: 'PER_GUEST', rate: 550, min_guests: 7, pets: false });
    expect(slot?.price).toBe(slot?.price_snapshot?.venue_payout);
    expect(await PodModel.findById(w.podId).lean()).toMatchObject({ venue_approval_status: 'APPROVED', is_active: true });
    await eventually(async () => expect(await lineFor(w.podId, 'ACCEPTED')).toMatchObject({ side: 'VENUE', offer: { rate: 550, round: 3 } }));
  });

  it('the host accepts the venue’s counter: the counter is what is frozen', async () => {
    const w = await seedWorld();
    const slotId = await placeOffer(w);
    await venueOfferService.counter(w.ownerId, slotId, { model: 'PER_GUEST', rate: 600, min_guests: 9 }, '', 1);
    const view = await venueOfferService.hostAccept(w.hostId, w.podId, 2);
    expect(view.status).toBe('ACCEPTED');
    const slot = await loadSlot(slotId);
    expect(slot?.price_basis).toMatchObject({ rate: 600, min_guests: 9 });
    expect(slot?.price_snapshot).toMatchObject({ base: 12_000 });
    await eventually(async () =>
      expect(await lineFor(w.podId, 'ACCEPTED')).toMatchObject({ side: 'HOST', user_id: w.hostId, offer: { rate: 600 } })
    );
  });

  it('two answers at once: exactly one lands', async () => {
    const w = await seedWorld();
    const slotId = await placeOffer(w);
    const results = await Promise.allSettled([
      venueSlotService.approveRequest(w.ownerId, slotId),
      venueOfferService.counter(w.ownerId, slotId, { model: 'PER_GUEST', rate: 700 }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
  });

  it('the host rejects the venue’s counter: the hold goes, the pod is venue-declined, the chat keeps the record', async () => {
    const w = await seedWorld();
    const slotId = await placeOffer(w);
    await venueOfferService.counter(w.ownerId, slotId, { model: 'FLAT', rate: 15_000 }, '', 1);
    await expect(venueOfferService.hostReject(w.hostId, w.podId, 'Too costly', 2)).resolves.toBe(true);

    expect(await loadSlot(slotId)).toBeNull();
    expect(await PodModel.findById(w.podId).lean()).toMatchObject({ venue_approval_status: 'DECLINED', is_active: false, venue_slot_id: null });
    await eventually(async () =>
      expect(await lineFor(w.podId, 'DECLINED')).toMatchObject({
        side: 'HOST',
        text: 'Offer declined: Too costly',
        offer: { by: 'HOST', reason: 'Too costly', model: 'FLAT' },
      })
    );
    expect(inApp).toHaveBeenCalledWith(expect.objectContaining({ title: 'Offer declined', target_user_ids: [w.ownerId] }));
  });

  it('only the right side may move', async () => {
    const w = await seedWorld();
    const slotId = await placeOffer(w);
    const stranger = String(new Types.ObjectId());
    await expect(venueOfferService.counter(stranger, slotId, { model: 'FLAT', rate: 1 })).rejects.toMatchObject({ message: 'Not your venue' });
    await expect(venueOfferService.hostCounter(w.hostId, w.podId, { model: 'FLAT', rate: 1 })).rejects.toMatchObject({
      message: 'There is no counter offer waiting for you on this pod',
    });
    await venueOfferService.counter(w.ownerId, slotId, { model: 'FLAT', rate: 9000 });
    await expect(venueOfferService.hostCounter(stranger, w.podId, { model: 'FLAT', rate: 1 })).rejects.toMatchObject({
      message: 'Only the pod host can answer this offer',
    });
    await expect(venueOfferService.hostAccept(w.hostId, 'not-an-id')).rejects.toMatchObject({ message: 'Invalid pod' });
    await expect(venueOfferService.hostAccept(w.hostId, String(new Types.ObjectId()))).rejects.toMatchObject({ message: 'Pod not found' });
    await expect(venueOfferService.counter(w.ownerId, 'nope', { model: 'FLAT', rate: 1 })).rejects.toMatchObject({ message: 'Invalid booking' });
    await expect(venueOfferService.counter(w.ownerId, String(new Types.ObjectId()), { model: 'FLAT', rate: 1 })).rejects.toMatchObject({
      message: 'Booking not found',
    });
  });

  it('nothing can be answered once the booking has started', async () => {
    const w = await seedWorld();
    const slotId = await placeOffer(w);
    await VenueSlotModel.updateOne({ _id: slotId }, { $set: { start_at: new Date(Date.now() - 1000) } });
    await expect(venueOfferService.counter(w.ownerId, slotId, { model: 'FLAT', rate: 1 })).rejects.toMatchObject({
      message: 'This booking has already started and can no longer be answered',
    });
  });

  it('previews a counter before it is sent, both ways, and says why one cannot be', async () => {
    const w = await seedWorld();
    const slotId = await placeOffer(w);
    await expect(venueOfferService.counterPreview(w.ownerId, slotId, { model: 'PER_GUEST', rate: 650, min_guests: 10 })).resolves.toMatchObject({
      ok: true,
      quote: { pax: 20, confirmed_at: null },
      quote_min: { pax: 10, confirmed_at: null },
    });
    await expect(venueOfferService.counterPreview(w.ownerId, slotId, { model: 'PER_GUEST', rate: 0 })).resolves.toEqual({
      ok: false,
      message: 'Enter the amount you offer the venue',
      quote: null,
      quote_min: null,
    });
    await expect(venueOfferService.hostCounterPreview(w.hostId, w.podId, { model: 'FLAT', rate: 100 })).resolves.toMatchObject({
      ok: false,
      message: 'There is no counter offer waiting for you on this pod',
    });
    await venueOfferService.counter(w.ownerId, slotId, { model: 'FLAT', rate: 9000 });
    await expect(venueOfferService.hostCounterPreview(w.hostId, w.podId, { model: 'FLAT', rate: 8000 })).resolves.toMatchObject({ ok: true });
  });

  it('shows the pod’s offer to its host and the venue, and nobody else', async () => {
    const w = await seedWorld();
    await placeOffer(w);
    await expect(venueOfferService.forPod(w.hostId, w.podId)).resolves.toMatchObject({ awaiting: 'VENUE', min_guests: 6 });
    await expect(venueOfferService.forPod(w.ownerId, w.podId)).resolves.toMatchObject({ round: 1 });
    await expect(venueOfferService.forPod(String(new Types.ObjectId()), w.podId)).rejects.toMatchObject({ message: 'Not your pod' });
    await expect(venueOfferService.forPod(w.hostId, 'bad')).rejects.toMatchObject({ message: 'Invalid pod' });
    await expect(venueOfferService.forPod(w.hostId, String(new Types.ObjectId()))).rejects.toMatchObject({ message: 'Pod not found' });
    const other = await seedWorld();
    await expect(venueOfferService.forPod(other.hostId, other.podId)).resolves.toBeNull();
  });

  it('shows staff the negotiation beside the money', async () => {
    const w = await seedWorld();
    const slotId = await placeOffer(w);
    await venueOfferService.counter(w.ownerId, slotId, { model: 'PER_GUEST', rate: 600, min_guests: 8 }, 'Veg only', 1);
    const [row] = await venueOfferStaffService.bookingTerms(w.venueId);
    expect(row).toMatchObject({
      slot_id: slotId,
      offer_status: 'COUNTERED',
      model: 'PER_GUEST',
      rate: 600,
      min_guests: 8,
      max_guests: 20,
      offerings: ['Projector', 'Snacks for 20'],
      note: 'Veg only',
      round: 2,
      awaiting: 'HOST',
      expires_at: expect.any(String),
    });
  });
});

describe('an answer that runs late', () => {
  it('expires the offer on the venue’s clock: declined, the time freed, the host told in the chat', async () => {
    const w = await seedWorld();
    const slotId = await placeOffer(w);
    await VenueSlotModel.updateOne({ _id: slotId }, { $set: { 'offer.expires_at': new Date(Date.now() - 1000) } });

    await expect(runSlotRequestExpirySweep()).resolves.toBe(1);

    expect(await loadSlot(slotId)).toBeNull();
    expect(await PodModel.findById(w.podId).lean()).toMatchObject({ venue_approval_status: 'DECLINED', is_active: false });
    await eventually(async () =>
      expect(await lineFor(w.podId, 'EXPIRED')).toMatchObject({
        side: 'VENUE',
        text: 'Offer expired — no answer in time',
        offer: { by: 'SYSTEM', reason: OFFER_EXPIRED_REASON.VENUE },
      })
    );
  });

  it('expires a counter the host left unanswered, on the host’s side', async () => {
    const w = await seedWorld();
    const slotId = await placeOffer(w);
    await venueOfferService.counter(w.ownerId, slotId, { model: 'FLAT', rate: 9000 });
    await VenueSlotModel.updateOne({ _id: slotId }, { $set: { 'offer.expires_at': new Date(Date.now() - 1000) } });

    await expect(runSlotRequestExpirySweep()).resolves.toBe(1);
    await eventually(async () =>
      expect(await lineFor(w.podId, 'EXPIRED')).toMatchObject({
        side: 'HOST',
        user_id: w.hostId,
        offer: { reason: OFFER_EXPIRED_REASON.HOST },
      })
    );
  });

  it('leaves an offer still inside its clock alone', async () => {
    const w = await seedWorld();
    const slotId = await placeOffer(w);
    await expect(runSlotRequestExpirySweep()).resolves.toBe(0);
    expect((await loadSlot(slotId))?.status).toBe('PENDING');
  });

  it('lets an answer that landed first stand: the sweep’s stale write is a no-op', async () => {
    const w = await seedWorld();
    const slotId = await placeOffer(w);
    const stale = await VenueSlotModel.findById(slotId);
    if (!stale) throw new Error('the offer was not held');
    await venueOfferService.counter(w.ownerId, slotId, { model: 'FLAT', rate: 9000 });
    await expect(venueSlotService.expireRequest(stale, 'late')).resolves.toBe(false);
    expect((await loadSlot(slotId))?.offer?.status).toBe('COUNTERED');
  });
});
