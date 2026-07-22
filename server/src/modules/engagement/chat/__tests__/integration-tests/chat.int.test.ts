import { Types } from 'mongoose';
import { chatService } from '../../chat.service';
import { chatResolvers } from '../../chat.resolver';
import { PodModel } from '@modules/pods/pod/pod.model';
import { ClubModel } from '@modules/pods/club/club.model';
import { UserModel } from '@modules/access/user/user.model';
import { makeContext } from '@test/harness';

let seq = 0;

async function seedUser(first: string) {
  return UserModel.create({
    auth: { email: `chat${++seq}@x.com` },
    profile: { first_name: first, last_name: 'Doe', profile_photo: `${first}.jpg` },
  });
}

async function seedClub(superCategoryId: Types.ObjectId) {
  return ClubModel.create({
    club_id: `club-${++seq}`,
    club_name: 'Badminton Club',
    super_category_id: superCategoryId,
  });
}

async function seedPod(
  club: { _id: Types.ObjectId },
  hostId: Types.ObjectId,
  attendeeId: Types.ObjectId
) {
  return PodModel.create({
    pod_id: `pod-${++seq}`,
    pod_title: 'Evening Badminton',
    pod_hosts_id: [hostId],
    pod_attendees: [attendeeId],
    club_id: club._id,
    pod_description: 'desc',
    pod_date_time: new Date('2026-08-01T18:00:00Z'),
    pod_end_date_time: new Date('2026-08-01T20:00:00Z'),
    pod_type: 'NON_NATIVE_PAID',
    is_active: true,
  });
}

describe('chatService integration', () => {
  it('returns no chat rooms for a user with no pods', async () => {
    expect(await chatService.listMyChatRooms(new Types.ObjectId().toString())).toEqual([]);
  });

  it('joins the club so myChatRooms carries slugs and super-category', async () => {
    const superId = new Types.ObjectId();
    const host = await seedUser('Asha');
    const attendee = await seedUser('Ben');
    const club = await seedClub(superId);
    const pod = await seedPod(club, host._id, attendee._id);

    const rooms = await (chatResolvers.Query as any).myChatRooms(
      {},
      {},
      makeContext({ id: String(host._id) })
    );
    expect(rooms).toHaveLength(1);
    const room = rooms[0];
    expect(room.pod_id).toBe(String(pod._id));
    expect(room.pod_slug).toBe(pod.pod_id);
    expect(room.club_slug).toBe(club.club_id);
    expect(room.club_id).toBe(String(club._id));
    expect(room.super_category_id).toBe(String(superId));
    expect(room.pod_end_date_time).toBe(new Date('2026-08-01T20:00:00Z').toISOString());
    expect(room.pod_attendees).toEqual([String(attendee._id)]);
  });

  it('resolves hosts + participants + count for a member', async () => {
    const host = await seedUser('Asha');
    const attendee = await seedUser('Ben');
    const club = await seedClub(new Types.ObjectId());
    const pod = await seedPod(club, host._id, attendee._id);

    const people = await chatService.chatParticipants(String(pod._id), String(attendee._id));
    expect(people.participant_count).toBe(1);
    expect(people.hosts.map((h) => h.full_name)).toEqual(['Asha Doe']);
    expect(people.hosts[0].profile_photo).toBe('Asha.jpg');
    expect(people.participants.map((p) => p.user_id)).toEqual([String(attendee._id)]);
  });

  it('blocks a non-member from reading the participants', async () => {
    const host = await seedUser('Asha');
    const attendee = await seedUser('Ben');
    const club = await seedClub(new Types.ObjectId());
    const pod = await seedPod(club, host._id, attendee._id);

    await expect(
      chatService.chatParticipants(String(pod._id), new Types.ObjectId().toString())
    ).rejects.toThrow(/not a pod member/i);
  });

  it('throws when the pod behind the chat is missing', async () => {
    await expect(
      chatService.chatParticipants(new Types.ObjectId().toString(), new Types.ObjectId().toString())
    ).rejects.toThrow(/pod not found/i);
  });
});
