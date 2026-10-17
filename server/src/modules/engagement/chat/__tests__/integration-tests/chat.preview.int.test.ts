import { Types } from 'mongoose';
import { chatResolvers } from '../../chat.resolver';
import { PodMessageModel } from '../../chat.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { UserModel } from '@modules/access/user/user.model';
import { UserBlockModel } from '@modules/access/block/userBlock.model';
import { ClubFollowerModel } from '@modules/access/user/relations/clubFollower.model';
import { makeContext } from '@test/harness';

let seq = 0;
const DAY = 86_400_000;

async function seedUser(first: string) {
  return UserModel.create({
    auth: { email: `preview${++seq}@x.com` },
    profile: { first_name: first, last_name: 'Doe', profile_photo: `${first}.jpg` },
  });
}

async function seedClub(isActive = true) {
  return ClubModel.create({
    club_id: `preview-club-${++seq}`,
    club_name: 'Badminton Club',
    super_category_id: new Types.ObjectId(),
    is_active: isActive,
  });
}

/** A pod hosted by `hostId` with `attendeeId` booked, `offsetMs` from now. */
async function seedPod(clubId: Types.ObjectId, hostId: Types.ObjectId, attendeeId: Types.ObjectId, offsetMs: number) {
  const start = new Date(Date.now() + offsetMs);
  return PodModel.create({
    pod_id: `preview-pod-${++seq}`,
    pod_title: 'Evening Badminton',
    pod_hosts_id: [hostId],
    pod_attendees: [attendeeId],
    club_id: clubId,
    pod_description: 'desc',
    pod_date_time: start,
    pod_end_date_time: new Date(start.getTime() + 2 * 3_600_000),
    pod_type: 'PAID',
    is_active: true,
  });
}

/** Messages a minute apart, oldest first, so their order is certain. */
async function say(room: { pod_id?: string; club_id?: string }, userId: Types.ObjectId, texts: string[], extra = {}) {
  const base = Date.now() - DAY;
  for (const [i, text] of texts.entries()) {
    const at = new Date(base + (++seq + i) * 60_000);
    // timestamps off, so the times set here — not the insert time — order the room.
    await new PodMessageModel({
      ...room,
      user_id: String(userId),
      type: 'TEXT',
      text,
      createdAt: at,
      updatedAt: at,
      ...extra,
    }).save({ timestamps: false });
  }
}

const preview = (args: Record<string, unknown>, viewerId: string | null) =>
  (chatResolvers.Query as any).chatPreview({}, args, makeContext(viewerId ? { id: viewerId } : null));

