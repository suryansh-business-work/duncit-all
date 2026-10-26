/**
 * What a member may do to a line already in a venue booking's chat: react to
 * any line (offer cards included — the same emoji again takes it back), and
 * rewrite or remove their own text or photo. Each change reaches everyone with
 * the thread open. An offer card changes only through the offer itself — a
 * counter edited or withdrawn before the other side saw it — which is what the
 * offer-line operations at the end are for.
 */
jest.mock('@realtime/io', () => ({ getIo: jest.fn() }));

import { Types } from 'mongoose';
import { getIo } from '@realtime/io';
import { makeContext } from '@test/harness';
import { PodModel } from '@modules/pods/pod/pod.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { UserModel } from '@modules/access/user/user.model';
import { venueChatResolvers } from '../../venueChat.resolver';
import { venueChatService } from '../../venueChat.service';
import { venueChatLineService } from '../../venueChat.lines';
import { VenueChatMessageModel, type VenueChatOfferPayload } from '../../venueChat.model';

const M = venueChatResolvers.Mutation;
const Q = venueChatResolvers.Query;
const ctx = (id: unknown) => makeContext({ id: String(id) });

const FORBIDDEN = { extensions: { code: 'FORBIDDEN' } };
const NOT_FOUND = { message: 'This message is no longer in the chat', extensions: { code: 'NOT_FOUND' } };
const BAD_INPUT = { extensions: { code: 'BAD_USER_INPUT' } };

let emitted: Array<{ room: string; event: string; payload: unknown }>;

