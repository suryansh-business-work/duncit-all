import { Types } from 'mongoose';
import { PodModel } from '@modules/pods/pod/pod.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { UserModel } from '@modules/access/user/user.model';
import { UserBlockModel } from '@modules/access/block/userBlock.model';
import { PodMessageModel } from '../../../rooms/chat.model';
import { makeContext } from '@test/harness';
import { venueChatResolvers } from '../../venueChat.resolver';
import { VenueChatMessageModel } from '../../venueChat.model';

let seq = 0;

const seedUser = (first: string) =>
  UserModel.create({ auth: { email: `venuechat${++seq}@x.com` }, profile: { first_name: first, last_name: 'Doe' } });

function seedPod(hostId: Types.ObjectId, venueId: Types.ObjectId | null, extra: Record<string, unknown> = {}) {
  return PodModel.create({
    pod_id: `vpod-${++seq}`,
    pod_title: 'Board Game Night',
    pod_hosts_id: [hostId],
    club_id: new Types.ObjectId(),
    pod_description: 'desc',
    pod_date_time: new Date('2026-12-01T18:00:00Z'),
    pod_end_date_time: new Date('2026-12-01T20:00:00Z'),
    pod_type: 'PAID',
    is_active: true,
    venue_id: venueId,
    ...extra,
  });
}

async function seedBooking() {
  const host = await seedUser('Asha');
  const owner = await seedUser('Omar');
  const outsider = await seedUser('Zed');
  const venue = await VenueModel.create({
    owner_user_id: owner._id,
    venue_name: 'Dek Cafe',
    cover_image_url: 'https://img.example/dek.jpg',
  });
  const pod = await seedPod(host._id, venue._id as Types.ObjectId);
  return { host, owner, outsider, venue, pod };
}

const Q = venueChatResolvers.Query;
const M = venueChatResolvers.Mutation;
const ctx = (id: unknown) => makeContext({ id: String(id) });
const room = (podId: unknown, as: unknown) => Q.venueChatRoom({}, { pod_id: String(podId) }, ctx(as));
const send = (podId: unknown, as: unknown, args: Record<string, unknown>) =>
  M.sendVenueChatMessage({}, { pod_id: String(podId), ...args }, ctx(as));
const page = (podId: unknown, as: unknown, extra: Record<string, unknown> = {}) =>
  Q.venueChatMessages({}, { pod_id: String(podId), ...extra }, ctx(as));
const FORBIDDEN = { extensions: { code: 'FORBIDDEN' } };
const BAD_INPUT = { extensions: { code: 'BAD_USER_INPUT' } };