describe('chatPreview', () => {
  it('shows a viewer without a booking the whole history, read-only', async () => {
    const host = await seedUser('Asha');
    const attendee = await seedUser('Ben');
    const stranger = await seedUser('Cara');
    const club = await seedClub();
    const pod = await seedPod(club._id, host._id, attendee._id, DAY);
    await say({ pod_id: String(pod._id) }, host._id, ['Court no. 8', 'Bring water']);
    await say({ pod_id: String(pod._id) }, attendee._id, ['Any spot left?']);

    const result = await preview({ pod_id: String(pod._id) }, String(stranger._id));

    expect(result.messages.map((m: any) => m.text)).toEqual(['Court no. 8', 'Bring water', 'Any spot left?']);
    expect(result.messages[0].user_name).toBe('Asha Doe');
    expect(result.total_count).toBe(3);
    expect(result.is_member).toBe(false);
    expect(result.closed).toBe(false);
  });

  it('marks the host and an attendee as members who may open the room', async () => {
    const host = await seedUser('Asha');
    const attendee = await seedUser('Ben');
    const pod = await seedPod((await seedClub())._id, host._id, attendee._id, DAY);

    expect((await preview({ pod_id: String(pod._id) }, String(host._id))).is_member).toBe(true);
    expect((await preview({ pod_id: String(pod._id) }, String(attendee._id))).is_member).toBe(true);
  });

  it('leaves out removed messages and anyone the viewer has blocked, in the page and the count', async () => {
    const host = await seedUser('Asha');
    const attendee = await seedUser('Ben');
    const viewer = await seedUser('Cara');
    const pod = await seedPod((await seedClub())._id, host._id, attendee._id, DAY);
    const room = { pod_id: String(pod._id) };
    await say(room, host._id, ['Welcome']);
    await say(room, host._id, ['Removed line'], { deleted: true });
    await say(room, attendee._id, ['From a blocked person']);
    await UserBlockModel.create({
      blocker_id: viewer._id,
      blocked_id: attendee._id,
      blocked_at: new Date(),
      unblocked_at: null,
    });

    const result = await preview(room, String(viewer._id));

    expect(result.messages.map((m: any) => m.text)).toEqual(['Welcome']);
    expect(result.total_count).toBe(1);
  });

  it('pages back through older history with limit and before, counting everything', async () => {
    const host = await seedUser('Asha');
    const pod = await seedPod((await seedClub())._id, host._id, new Types.ObjectId(), DAY);
    const room = { pod_id: String(pod._id) };
    await say(room, host._id, ['one', 'two', 'three', 'four', 'five']);

    const latest = await preview({ ...room, limit: 2 }, String(host._id));
    expect(latest.messages.map((m: any) => m.text)).toEqual(['four', 'five']);
    expect(latest.total_count).toBe(5);

    const earlier = await preview({ ...room, limit: 2, before: latest.messages[0].createdAt }, String(host._id));
    expect(earlier.messages.map((m: any) => m.text)).toEqual(['two', 'three']);
  });

  it('reports an ended pod’s room as closed', async () => {
    const host = await seedUser('Asha');
    const pod = await seedPod((await seedClub())._id, host._id, new Types.ObjectId(), -3 * DAY);
    expect((await preview({ pod_id: String(pod._id) }, String(host._id))).closed).toBe(true);
  });

  it('shows a club’s history to anyone, with followers as members and the room never closed', async () => {
    const admin = await seedUser('Asha');
    const follower = await seedUser('Ben');
    const visitor = await seedUser('Cara');
    const club = await seedClub();
    await ClubFollowerModel.create({ club_id: club._id, user_id: follower._id });
    await say({ club_id: String(club._id) }, admin._id, ['Season starts Sunday']);

    const asVisitor = await preview({ club_id: String(club._id) }, String(visitor._id));
    expect(asVisitor.messages.map((m: any) => m.text)).toEqual(['Season starts Sunday']);
    expect(asVisitor.is_member).toBe(false);
    expect(asVisitor.closed).toBe(false);
    expect((await preview({ club_id: String(club._id) }, String(follower._id))).is_member).toBe(true);
  });

  it('refuses a pod or club that does not exist, a malformed id and an inactive club', async () => {
    const viewer = String((await seedUser('Cara'))._id);
    const inactive = await seedClub(false);
    await expect(preview({ pod_id: new Types.ObjectId().toString() }, viewer)).rejects.toThrow('Pod not found');
    await expect(preview({ pod_id: 'not-an-id' }, viewer)).rejects.toThrow('Pod not found');
    await expect(preview({ club_id: String(inactive._id) }, viewer)).rejects.toThrow('Club not found');
  });

  it('asks for exactly one room, and for a signed-in viewer', async () => {
    const viewer = String((await seedUser('Cara'))._id);
    const id = new Types.ObjectId().toString();
    await expect(preview({}, viewer)).rejects.toThrow('Pass exactly one of pod_id or club_id');
    await expect(preview({ pod_id: id, club_id: id }, viewer)).rejects.toThrow('Pass exactly one of pod_id or club_id');
    await expect(preview({ pod_id: id }, null)).rejects.toThrow('Authentication required');
  });
});