beforeEach(() => {
  emitted = [];
  (getIo as jest.Mock).mockReturnValue({
    to: (room: string) => ({ emit: (event: string, payload: unknown) => emitted.push({ room, event, payload }) }),
    in: () => ({ fetchSockets: async () => [] }),
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

let seq = 0;
const seedUser = (first: string) =>
  UserModel.create({ auth: { email: `venuelines${++seq}@x.com` }, profile: { first_name: first, last_name: 'Doe' } });

async function seedBooking() {
  const host = await seedUser('Asha');
  const owner = await seedUser('Omar');
  const outsider = await seedUser('Zed');
  const venue = await VenueModel.create({ owner_user_id: owner._id, venue_name: 'Dek Cafe', cover_image_url: 'https://ik.imagekit.io/x/dek.jpg' });
  const pod = await PodModel.create({
    pod_id: `vlines-${++seq}`,
    pod_title: 'Board Game Night',
    pod_hosts_id: [host._id],
    club_id: new Types.ObjectId(),
    pod_description: 'desc',
    pod_date_time: new Date('2026-12-01T18:00:00Z'),
    pod_type: 'PAID',
    venue_id: venue._id,
  });
  return { host, owner, outsider, venue, podId: String(pod._id) };
}

const cardPayload = (over: Partial<VenueChatOfferPayload> = {}): VenueChatOfferPayload => ({
  slot_id: 'slot-1',
  round: 2,
  event: 'COUNTER',
  by: 'VENUE',
  model: 'PER_GUEST',
  rate: 600,
  min_guests: 8,
  max_guests: 20,
  offerings: ['Projector'],
  note: '',
  start_at: new Date('2027-01-04T12:30:00.000Z'),
  end_at: new Date('2027-01-04T14:30:00.000Z'),
  space_label: '',
  pets: false,
  venue_receives_min: 4800,
  venue_receives_max: 12_000,
  total_min: 5280,
  total_max: 13_200,
  expires_at: null,
  reason: '',
  images: [],
  ...over,
});

const say = (podId: string, as: unknown, text: string) => M.sendVenueChatMessage({}, { pod_id: podId, text }, ctx(as));
const sendPhoto = (podId: string, as: unknown) =>
  M.sendVenueChatMessage({}, { pod_id: podId, type: 'IMAGE', image_url: 'https://ik.imagekit.io/x/patio.jpg' }, ctx(as));
const postCard = async (podId: string, ownerId: unknown) => {
  const card = await venueChatService.postOffer({ podId, side: 'VENUE', userId: String(ownerId), text: 'Counter offer', offer: cardPayload() });
  if (!card) throw new Error('the offer card was not posted');
  return card;
};
const react = (id: string, as: unknown, emoji: string) => M.reactToVenueChatMessage({}, { message_id: id, emoji }, ctx(as));
const edit = (id: string, as: unknown, text: string) => M.editVenueChatMessage({}, { message_id: id, text }, ctx(as));
const remove = (id: string, as: unknown) => M.deleteVenueChatMessage({}, { message_id: id }, ctx(as));
const page = (podId: string, as: unknown) => Q.venueChatMessages({}, { pod_id: podId }, ctx(as));
const roomOf = (podId: string) => `venue-chat:${podId}`;

describe('reacting to a line', () => {
  it("adds the member's reaction for everyone, and the same emoji again takes it back", async () => {
    const { host, owner, podId } = await seedBooking();
    const line = await say(podId, owner._id, 'The patio is free at 5');
    emitted.length = 0;

    const reacted = await react(line.id, host._id, ' 👍 ');
    expect(reacted).toMatchObject({ id: line.id, text: 'The patio is free at 5', reactions: [{ user_id: String(host._id), emoji: '👍' }] });
    expect(emitted).toEqual([{ room: roomOf(podId), event: 'venue_chat_update', payload: reacted }]);

    const both = await react(line.id, owner._id, '👍');
    expect(both.reactions).toEqual([
      { user_id: String(host._id), emoji: '👍' },
      { user_id: String(owner._id), emoji: '👍' },
    ]);

    const takenBack = await react(line.id, host._id, '👍');
    expect(takenBack.reactions).toEqual([{ user_id: String(owner._id), emoji: '👍' }]);
    const [read] = await page(podId, host._id);
    expect(read.reactions).toEqual([{ user_id: String(owner._id), emoji: '👍' }]);
  });

  it('lets a member react to an offer card too, and to one line with more than one emoji', async () => {
    const { host, owner, podId } = await seedBooking();
    const card = await postCard(podId, owner._id);

    await react(card.id, host._id, '🎉');
    const reacted = await react(card.id, host._id, '👍');

    expect(reacted).toMatchObject({ type: 'OFFER', offer: { event: 'COUNTER' } });
    expect(reacted.reactions).toEqual([
      { user_id: String(host._id), emoji: '🎉' },
      { user_id: String(host._id), emoji: '👍' },
    ]);
  });

  it('refuses no emoji, something too long to be one, an outsider, and a line that is not in the chat', async () => {
    const { host, owner, outsider, podId } = await seedBooking();
    const line = await say(podId, owner._id, 'Hello');

    await expect(react(line.id, host._id, '   ')).rejects.toMatchObject({ message: 'Pick a reaction', ...BAD_INPUT });
    await expect(react(line.id, host._id, 'x'.repeat(17))).rejects.toMatchObject({ message: 'Pick a reaction' });
    await expect(react(line.id, outsider._id, '👍')).rejects.toMatchObject(FORBIDDEN);
    await expect(react('not-an-id', host._id, '👍')).rejects.toMatchObject(NOT_FOUND);
    await expect(react(String(new Types.ObjectId()), host._id, '👍')).rejects.toMatchObject(NOT_FOUND);
    await remove(line.id, owner._id);
    await expect(react(line.id, host._id, '👍')).rejects.toMatchObject(NOT_FOUND);

    expect((await VenueChatMessageModel.findById(line.id).lean())?.reactions).toEqual([]);
  });
});

describe('editing a line', () => {
  it('the author rewrites their own text; everyone sees it, marked edited', async () => {
    const { host, owner, podId } = await seedBooking();
    const line = await say(podId, host._id, 'Can we set up at 5?');
    expect(line.edited_at).toBeNull();
    emitted.length = 0;

    const edited = await edit(line.id, host._id, '  Can we set up at 4?  ');

    expect(edited).toMatchObject({ id: line.id, type: 'TEXT', text: 'Can we set up at 4?', createdAt: line.createdAt });
    expect(Number.isNaN(Date.parse(edited.edited_at ?? ''))).toBe(false);
    expect(emitted).toEqual([{ room: roomOf(podId), event: 'venue_chat_update', payload: edited }]);
    const [read] = await page(podId, owner._id);
    expect(read).toMatchObject({ text: 'Can we set up at 4?', edited_at: edited.edited_at });
  });

  it("refuses someone else's line, an offer card, a photo, an outsider, and text a new line could not carry", async () => {
    const { host, owner, outsider, podId } = await seedBooking();
    const theirs = await say(podId, owner._id, 'Hello');
    const mine = await say(podId, host._id, 'Hi');
    const photo = await sendPhoto(podId, host._id);
    const card = await postCard(podId, owner._id);

    await expect(edit(theirs.id, host._id, 'Changed')).rejects.toMatchObject({ message: 'You can only change your own messages', ...FORBIDDEN });
    await expect(edit(card.id, owner._id, 'Changed')).rejects.toMatchObject({ message: 'You can only change your own messages', ...FORBIDDEN });
    await expect(edit(photo.id, host._id, 'Changed')).rejects.toMatchObject({ message: 'Only a text message can be edited', ...BAD_INPUT });
    await expect(edit(mine.id, outsider._id, 'Changed')).rejects.toMatchObject(FORBIDDEN);
    await expect(edit(mine.id, host._id, '   ')).rejects.toMatchObject({ message: 'Write a message first', ...BAD_INPUT });
    await expect(edit(mine.id, host._id, 'a'.repeat(2001))).rejects.toMatchObject({ message: 'This message is too long', ...BAD_INPUT });
    await expect(edit(mine.id, host._id, 'call me on 9876543210')).rejects.toMatchObject({ extensions: { reason: 'MODERATION_BLOCKED' } });

    expect(await VenueChatMessageModel.findById(mine.id).lean()).toMatchObject({ text: 'Hi', edited_at: null });
    expect(await VenueChatMessageModel.findById(card.id).lean()).toMatchObject({ text: 'Counter offer', edited_at: null });
  });

  it('reports a line removed while an edit or a reaction was on its way as gone, telling nobody', async () => {
    const { host, owner, podId } = await seedBooking();
    const line = await say(podId, host._id, 'Hi');
    emitted.length = 0;
    // The line leaves the thread between being read and being written to: the guarded write matches nothing.
    jest.spyOn(VenueChatMessageModel, 'findOneAndUpdate').mockReturnValue({ lean: async () => null } as never);

    await expect(edit(line.id, host._id, 'Hello')).rejects.toMatchObject(NOT_FOUND);
    await expect(react(line.id, owner._id, '👍')).rejects.toMatchObject(NOT_FOUND);
    expect(emitted).toEqual([]);
  });
});

describe('removing a line', () => {
  it('the author takes their text or photo out of the thread; it stays on record and everyone is told', async () => {
    const { host, owner, podId } = await seedBooking();
    const text = await say(podId, owner._id, 'Wrong date, sorry');
    const photo = await sendPhoto(podId, owner._id);
    emitted.length = 0;

    await expect(remove(text.id, owner._id)).resolves.toBe(true);
    await expect(remove(photo.id, owner._id)).resolves.toBe(true);

    expect(emitted).toEqual([
      { room: roomOf(podId), event: 'venue_chat_delete', payload: { id: text.id, pod_id: podId } },
      { room: roomOf(podId), event: 'venue_chat_delete', payload: { id: photo.id, pod_id: podId } },
    ]);
    expect(await page(podId, host._id)).toEqual([]);
    expect(await VenueChatMessageModel.findById(text.id).lean()).toMatchObject({ deleted: true, text: 'Wrong date, sorry' });
  });

  it("refuses someone else's line, an offer card, and a line already removed", async () => {
    const { host, owner, podId } = await seedBooking();
    const theirs = await say(podId, owner._id, 'Hello');
    const mine = await say(podId, host._id, 'Hi');
    const card = await postCard(podId, owner._id);

    await expect(remove(theirs.id, host._id)).rejects.toMatchObject(FORBIDDEN);
    await expect(remove(card.id, owner._id)).rejects.toMatchObject(FORBIDDEN);
    await remove(mine.id, host._id);
    await expect(remove(mine.id, host._id)).rejects.toMatchObject(NOT_FOUND);

    const left = new Set((await page(podId, host._id)).map((line) => line.id));
    expect(left).toEqual(new Set([theirs.id, card.id]));
  });
});

describe('the offer card a counter edit or withdrawal changes', () => {
  const slotId = 'slot-9';
  const insertCards = (podId: string, ownerId: unknown, cards: Array<{ offer: Partial<VenueChatOfferPayload>; at: string; deleted?: boolean }>) =>
    VenueChatMessageModel.insertMany(
      cards.map((card) => ({
        pod_id: podId,
        venue_id: 'venue',
        user_id: String(ownerId),
        side: 'VENUE',
        type: 'OFFER',
        text: 'Counter offer',
        offer: cardPayload({ slot_id: slotId, ...card.offer }),
        deleted: card.deleted ?? false,
        createdAt: new Date(card.at),
      }))
    );

  it("rewrites a counter's own line with its edited terms, marked edited, and tells the thread", async () => {
    const { owner, podId } = await seedBooking();
    const [card] = await insertCards(podId, owner._id, [{ offer: { round: 2 }, at: '2026-10-01T10:00:00Z' }]);

    await venueChatLineService.reviseOfferLine(card._id, cardPayload({ slot_id: slotId, round: 3, rate: 650 }), `Counter offer: ${'x'.repeat(2100)}`);

    const stored = await VenueChatMessageModel.findById(card._id).lean();
    expect(stored).toMatchObject({ deleted: false, offer: { round: 3, rate: 650 } });
    expect(stored?.text).toHaveLength(2000);
    expect(stored?.edited_at).toBeInstanceOf(Date);
    expect(emitted).toEqual([
      {
        room: roomOf(podId),
        event: 'venue_chat_update',
        payload: expect.objectContaining({ id: String(card._id), offer: expect.objectContaining({ round: 3, rate: 650 }) }),
      },
    ]);
  });

  it('rewrites nothing once the line has left the thread', async () => {
    const { owner, podId } = await seedBooking();
    const [card] = await insertCards(podId, owner._id, [{ offer: { round: 2 }, at: '2026-10-01T10:00:00Z', deleted: true }]);

    await venueChatLineService.reviseOfferLine(card._id, cardPayload({ round: 3 }), 'Counter offer');

    expect(await VenueChatMessageModel.findById(card._id).lean()).toMatchObject({ offer: { round: 2 }, edited_at: null });
    expect(emitted).toEqual([]);
  });

  it('says the line is gone when its pod is no longer at a venue, so nobody can be told', async () => {
    const { owner, podId } = await seedBooking();
    const [card] = await insertCards(podId, owner._id, [{ offer: { round: 2 }, at: '2026-10-01T10:00:00Z' }]);
    await PodModel.updateOne({ _id: podId }, { $unset: { venue_id: 1 } });

    await expect(venueChatLineService.reviseOfferLine(card._id, cardPayload({ round: 3 }), 'Counter offer')).rejects.toMatchObject(NOT_FOUND);
    expect(emitted).toEqual([]);
  });

  it("carries the new round on the restored move's line, and does nothing when there is no such line", async () => {
    const { owner, podId } = await seedBooking();
    const [opening, withdrawn] = await insertCards(podId, owner._id, [
      { offer: { round: 1, event: 'OFFER', by: 'HOST' }, at: '2026-10-01T10:00:00Z' },
      { offer: { round: 2 }, at: '2026-10-01T10:05:00Z', deleted: true },
    ]);

    await venueChatLineService.renumberOfferLine(podId, slotId, 1, 3);
    expect(await VenueChatMessageModel.findById(opening._id).lean()).toMatchObject({ offer: { round: 3, event: 'OFFER' } });
    expect(emitted).toEqual([expect.objectContaining({ event: 'venue_chat_update', payload: expect.objectContaining({ id: String(opening._id) }) })]);

    emitted.length = 0;
    await venueChatLineService.renumberOfferLine(podId, slotId, 2, 4);
    expect(await VenueChatMessageModel.findById(withdrawn._id).lean()).toMatchObject({ offer: { round: 2 } });
    expect(emitted).toEqual([]);
  });

  it("takes a withdrawn counter's line out of the thread and tells everyone", async () => {
    const { owner, host, podId } = await seedBooking();
    const [card] = await insertCards(podId, owner._id, [{ offer: { round: 2 }, at: '2026-10-01T10:00:00Z' }]);

    await venueChatLineService.withdrawOfferLine(card._id, podId);

    expect(await VenueChatMessageModel.findById(card._id).lean()).toMatchObject({ deleted: true });
    expect(emitted).toEqual([{ room: roomOf(podId), event: 'venue_chat_delete', payload: { id: String(card._id), pod_id: podId } }]);
    expect(await page(podId, host._id)).toEqual([]);
  });
});