describe('venue booking chat', () => {
  it('tells each member which side they are on', async () => {
    const { host, owner, pod, venue } = await seedBooking();

    const asHost = await room(pod._id, host._id);
    const asVenue = await room(pod._id, owner._id);

    expect(asHost).toMatchObject({
      pod_id: String(pod._id),
      pod_title: 'Board Game Night',
      venue_id: String(venue._id),
      venue_name: 'Dek Cafe',
      venue_photo: 'https://img.example/dek.jpg',
      my_side: 'HOST',
    });
    expect(asHost.pod_date_time).toBe('2026-12-01T18:00:00.000Z');
    expect(asVenue.my_side).toBe('VENUE');
  });

  it('refuses everyone else, a pod without a venue, a bad id and a signed-out caller', async () => {
    const { outsider, pod, host } = await seedBooking();
    const noVenue = await seedPod(host._id, null);

    await expect(room(pod._id, outsider._id)).rejects.toMatchObject(FORBIDDEN);
    await expect(page(pod._id, outsider._id)).rejects.toMatchObject(FORBIDDEN);
    await expect(send(pod._id, outsider._id, { text: 'hi' })).rejects.toMatchObject(FORBIDDEN);
    await expect(page(noVenue._id, host._id)).rejects.toMatchObject(FORBIDDEN);
    await expect(page('not-an-id', host._id)).rejects.toMatchObject(FORBIDDEN);
    await expect(Q.venueChatRoom({}, { pod_id: String(pod._id) }, makeContext(null))).rejects.toMatchObject({
      extensions: { code: 'UNAUTHENTICATED' },
    });
  });

  it('carries lines both ways, oldest first, the venue signing as the venue', async () => {
    const { host, owner, pod } = await seedBooking();

    const first = await send(pod._id, host._id, { text: '  Can we set up at 5?  ' });
    await send(pod._id, owner._id, { text: 'Yes, the patio is yours' });

    const lines = await page(pod._id, host._id);
    expect(lines.map((l) => l.text)).toEqual(['Can we set up at 5?', 'Yes, the patio is yours']);
    expect(lines[0]).toMatchObject({
      id: first.id,
      pod_id: String(pod._id),
      user_id: String(host._id),
      user_name: 'Asha Doe',
      type: 'TEXT',
    });
    expect(lines[1]).toMatchObject({
      user_id: String(owner._id),
      user_name: 'Dek Cafe',
      user_photo: 'https://img.example/dek.jpg',
    });
    // Never written into the pod's group chat, which its guests read.
    expect(await PodMessageModel.countDocuments({ pod_id: String(pod._id) })).toBe(0);
  });

  it('pages back with limit and before', async () => {
    const { host, pod } = await seedBooking();
    const texts = ['one', 'two', 'three'];
    await VenueChatMessageModel.insertMany(
      texts.map((text, i) => ({
        pod_id: String(pod._id),
        venue_id: 'venue',
        user_id: String(host._id),
        side: 'HOST',
        text,
        createdAt: new Date(Date.UTC(2026, 9, 1, 10, i)),
      }))
    );

    const latest = await page(pod._id, host._id, { limit: 2 });
    expect(latest.map((l) => l.text)).toEqual(['two', 'three']);
    const older = await page(pod._id, host._id, { limit: 2, before: latest[0].createdAt });
    expect(older.map((l) => l.text)).toEqual(['one']);
  });

  it('rejects an empty line, a bad photo URL, other message types, an overlong line and blocked content', async () => {
    const { host, pod } = await seedBooking();

    await expect(send(pod._id, host._id, { text: '   ' })).rejects.toMatchObject(BAD_INPUT);
    await expect(send(pod._id, host._id, { type: 'IMAGE', image_url: 'http://img.example/a.jpg' })).rejects.toMatchObject(BAD_INPUT);
    await expect(send(pod._id, host._id, { type: 'IMAGE', image_url: 'not a url' })).rejects.toMatchObject(BAD_INPUT);
    await expect(send(pod._id, host._id, { type: 'STICKER', text: 'x' })).rejects.toMatchObject(BAD_INPUT);
    await expect(send(pod._id, host._id, { text: 'a'.repeat(2001) })).rejects.toMatchObject(BAD_INPUT);
    await expect(send(pod._id, host._id, { text: 'call me on 9876543210' })).rejects.toMatchObject({
      extensions: { reason: 'MODERATION_BLOCKED' },
    });
    expect(await VenueChatMessageModel.countDocuments({ pod_id: String(pod._id) })).toBe(0);
  });

  it('sends a photo line', async () => {
    const { owner, pod } = await seedBooking();

    const line = await send(pod._id, owner._id, { type: 'IMAGE', image_url: 'https://ik.imagekit.io/x/patio.jpg' });

    expect(line).toMatchObject({ type: 'IMAGE', image_url: 'https://ik.imagekit.io/x/patio.jpg', text: '', edited_at: null });
  });

  it("checks a photo's caption as it checks a line's own text", async () => {
    const { host, pod } = await seedBooking();
    const photo = { type: 'IMAGE', image_url: 'https://ik.imagekit.io/x/stage.jpg' };

    await expect(send(pod._id, host._id, { ...photo, text: '  Our stage  ' })).resolves.toMatchObject({ type: 'IMAGE', text: 'Our stage' });
    await expect(send(pod._id, host._id, { ...photo, text: 'call me on 9876543210' })).rejects.toMatchObject({
      extensions: { reason: 'MODERATION_BLOCKED' },
    });
    await expect(send(pod._id, host._id, { ...photo, text: 'a'.repeat(2001) })).rejects.toMatchObject(BAD_INPUT);
    expect(await VenueChatMessageModel.countDocuments({ pod_id: String(pod._id) })).toBe(1);
  });

  it('hides lines from someone the reader has blocked', async () => {
    const { host, owner, pod } = await seedBooking();
    await send(pod._id, owner._id, { text: 'Hello from the venue' });
    await UserBlockModel.create({ blocker_id: host._id, blocked_id: owner._id, blocked_at: new Date() });

    expect(await page(pod._id, host._id)).toEqual([]);
    expect(await page(pod._id, owner._id)).toHaveLength(1);
  });
});
