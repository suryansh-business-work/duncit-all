import { Types } from 'mongoose';
import { PodModel } from '@modules/pods/pod/pod.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { NotificationModel, UserNotificationModel } from '@modules/engagement/notification/notification.model';
import { podChatRoomOf, welcomeToChatRoom, welcomeToPodChat } from '../../chat.welcome';
import { ChatMuteModel } from '../../chatState.model';

let seq = 0;

const seedPod = (extra: Record<string, unknown> = {}) =>
  PodModel.create({
    pod_id: `welcome-pod-${++seq}`,
    pod_title: 'Evening Badminton',
    pod_hosts_id: [new Types.ObjectId()],
    club_id: new Types.ObjectId(),
    pod_description: 'desc',
    pod_date_time: new Date('2026-08-01T18:00:00Z'),
    pod_end_date_time: new Date('2026-08-01T20:00:00Z'),
    pod_type: 'PAID',
    is_active: true,
    ...extra,
  });

const inboxOf = async (userId: string) => {
  const rows = await UserNotificationModel.find({ user_id: userId }).lean();
  return NotificationModel.find({ _id: { $in: rows.map((r) => r.notification_id) } }).lean();
};

describe('welcoming a new member to a chat room', () => {
  it('sends one in-app "you joined" notification that opens the pod chat', async () => {
    const pod = await seedPod();
    const userId = new Types.ObjectId().toString();

    await welcomeToPodChat(userId, pod._id, 'pod-member:m1:1');

    const inbox = await inboxOf(userId);
    expect(inbox).toHaveLength(1);
    expect(inbox[0].title).toBe('You joined the Evening Badminton chat');
    expect(inbox[0].link_url).toBe(`/chats/${String(pod._id)}`);
  });

  it('welcomes once per join event, and again for a new one (a rejoin)', async () => {
    const pod = await seedPod();
    const userId = new Types.ObjectId().toString();
    const room = { kind: 'POD' as const, id: String(pod._id) };

    await welcomeToChatRoom(userId, room, 'payment:p1');
    await welcomeToChatRoom(userId, room, 'payment:p1');
    expect(await inboxOf(userId)).toHaveLength(1);

    await welcomeToChatRoom(userId, room, 'pod-member:m1:2');
    expect(await inboxOf(userId)).toHaveLength(2);
  });

  it('clears a mute left from an earlier membership so new messages alert again', async () => {
    const pod = await seedPod();
    const userId = new Types.ObjectId().toString();
    await ChatMuteModel.create({ user_id: userId, room_kind: 'POD', room_id: String(pod._id), muted_until: null });
    const other = await ChatMuteModel.create({
      user_id: userId,
      room_kind: 'POD',
      room_id: new Types.ObjectId().toString(),
      muted_until: null,
    });

    await welcomeToChatRoom(userId, { kind: 'POD', id: String(pod._id) }, 'pod-member:m2:1');

    expect(await ChatMuteModel.countDocuments({ user_id: userId, room_id: String(pod._id) })).toBe(0);
    // Only this room's mute moves; another room the member muted stays muted.
    expect(await ChatMuteModel.exists({ _id: other._id })).not.toBeNull();
  });

  it("joins a recurring pod's ONE room on its parent when a date is booked", async () => {
    const parent = await seedPod({ series_role: 'PARENT' });
    const date = await seedPod({ series_role: 'DATE', series_parent_id: parent._id });

    expect(await podChatRoomOf(date._id)).toEqual({ kind: 'POD', id: String(parent._id) });
    expect(await podChatRoomOf(parent._id)).toEqual({ kind: 'POD', id: String(parent._id) });
  });

  it('links a club welcome to the club chat, and sends nothing for a club or pod that is gone', async () => {
    const club = await ClubModel.create({
      club_id: `welcome-club-${++seq}`,
      club_name: 'Badminton Club',
      super_category_id: new Types.ObjectId(),
    });
    const userId = new Types.ObjectId().toString();

    await welcomeToChatRoom(userId, { kind: 'CLUB', id: String(club._id) }, 'club-follow:f1');
    await welcomeToChatRoom(userId, { kind: 'CLUB', id: new Types.ObjectId().toString() }, 'club-follow:f2');
    await welcomeToPodChat(userId, new Types.ObjectId(), 'pod-member:gone:1');

    const inbox = await inboxOf(userId);
    expect(inbox).toHaveLength(1);
    expect(inbox[0].title).toBe('You joined the Badminton Club chat');
    expect(inbox[0].link_url).toBe(`/chats/club/${String(club._id)}`);
  });

  it('ignores an invalid user or room id without throwing', async () => {
    await expect(welcomeToChatRoom('not-an-id', { kind: 'POD', id: 'nope' }, 'k')).resolves.toBeUndefined();
    expect(await podChatRoomOf('nope')).toBeNull();
  });
});
