/**
 * A counter changed or taken back by the side that made it, end to end against
 * the database — only while it is the latest move and the other side has not
 * opened the chat since it was posted. An edit is priced again and moves the
 * round on, so an answer written against the counter as it stood can never
 * land; a withdrawal puts back exactly where the offer stood before the
 * counter, under a round never used before, and the chat follows: the edited
 * line is rewritten in place, the withdrawn one leaves the thread and the move
 * it answered carries the new round.
 */
import { Types } from 'mongoose';
import { venueOfferService } from '../../venueOffer.service';
import { venueOfferReviseService as revise } from '../../venueOffer.revise';
import { VenueSlotModel } from '../../../venueSlot/venueSlot.model';
import { venueSlotService } from '../../../venueSlot/venueSlot.service';
import { PodModel } from '@modules/pods/pod/pod.model';
import { UserModel } from '@modules/access/user/user.model';
import { venueChatService } from '@microservices/chat/venue/venueChat.service';
import { VenueChatMessageModel } from '@microservices/chat/venue/venueChat.model';
import {
  announced,
  lineFor,
  loadSlot,
  offerLines,
  placeOffer,
  seedWorld,
  stubOfferMessages,
  type OfferMessages,
  type World,
} from './offerWorld.fixture';

// A negotiation of several announced moves runs past jest's default 5 s on a busy runner.
jest.setTimeout(30_000);

let messages: OfferMessages;

beforeEach(() => {
  messages = stubOfferMessages();
});

afterEach(() => {
  jest.restoreAllMocks();
});

const SEEN = { extensions: { code: 'BAD_REQUEST', reason: 'OFFER_SEEN' } };
const CHANGED = { extensions: { code: 'CONFLICT', reason: 'OFFER_CHANGED' } };
const photo = 'https://ik.imagekit.io/duncit/staging/offer/terrace.jpg';

/** The in-app notes sent with this title. */
const told = (title: string) => messages.inApp.mock.calls.map(([input]) => input).filter((input) => input.title === title);

/** The venue counters the host's offer (round 2); its line is in and the host told. */
async function venueCounters(w: World, slotId: string) {
  await venueOfferService.counter(w.ownerId, slotId, { model: 'PER_GUEST', rate: 600, min_guests: 8, offerings: ['Projector'] }, 'Snacks are extra', 1);
  await announced(messages, w, slotId, { event: 'COUNTER', round: 2, notified: 'HOST_VENUE_COUNTER_OFFER' });
}

/** The host counters the venue's counter back (round 3); its line is in and the venue told. */
async function hostCountersBack(w: World, slotId: string) {
  await venueOfferService.hostCounter(w.hostId, w.podId, { model: 'PER_GUEST', rate: 550, min_guests: 7 }, 'Meet halfway?', 2);
  await announced(messages, w, slotId, { event: 'COUNTER', round: 3, notified: 'VENUE_OFFER_RECEIVED' });
}

async function countered(w: World) {
  const slotId = await placeOffer(messages, w);
  await venueCounters(w, slotId);
  return slotId;
}

