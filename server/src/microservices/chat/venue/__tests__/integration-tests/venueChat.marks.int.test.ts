/**
 * How far each member has read a venue booking's chat — the "seen" faces drawn
 * under the last line each one has read. The venue's face is drawn as the
 * venue, like its lines; a member never sees their own mark, and one who never
 * opened the thread has none. Reading the newest page, writing a line and
 * making an offer move all read the thread; a background poll and an older page
 * do not. The same marks decide whether a counter has been seen.
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
import { markVenueChatRead, seenByAny, venueChatReadMarks } from '../../venueChat.read';
import type { VenueChatOfferPayload } from '../../venueChat.model';
import { ChatReadStateModel } from '../../../rooms/chatState.model';
import { logs } from '@observability/log';

const Q = venueChatResolvers.Query;
const M = venueChatResolvers.Mutation;
const ctx = (id: unknown) => makeContext({ id: String(id) });
const COVER = 'https://ik.imagekit.io/x/dek.jpg';

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
const seedUser = (first: string, photo?: string) =>
  UserModel.create({
    auth: { email: `venuemarks${++seq}@x.com` },
    profile: { first_name: first, last_name: 'Doe', ...(photo ? { profile_photo: photo } : {}) },
  });

async function seedBooking() {
  const host = await seedUser('Asha');
  const coHost = await seedUser('Ravi', 'https://ik.imagekit.io/x/ravi.jpg');
  const owner = await seedUser('Omar');
  const outsider = await seedUser('Zed');
  const venue = await VenueModel.create({ owner_user_id: owner._id, venue_name: 'Dek Cafe', cover_image_url: COVER });
  const pod = await PodModel.create({
    pod_id: `vmarks-${++seq}`,
    pod_title: 'Board Game Night',
    pod_hosts_id: [host._id, coHost._id],
    club_id: new Types.ObjectId(),
    pod_description: 'desc',
    pod_date_time: new Date('2026-12-01T18:00:00Z'),
    pod_type: 'PAID',
    venue_id: venue._id,
  });
  return { host, coHost, owner, outsider, podId: String(pod._id) };
}

const marksSeenBy = async (podId: string, viewer: unknown) => (await Q.venueChatRoom({}, { pod_id: podId }, ctx(viewer))).read_marks;
const page = (podId: string, as: unknown, extra: Record<string, unknown> = {}) =>
  Q.venueChatMessages({}, { pod_id: podId, ...extra }, ctx(as));
const say = (podId: string, as: unknown, text: string) => M.sendVenueChatMessage({}, { pod_id: podId, text }, ctx(as));

const offer = (over: Partial<VenueChatOfferPayload>): VenueChatOfferPayload => ({
  slot_id: 'slot-1',
  round: 2,
  event: 'COUNTER',
  by: 'VENUE',
  model: 'FLAT',
  rate: 9000,
  min_guests: 20,
  max_guests: 20,
  offerings: [],
  note: '',
  start_at: new Date('2027-01-04T12:30:00.000Z'),
  end_at: new Date('2027-01-04T14:30:00.000Z'),
  space_label: '',
  pets: false,
  venue_receives_min: 9000,
  venue_receives_max: 9000,
  total_min: 9900,
  total_max: 9900,
  expires_at: null,
  reason: '',
  images: [],
  ...over,
});

describe('read marks on the room', () => {
  it('are empty until someone opens the thread, and never include the viewer', async () => {
    const { host, owner, podId } = await seedBooking();
    await expect(marksSeenBy(podId, host._id)).resolves.toEqual([]);

    await page(podId, owner._id);

    await expect(marksSeenBy(podId, owner._id)).resolves.toEqual([]);
    await expect(marksSeenBy(podId, host._id)).resolves.toEqual([
      { user_id: String(owner._id), side: 'VENUE', name: 'Dek Cafe', photo: COVER, last_read_at: expect.any(String) },
    ]);
  });

  it("draws each host as themselves, without a photo when they have none, and leaves out a host who never opened it", async () => {
    const { host, coHost, owner, podId } = await seedBooking();
    await page(podId, coHost._id);
    await expect(marksSeenBy(podId, owner._id)).resolves.toEqual([
      { user_id: String(coHost._id), side: 'HOST', name: 'Ravi Doe', photo: 'https://ik.imagekit.io/x/ravi.jpg', last_read_at: expect.any(String) },
    ]);

    await page(podId, host._id);
    const marks = await marksSeenBy(podId, owner._id);
    expect(marks).toHaveLength(2);
    expect(marks).toEqual(
      expect.arrayContaining([expect.objectContaining({ user_id: String(host._id), side: 'HOST', name: 'Asha Doe', photo: null })])
    );
  });
});

describe('what reads the thread', () => {
  it('writing a line reads it up to that line, and the other side sees the face move live', async () => {
    const { host, owner, podId } = await seedBooking();

    const line = await say(podId, host._id, 'On my way');

    const [mark] = await marksSeenBy(podId, owner._id);
    expect(mark).toMatchObject({ user_id: String(host._id), side: 'HOST', name: 'Asha Doe', photo: null });
    expect(Date.parse(mark.last_read_at)).toBeGreaterThanOrEqual(Date.parse(line.createdAt));
    expect(emitted.map((e) => e.event)).toEqual(['venue_chat_message', 'venue_chat_read']);
    expect(emitted[1]).toEqual({ room: `venue-chat:${podId}`, event: 'venue_chat_read', payload: { pod_id: podId, ...mark } });
  });

  it("the venue writing a line is drawn as the venue on the host's screen", async () => {
    const { host, owner, podId } = await seedBooking();
    await say(podId, owner._id, 'See you at 6');
    await expect(marksSeenBy(podId, host._id)).resolves.toEqual([expect.objectContaining({ user_id: String(owner._id), name: 'Dek Cafe', photo: COVER })]);
  });

  it('a background poll (mark_read false) and an older page read without marking; a newest page from an older app marks', async () => {
    const { host, owner, podId } = await seedBooking();
    await say(podId, owner._id, 'Hello');

    await page(podId, host._id, { mark_read: false });
    await page(podId, host._id, { before: new Date(Date.now() + 60_000).toISOString() });
    await expect(marksSeenBy(podId, owner._id)).resolves.toEqual([]);

    await page(podId, host._id, { mark_read: null });
    await expect(marksSeenBy(podId, owner._id)).resolves.toEqual([expect.objectContaining({ user_id: String(host._id) })]);
  });

  it('an offer move reads the thread for the side that moved, and an answer that ran late for nobody', async () => {
    const { host, owner, podId } = await seedBooking();
    await venueChatService.postOffer({
      podId,
      side: 'VENUE',
      userId: String(owner._id),
      text: 'Offer expired — no answer in time',
      offer: offer({ event: 'EXPIRED', by: 'SYSTEM' }),
    });
    await expect(marksSeenBy(podId, host._id)).resolves.toEqual([]);

    await venueChatService.postOffer({ podId, side: 'VENUE', userId: String(owner._id), text: 'Counter offer', offer: offer({}) });
    await expect(marksSeenBy(podId, host._id)).resolves.toEqual([
      expect.objectContaining({ user_id: String(owner._id), side: 'VENUE', name: 'Dek Cafe' }),
    ]);
  });

  it('a read mark that cannot be written never fails the line or the move it came with', async () => {
    const { host, owner, podId } = await seedBooking();
    const warn = jest.spyOn(logs.server, 'warn').mockImplementation(() => undefined);
    jest.spyOn(ChatReadStateModel, 'updateOne').mockRejectedValue(new Error('db down') as never);

    await expect(say(podId, host._id, 'Still sent')).resolves.toMatchObject({ text: 'Still sent' });
    await expect(
      venueChatService.postOffer({ podId, side: 'VENUE', userId: String(owner._id), text: 'Counter offer', offer: offer({}) })
    ).resolves.toMatchObject({ type: 'OFFER' });

    const readFailures = warn.mock.calls.filter(([scope, event]) => scope === 'venueChat' && event === 'readThread');
    expect(readFailures).toHaveLength(2);
    expect(readFailures[0][2]).toMatchObject({ error: expect.objectContaining({ message: 'db down' }) });
    await expect(marksSeenBy(podId, owner._id)).resolves.toEqual([]);
  });

  it('markVenueChatRead moves the caller to now and tells the thread; an outsider is refused', async () => {
    const { host, owner, outsider, podId } = await seedBooking();
    const before = Date.now();

    await expect(M.markVenueChatRead({}, { pod_id: podId }, ctx(owner._id))).resolves.toBe(true);

    expect(emitted).toEqual([
      {
        room: `venue-chat:${podId}`,
        event: 'venue_chat_read',
        payload: { pod_id: podId, user_id: String(owner._id), side: 'VENUE', name: 'Dek Cafe', photo: COVER, last_read_at: expect.any(String) },
      },
    ]);
    const [mark] = await marksSeenBy(podId, host._id);
    expect(Date.parse(mark.last_read_at)).toBeGreaterThanOrEqual(before);
    await expect(M.markVenueChatRead({}, { pod_id: podId }, ctx(outsider._id))).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
  });
});

describe('seenByAny', () => {
  const at = new Date('2027-01-01T10:00:00.000Z');

  it('is true once any of the members has read up to the time a line was written, and only in that thread', async () => {
    const podId = String(new Types.ObjectId());
    const [early, onTime] = [String(new Types.ObjectId()), String(new Types.ObjectId())];

    await expect(seenByAny(podId, [], at)).resolves.toBe(false);
    await expect(seenByAny(podId, [early, onTime], at)).resolves.toBe(false);

    await markVenueChatRead(early, podId, at.getTime() - 1);
    await expect(seenByAny(podId, [early, onTime], at)).resolves.toBe(false);

    await markVenueChatRead(onTime, podId, at.getTime());
    await expect(seenByAny(podId, [early, onTime], at)).resolves.toBe(true);
    await expect(seenByAny(podId, [early], at)).resolves.toBe(false);
    await expect(seenByAny(String(new Types.ObjectId()), [onTime], at)).resolves.toBe(false);
  });

  it("reads the marks of the members asked about only, and none for an empty list", async () => {
    const podId = String(new Types.ObjectId());
    const [a, b] = [String(new Types.ObjectId()), String(new Types.ObjectId())];
    await markVenueChatRead(a, podId, at.getTime());
    await markVenueChatRead(b, podId, at.getTime() + 1000);

    const marks = await venueChatReadMarks(podId, [b]);
    expect([...marks.entries()]).toEqual([[b, new Date(at.getTime() + 1000)]]);
    await expect(venueChatReadMarks(podId, [])).resolves.toEqual(new Map());
  });
});