describe('editing a counter the other side has not seen', () => {
  it('the venue re-prices its counter: the round moves on, its step and its line are replaced, and the host is told', async () => {
    const w = await seedWorld();
    const slotId = await countered(w);
    const original = await lineFor(w.podId, 'COUNTER', 2);

    const view = await revise.editCounter(w.ownerId, w.podId, { model: 'FLAT', rate: 9000, images: [photo] }, 'Flat is simpler', 2);

    expect(view).toMatchObject({
      status: 'COUNTERED',
      round: 3,
      awaiting: 'HOST',
      // The minimum and the points carry over from the counter being edited.
      counter: { model: 'FLAT', rate: 9000, min_guests: 8, offerings: ['Projector'], note: 'Flat is simpler', images: [photo] },
      venue_counters_used: 1,
      host_counters_used: 0,
      // The host's own terms are untouched.
      model: 'PER_GUEST',
      rate: 500,
      min_guests: 6,
    });
    expect(view.history.map((step) => [step.by, step.action])).toEqual([
      ['HOST', 'OFFER'],
      ['VENUE', 'COUNTER'],
    ]);
    expect(view.history[1]).toMatchObject({ model: 'FLAT', rate: 9000, note: 'Flat is simpler' });
    expect((await loadSlot(slotId))?.offer).toMatchObject({ move: 2, counter: { quote: { base: 9000 }, images: [photo] } });

    // The same line, rewritten — nothing new is posted.
    expect(await offerLines(w.podId)).toHaveLength(2);
    const rewritten = await lineFor(w.podId, 'COUNTER', 3);
    expect(String(rewritten?._id)).toBe(String(original?._id));
    expect(rewritten).toMatchObject({ deleted: false, offer: { by: 'VENUE', model: 'FLAT', rate: 9000, note: 'Flat is simpler', images: [photo] } });
    expect(rewritten?.edited_at).toBeInstanceOf(Date);
    expect(rewritten?.text).toMatch(/^Counter offer: ₹9,000 flat · 8–20 guests · venue receives /);
    expect(told('The venue updated their counter offer')).toEqual([
      expect.objectContaining({ target_user_ids: [w.hostId], body: rewritten?.text, link_url: `/venue-chat/${w.podId}` }),
    ]);
  });

  it('an answer written against the counter as it stood before is refused; the edited terms are what is taken', async () => {
    const w = await seedWorld();
    const slotId = await countered(w);
    await revise.editCounter(w.ownerId, w.podId, { model: 'PER_GUEST', rate: 650, min_guests: 9 }, '', 2);

    await expect(venueOfferService.hostAccept(w.hostId, w.podId, 2)).rejects.toMatchObject(CHANGED);
    await expect(venueOfferService.hostAccept(w.hostId, w.podId, 3)).resolves.toMatchObject({ status: 'ACCEPTED' });

    expect(await loadSlot(slotId)).toMatchObject({
      status: 'BOOKED',
      price_basis: { model: 'PER_GUEST', rate: 650, min_guests: 9 },
      price_snapshot: { base: 13_000 },
    });
    expect(await lineFor(w.podId, 'ACCEPTED', 3)).toMatchObject({ side: 'HOST', offer: { rate: 650 } });
  });

  it('the host re-prices its counter-back: the venue now answers the new terms, and is told', async () => {
    const w = await seedWorld();
    const slotId = await countered(w);
    await hostCountersBack(w, slotId);

    const view = await revise.editCounter(w.hostId, w.podId, { model: 'PER_GUEST', rate: 520, min_guests: 7, images: [photo] }, 'Final offer', 3);

    expect(view).toMatchObject({
      status: 'SENT',
      round: 4,
      awaiting: 'VENUE',
      counter: null,
      model: 'PER_GUEST',
      rate: 520,
      min_guests: 7,
      note: 'Final offer',
      images: [photo],
      host_counters_used: 1,
      venue_counters_used: 1,
    });
    expect(view.history.map((step) => [step.by, step.action, step.rate])).toEqual([
      ['HOST', 'OFFER', 500],
      ['VENUE', 'COUNTER', 600],
      ['HOST', 'COUNTER', 520],
    ]);
    expect(await lineFor(w.podId, 'COUNTER', 4)).toMatchObject({ side: 'HOST', user_id: w.hostId, offer: { by: 'HOST', rate: 520 } });
    expect(await lineFor(w.podId, 'COUNTER', 3)).toBeUndefined();
    expect(told('The host updated their counter offer')).toEqual([expect.objectContaining({ target_user_ids: [w.ownerId] })]);
  });

  it('refuses terms that are not sound, writing nothing', async () => {
    const w = await seedWorld();
    const slotId = await countered(w);

    await expect(revise.editCounter(w.ownerId, w.podId, { model: 'PER_GUEST', rate: 0 }, '', 2)).rejects.toMatchObject({
      message: 'Enter the amount you offer the venue',
    });
    await expect(
      revise.editCounter(w.ownerId, w.podId, { model: 'PER_GUEST', rate: 610, images: ['https://images.pexels.com/photos/1/hall.jpg'] }, '', 2)
    ).rejects.toMatchObject({ message: 'Attach photos uploaded from your device', extensions: { code: 'BAD_USER_INPUT' } });

    expect((await loadSlot(slotId))?.offer).toMatchObject({ round: 2, move: 1, counter: { rate: 600 } });
    expect(told('The venue updated their counter offer')).toEqual([]);
  });

  it('two edits at once: exactly one lands, the other is told the offer changed', async () => {
    const w = await seedWorld();
    const slotId = await countered(w);

    const results = await Promise.allSettled([
      revise.editCounter(w.ownerId, w.podId, { model: 'PER_GUEST', rate: 610 }, '', 2),
      revise.editCounter(w.ownerId, w.podId, { model: 'PER_GUEST', rate: 620 }, '', 2),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const lost = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(lost).toHaveLength(1);
    expect(lost[0].reason).toMatchObject(CHANGED);
    expect((await loadSlot(slotId))?.offer).toMatchObject({ round: 3, move: 2 });
  });
});

describe('editPreview', () => {
  it('prices the edit as it would be saved, and says why one cannot be made instead of throwing', async () => {
    const w = await seedWorld();
    await countered(w);

    await expect(revise.editPreview(w.ownerId, w.podId, { model: 'PER_GUEST', rate: 650, min_guests: 10 })).resolves.toMatchObject({
      ok: true,
      message: null,
      quote: { pax: 20, base: 13_000, confirmed_at: null },
      quote_min: { pax: 10, base: 6500, confirmed_at: null },
    });
    await expect(revise.editPreview(w.hostId, w.podId, { model: 'PER_GUEST', rate: 650 })).resolves.toEqual({
      ok: false,
      message: 'Only the side that made a counter can change it',
      quote: null,
      quote_min: null,
    });
    await expect(revise.editPreview(w.ownerId, w.podId, { model: 'PER_GUEST', rate: 0 })).resolves.toMatchObject({
      ok: false,
      message: 'Enter the amount you offer the venue',
    });
  });
});

describe('withdrawing a counter the other side has not seen', () => {
  it("the venue takes its counter back: the host's terms are on the table again under a new round, on their own clock", async () => {
    const w = await seedWorld();
    const slotId = await placeOffer(messages, w);
    const opening = await loadSlot(slotId);
    await venueCounters(w, slotId);
    const counterLine = await lineFor(w.podId, 'COUNTER', 2);
    const openingLine = await lineFor(w.podId, 'OFFER', 1);

    const view = await revise.withdrawCounter(w.ownerId, w.podId, 2);

    expect(view).toMatchObject({
      status: 'SENT',
      round: 3,
      awaiting: 'VENUE',
      counter: null,
      rate: 500,
      min_guests: 6,
      note: 'Keep the AC on',
      venue_counters_used: 0,
      expires_at: opening?.offer?.expires_at?.toISOString(),
    });
    expect(view.history.map((step) => step.action)).toEqual(['OFFER']);
    expect((await loadSlot(slotId))?.offer).toMatchObject({ prior: null, move: 2, round: 3 });

    // The counter's line leaves the thread; the offer it answered carries the new round.
    expect(await VenueChatMessageModel.findById(counterLine?._id).lean()).toMatchObject({ deleted: true });
    const restored = await lineFor(w.podId, 'OFFER', 3);
    expect(String(restored?._id)).toBe(String(openingLine?._id));
    expect(restored).toMatchObject({ deleted: false, offer: { by: 'HOST', rate: 500 } });
    expect(told('The venue withdrew their counter offer')).toEqual([
      expect.objectContaining({ target_user_ids: [w.hostId], body: 'The earlier terms are back on the table.' }),
    ]);

    // The venue answers the host's terms as they now stand, never under the withdrawn round.
    await expect(venueSlotService.approveRequest(w.ownerId, slotId, 2)).rejects.toMatchObject(CHANGED);
    await venueSlotService.approveRequest(w.ownerId, slotId, 3);
    expect(await loadSlot(slotId)).toMatchObject({ status: 'BOOKED', price_basis: { model: 'PER_GUEST', rate: 500, min_guests: 6 } });
  });

  it("the host takes its counter-back back: the venue's counter is on the table again, waiting on the host", async () => {
    const w = await seedWorld();
    const slotId = await countered(w);
    const venueTurn = await loadSlot(slotId);
    const venueLine = await lineFor(w.podId, 'COUNTER', 2);
    await hostCountersBack(w, slotId);
    const hostLine = await lineFor(w.podId, 'COUNTER', 3);

    const view = await revise.withdrawCounter(w.hostId, w.podId, 3);

    expect(view).toMatchObject({
      status: 'COUNTERED',
      round: 4,
      awaiting: 'HOST',
      counter: { model: 'PER_GUEST', rate: 600, min_guests: 8, offerings: ['Projector'], note: 'Snacks are extra' },
      // The host's terms are back to what they were before the counter-back.
      rate: 500,
      min_guests: 6,
      offerings: ['Projector', 'Snacks for 20'],
      note: 'Keep the AC on',
      host_counters_used: 0,
      venue_counters_used: 1,
      expires_at: venueTurn?.offer?.expires_at?.toISOString(),
    });
    expect(view.history.map((step) => [step.by, step.action])).toEqual([
      ['HOST', 'OFFER'],
      ['VENUE', 'COUNTER'],
    ]);
    expect(await VenueChatMessageModel.findById(hostLine?._id).lean()).toMatchObject({ deleted: true });
    expect(String((await lineFor(w.podId, 'COUNTER', 4))?._id)).toBe(String(venueLine?._id));
    expect(told('The host withdrew their counter offer')).toEqual([expect.objectContaining({ target_user_ids: [w.ownerId] })]);

    await venueOfferService.hostAccept(w.hostId, w.podId, 4);
    expect((await loadSlot(slotId))?.price_basis).toMatchObject({ rate: 600, min_guests: 8 });
  });

  it('refuses a counter made before withdrawal existed — it can still be edited', async () => {
    const w = await seedWorld();
    const slotId = await countered(w);
    await VenueSlotModel.collection.updateOne({ _id: new Types.ObjectId(slotId) }, { $set: { 'offer.prior': null } });

    await expect(revise.withdrawCounter(w.ownerId, w.podId, 2)).rejects.toMatchObject({
      message: 'This counter was made before counters could be withdrawn — change it instead',
      extensions: { code: 'BAD_REQUEST' },
    });
    await expect(revise.editCounter(w.ownerId, w.podId, { model: 'PER_GUEST', rate: 610 }, '', 2)).resolves.toMatchObject({ round: 3 });
  });

  it('refuses to put back terms whose answer time has already run out, writing nothing', async () => {
    const w = await seedWorld();
    const slotId = await countered(w);
    await VenueSlotModel.collection.updateOne(
      { _id: new Types.ObjectId(slotId) },
      { $set: { 'offer.prior.expires_at': new Date(Date.now() - 1000) } }
    );

    await expect(revise.withdrawCounter(w.ownerId, w.podId, 2)).rejects.toMatchObject({
      message: 'The answer time on the earlier terms has run out — change your counter instead',
    });
    expect((await loadSlot(slotId))?.offer).toMatchObject({ status: 'COUNTERED', round: 2, counter: { rate: 600 } });
    expect(await lineFor(w.podId, 'COUNTER', 2)).toMatchObject({ deleted: false });
  });

  it('puts back an offer from before deadlines without one', async () => {
    const w = await seedWorld();
    const slotId = await countered(w);
    await VenueSlotModel.collection.updateOne({ _id: new Types.ObjectId(slotId) }, { $set: { 'offer.prior.expires_at': null } });

    await expect(revise.withdrawCounter(w.ownerId, w.podId, 2)).resolves.toMatchObject({ status: 'SENT', round: 3, expires_at: null });
  });
});

describe('once the other side has seen the counter', () => {
  it('a poll that does not read the thread leaves it changeable; opening the thread puts it on the record', async () => {
    const w = await seedWorld();
    const slotId = await countered(w);

    // A tab nobody is looking at polls without reading.
    await venueChatService.messages(w.podId, w.hostId, 50, null, false);
    await expect(revise.editCounter(w.ownerId, w.podId, { model: 'PER_GUEST', rate: 620 }, '', 2)).resolves.toMatchObject({ round: 3 });

    await venueChatService.messages(w.podId, w.hostId);
    await expect(revise.editCounter(w.ownerId, w.podId, { model: 'PER_GUEST', rate: 640 }, '', 3)).rejects.toMatchObject(SEEN);
    await expect(revise.withdrawCounter(w.ownerId, w.podId, 3)).rejects.toMatchObject(SEEN);
    expect((await loadSlot(slotId))?.offer).toMatchObject({ round: 3, status: 'COUNTERED', counter: { rate: 620 } });
  });

  it("the venue reading the thread puts the host's counter-back on the record", async () => {
    const w = await seedWorld();
    const slotId = await countered(w);
    await hostCountersBack(w, slotId);

    await venueChatService.messages(w.podId, w.ownerId);

    await expect(revise.withdrawCounter(w.hostId, w.podId, 3)).rejects.toMatchObject(SEEN);
  });

  it("a co-host reading the thread is the host's own side: the counter-back can still be withdrawn", async () => {
    const w = await seedWorld();
    const slotId = await countered(w);
    await hostCountersBack(w, slotId);
    const coHost = await UserModel.create({ auth: { email: `cohost-${new Types.ObjectId()}@x.com` }, profile: { first_name: 'Ravi', last_name: 'K' } });
    await PodModel.updateOne({ _id: w.podId }, { $push: { pod_hosts_id: coHost._id } });

    await venueChatService.messages(w.podId, String(coHost._id));

    // Either host may take their side's counter back.
    await expect(revise.withdrawCounter(String(coHost._id), w.podId, 3)).resolves.toMatchObject({ status: 'COUNTERED', round: 4 });
  });

  it('a counter whose line never reached the chat cannot have been seen: it is changed and withdrawn with nothing to rewrite', async () => {
    const w = await seedWorld();
    await countered(w);
    await VenueChatMessageModel.deleteMany({ pod_id: w.podId, 'offer.event': 'COUNTER' });
    await venueChatService.messages(w.podId, w.hostId);

    await expect(revise.editCounter(w.ownerId, w.podId, { model: 'PER_GUEST', rate: 630 }, '', 2)).resolves.toMatchObject({ round: 3 });
    expect(told('The venue updated their counter offer')).toEqual([expect.objectContaining({ body: '' })]);
    await expect(revise.withdrawCounter(w.ownerId, w.podId, 3)).resolves.toMatchObject({ status: 'SENT', round: 4 });
    // Nothing was renumbered: only the opening offer's line is left, on its own round.
    const left = await offerLines(w.podId);
    expect(left.map((line) => [line.offer?.event, line.offer?.round])).toEqual([['OFFER', 1]]);
  });
});

describe('who may change a counter, and when', () => {
  it('only the side that made the latest counter, on the round it read', async () => {
    const w = await seedWorld();
    const slotId = await placeOffer(messages, w);
    const terms = { model: 'PER_GUEST' as const, rate: 650 };

    // The host's opening offer is not a counter.
    await expect(revise.editCounter(w.ownerId, w.podId, terms, '', 1)).rejects.toMatchObject({
      message: 'There is no counter offer of yours to change',
      extensions: { code: 'BAD_REQUEST' },
    });
    await expect(revise.withdrawCounter(w.hostId, w.podId, 1)).rejects.toMatchObject({ message: 'There is no counter offer of yours to change' });

    await venueCounters(w, slotId);
    await expect(revise.editCounter(w.hostId, w.podId, terms, '', 2)).rejects.toMatchObject({
      message: 'Only the side that made a counter can change it',
      extensions: { code: 'FORBIDDEN' },
    });
    await expect(revise.withdrawCounter(String(new Types.ObjectId()), w.podId, 2)).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    await expect(revise.editCounter(w.ownerId, w.podId, terms, '', 1)).rejects.toMatchObject(CHANGED);
    await expect(revise.withdrawCounter(w.ownerId, w.podId, 1)).rejects.toMatchObject(CHANGED);
    await expect(revise.editCounter(w.ownerId, 'not-a-pod', terms, '', 2)).rejects.toMatchObject({
      message: 'Invalid pod',
      extensions: { code: 'BAD_USER_INPUT' },
    });
    await expect(revise.withdrawCounter(w.ownerId, String(new Types.ObjectId()), 2)).rejects.toMatchObject({
      message: 'Pod not found',
      extensions: { code: 'NOT_FOUND' },
    });
    expect((await loadSlot(slotId))?.offer).toMatchObject({ round: 2, move: 1 });
  });

  it('nothing can be changed once the booking has started', async () => {
    const w = await seedWorld();
    const slotId = await countered(w);
    await VenueSlotModel.updateOne({ _id: slotId }, { $set: { start_at: new Date(Date.now() - 1000) } });

    await expect(revise.withdrawCounter(w.ownerId, w.podId, 2)).rejects.toMatchObject({
      message: 'This booking has already started and can no longer be answered',
    });
  });

  it('nothing can be changed once the offer is closed', async () => {
    const w = await seedWorld();
    const slotId = await countered(w);
    await venueOfferService.hostAccept(w.hostId, w.podId, 2);

    await expect(revise.editCounter(w.ownerId, w.podId, { model: 'PER_GUEST', rate: 700 }, '', 2)).rejects.toMatchObject({
      message: 'There is no counter offer of yours to change',
    });
    expect((await loadSlot(slotId))?.status).toBe('BOOKED');
  });
});
